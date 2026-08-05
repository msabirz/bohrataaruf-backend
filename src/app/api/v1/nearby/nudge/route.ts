import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nearbySessions, nudges, profiles } from '@/lib/db/schema';
import { and, eq, or, sql } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { NearbyNudgeSchema } from '@/lib/api/validators';
import { hasInterestedInteractionSql } from '@/lib/db/queries';
import { sendPushNotification } from '@/lib/pushNotifications';

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = NearbyNudgeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }
    const { toUserId } = parsed.data;

    if (toUserId === userId) {
      return NextResponse.json({ error: 'Cannot nudge yourself' }, { status: 400 });
    }

    const targetSession = await db
      .select()
      .from(nearbySessions)
      .where(eq(nearbySessions.userId, toUserId))
      .limit(1)
      .then((res) => res[0]);

    if (!targetSession || !targetSession.isVisible || targetSession.expiresAt <= new Date()) {
      return NextResponse.json({ error: 'This person is not currently visible nearby' }, { status: 400 });
    }

    const alreadyInterestedResult: any = await db.execute(
      sql`SELECT ${hasInterestedInteractionSql(userId, toUserId)} as exists`
    );
    const alreadyInterestedRows = Array.isArray(alreadyInterestedResult) ? alreadyInterestedResult : alreadyInterestedResult.rows || [];
    if (alreadyInterestedRows[0]?.exists) {
      return NextResponse.json({ error: 'You already have an interest interaction with this person' }, { status: 400 });
    }

    // At most one thread per unordered pair (DB-enforced via the
    // LEAST/GREATEST unique index) — if either side already nudged the
    // other, reuse that existing thread instead of trying (and failing)
    // to insert a reversed duplicate. An active thread is returned as-is;
    // an expired/declined one is reactivated under the new caller's
    // direction, matching a fresh nudge attempt.
    const existing = await db
      .select()
      .from(nudges)
      .where(or(and(eq(nudges.fromUserId, userId), eq(nudges.toUserId, toUserId)), and(eq(nudges.fromUserId, toUserId), eq(nudges.toUserId, userId))))
      .limit(1)
      .then((res) => res[0]);

    let nudge;
    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json({ nudge: existing });
      }
      [nudge] = await db
        .update(nudges)
        .set({
          fromUserId: userId,
          toUserId,
          status: 'active',
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
          endedBy: null,
          lastReadByFrom: null,
          lastReadByTo: null,
          handoffRequestedBy: [],
        })
        .where(eq(nudges.id, existing.id))
        .returning();
    } else {
      [nudge] = await db
        .insert(nudges)
        .values({
          fromUserId: userId,
          toUserId,
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        })
        .returning();
    }

    const myProfile = await db.select({ alias: profiles.alias }).from(profiles).where(eq(profiles.userId, userId)).limit(1).then((res) => res[0]);

    sendPushNotification(
      toUserId,
      'nudges',
      'Someone nearby wants to connect',
      `${myProfile?.alias ?? 'Someone'} sent you a nudge at the gathering`,
      { type: 'nudge', nudgeId: nudge.id }
    ).catch((e) => console.warn('[push] nudge notify failed:', e));

    return NextResponse.json({ nudge });
  } catch (error) {
    console.error('Create nudge error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
