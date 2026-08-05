import { NextResponse } from 'next/server';
import { db, executeQuery } from '@/lib/db';
import { matches } from '@/lib/db/schema';
import { sql, eq } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { TargetIdSchema } from '@/lib/api/validators';
import { requireVerifiedOrMatched } from '@/lib/api/verificationGate';
import { keysToCamelCase } from '@/lib/api/serialize';
import { getViewUrl } from '@/lib/storage';
import { sendPushNotification } from '@/lib/pushNotifications';

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = TargetIdSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const { profileId: targetId } = parsed.data;

    const gate = await requireVerifiedOrMatched(userId, targetId);
    if (gate.blocked) {
      return NextResponse.json(gate.body, { status: gate.status });
    }

    // Abuse Prevention Check
    const withdrawalLogQuery = sql`
      SELECT withdrawn_count, last_withdrawn_at FROM withdrawal_log
      WHERE user_id = ${userId} AND target_id = ${targetId}
    `;
    const logResult = await executeQuery(withdrawalLogQuery);
    const logRow = logResult[0] as { withdrawn_count: number, last_withdrawn_at: string } | undefined;
    
    if (logRow && logRow.withdrawn_count >= 3) {
      const lastWithdrawn = new Date(logRow.last_withdrawn_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      if (lastWithdrawn > sevenDaysAgo) {
        return NextResponse.json(
          { error: 'You have already expressed interest in this person recently. Please check back later.', code: 'COOLDOWN_ACTIVE' },
          { status: 403 }
        );
      }
    }

    // Atomic CTE that:
    // 1. Upserts the interest row, using xmax=0 to detect if it was a genuine INSERT vs DO UPDATE
    // 2. Creates a match if reciprocal interest exists
    // 3. Returns both: match_id (null if no match) and was_inserted (true if brand-new interest)
    const query = sql`
      WITH new_interaction AS (
        INSERT INTO interactions (user_id, target_id, action)
        VALUES (${userId}, ${targetId}, 'interested')
        ON CONFLICT (user_id, target_id) DO UPDATE SET action = 'interested'
        RETURNING user_id, target_id, (xmax = 0) AS was_inserted
      ),
      reciprocal AS (
        SELECT 1 FROM interactions
        WHERE user_id = ${targetId} AND target_id = ${userId} AND action = 'interested'
      ),
      new_match AS (
        INSERT INTO matches (user_a, user_b)
        SELECT LEAST(${userId}, ${targetId}::uuid), GREATEST(${userId}, ${targetId}::uuid)
        WHERE EXISTS (SELECT 1 FROM reciprocal)
        ON CONFLICT (user_a, user_b) DO NOTHING
        RETURNING id
      )
      SELECT
        (SELECT id FROM new_match) AS match_id,
        (SELECT was_inserted FROM new_interaction) AS was_inserted;
    `;
    
    const result = await executeQuery(query);
    const row = result[0] as { match_id: string | null; was_inserted: boolean } | undefined;

    const mutualMatch = !!(row?.match_id);
    const wasInserted = !!(row?.was_inserted);

    if (mutualMatch && row?.match_id) {
      // TODO (Pre-Launch): Replace this mock string with the real bio_chunks templating generator logic.
      const opener = `Hey! I noticed you also value family and we both live nearby.`;
      await db.update(matches)
        .set({ suggestedOpener: opener })
        .where(eq(matches.id, row.match_id));

      // Notify BOTH users of the mutual match (fire-and-forget)
      sendPushNotification(
        userId, 'matches',
        "You have a new match!",
        "Someone you're interested in is interested in you too. Open the app to see who.",
        { matchId: row.match_id }
      ).catch(e => console.warn('[push] match notify failed (actor):', e));

      sendPushNotification(
        targetId, 'matches',
        "You have a new match!",
        "Someone you're interested in is interested in you too. Open the app to see who.",
        { matchId: row.match_id }
      ).catch(e => console.warn('[push] match notify failed (target):', e));

    } else if (wasInserted) {
      // Genuinely new one-sided interest — notify the TARGET only
      // (wasInserted guards against re-notifying on duplicate taps or upserts)
      sendPushNotification(
        targetId, 'received_interests',
        "Someone's interested in you",
        "Check your Received tab to see their profile.",
        { profileId: userId }
      ).catch(e => console.warn('[push] received_interests notify failed:', e));
    }

    return NextResponse.json({ success: true, mutualMatch });
  } catch (error) {
    console.error('Mark interested error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Retrieve the waiting list: people the user marked 'interested' in the last 14 days,
    // where no match has been formed yet.
    const query = sql`
      SELECT 
        u.id, u.city, u.date_of_birth as "dob",
        p.alias, p.photo_key as "photoUri", p.photo_key_blurred as "photoUriBlurred", p.profession,
        i.created_at as "interestedAt"
      FROM interactions i
      JOIN users u ON i.target_id = u.id
      JOIN profiles p ON u.id = p.user_id
      WHERE i.user_id = ${userId}
        AND i.action = 'interested'
        AND i.created_at > now() - interval '14 days'
        AND NOT EXISTS (
          SELECT 1 FROM matches m 
          WHERE (m.user_a = ${userId} AND m.user_b = u.id) 
             OR (m.user_a = u.id AND m.user_b = ${userId})
        )
      ORDER BY i.created_at DESC
    `;
    
    const results = await executeQuery(query);

    const profilesList = await Promise.all(results.map(async (row: any) => {
      const age = Math.abs(new Date(Date.now() - new Date(row.dob).getTime()).getUTCFullYear() - 1970);
      return keysToCamelCase({
        profileId: row.id,
        alias: row.alias,
        age,
        city: row.city,
        profession: row.profession,
        // Pre-generated blurred derivative only — the real photo never appears in a
        // browsing/pre-match context. Only POST /api/v1/matching/photo-view legitimately
        // reveals the real one, gated by the 3-view cap.
        photoUri: await getViewUrl(row.photoUriBlurred),
        interestedAt: row.interestedAt,
      });
    }));

    console.log('\n--- [getInterestedProfiles] DIAGNOSTICS ---');
    console.log(`Sending ${profilesList.length} profiles to the frontend:`);
    console.log(JSON.stringify(profilesList, null, 2));
    console.log('-------------------------------------------\n');

    return NextResponse.json({ profiles: profilesList });
  } catch (error) {
    console.error('Get interested profiles error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
