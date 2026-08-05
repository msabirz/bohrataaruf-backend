import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nudges } from '@/lib/db/schema';
import { and, eq, or, sql } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { sendPushNotification } from '@/lib/pushNotifications';

// "Reuse existing handoff flow" means reusing the same matches-table
// mechanism POST /interactions/interested already uses to create a match
// (same LEAST/GREATEST-ordered insert, same ON CONFLICT DO NOTHING) —
// not calling POST /handoff itself, which is a later, per-platform
// handle-sharing step that only makes sense once a match already exists.
// Creating the match here is what unlocks that existing screen/endpoint
// for both users, so nothing about real-name/handle reveal is
// reimplemented specially for nudges.
export async function POST(request: Request, { params }: { params: Promise<{ nudgeId: string }> }) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { nudgeId } = await params;

    const nudge = await db
      .select()
      .from(nudges)
      .where(and(eq(nudges.id, nudgeId), or(eq(nudges.fromUserId, userId), eq(nudges.toUserId, userId))))
      .limit(1)
      .then((res) => res[0]);

    if (!nudge) {
      return NextResponse.json({ error: 'Nudge not found' }, { status: 404 });
    }

    const otherUserId = nudge.fromUserId === userId ? nudge.toUserId : nudge.fromUserId;
    const requestedBy = new Set(nudge.handoffRequestedBy ?? []);
    requestedBy.add(userId);

    const [updated] = await db
      .update(nudges)
      .set({ handoffRequestedBy: Array.from(requestedBy) })
      .where(eq(nudges.id, nudgeId))
      .returning();

    if (!requestedBy.has(otherUserId)) {
      return NextResponse.json({ matched: false, waiting: true });
    }

    const matchResult: any = await db.execute(sql`
      INSERT INTO matches (user_a, user_b)
      VALUES (LEAST(${userId}::uuid, ${otherUserId}::uuid), GREATEST(${userId}::uuid, ${otherUserId}::uuid))
      ON CONFLICT (user_a, user_b) DO NOTHING
      RETURNING id
    `);
    const matchRows = Array.isArray(matchResult) ? matchResult : matchResult.rows || [];
    let matchId = matchRows[0]?.id;

    if (!matchId) {
      // Already matched some other way (e.g. the normal Interested flow) —
      // look up the existing match instead of treating this as a failure.
      const existing: any = await db.execute(sql`
        SELECT id FROM matches
        WHERE user_a = LEAST(${userId}::uuid, ${otherUserId}::uuid) AND user_b = GREATEST(${userId}::uuid, ${otherUserId}::uuid)
        LIMIT 1
      `);
      const existingRows = Array.isArray(existing) ? existing : existing.rows || [];
      matchId = existingRows[0]?.id;
    }

    sendPushNotification(
      otherUserId,
      'nudges',
      "You can now connect!",
      "You've both requested to connect. Check your matches to continue.",
      { type: 'nudge_handoff', nudgeId, matchId }
    ).catch((e) => console.warn('[push] nudge handoff notify failed:', e));

    return NextResponse.json({ matched: true, handoffData: { matchId }, nudge: updated });
  } catch (error) {
    console.error('Nudge handoff error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
