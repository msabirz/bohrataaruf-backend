import { NextResponse } from 'next/server';
import { db, executeQuery } from '@/lib/db';
import { matches } from '@/lib/db/schema';
import { sql, eq } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { TargetIdSchema } from '@/lib/api/validators';
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

    // Delete my 'declined' row to clear the block
    const deleteQuery = sql`
      DELETE FROM interactions
      WHERE user_id = ${userId} AND target_id = ${targetId} AND action = 'declined'
    `;
    await executeQuery(deleteQuery);

    // Re-use the EXACT SAME atomic CTE logic as markInterested,
    // restructured to return match_id so we can detect mutual match.
    const query = sql`
      WITH new_interaction AS (
        INSERT INTO interactions (user_id, target_id, action)
        VALUES (${userId}, ${targetId}, 'interested')
        ON CONFLICT (user_id, target_id) DO UPDATE SET action = 'interested'
        RETURNING user_id, target_id
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
      SELECT (SELECT id FROM new_match) AS match_id;
    `;
    
    const result = await executeQuery(query);
    const row = result[0] as { match_id: string | null } | undefined;

    const mutualMatch = !!(row?.match_id);

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
    }
    // No received_interests notification on reinitiate — this isn't a surprise to the target.

    return NextResponse.json({ success: true, mutualMatch });
  } catch (error) {
    console.error('Reinitiate interest error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
