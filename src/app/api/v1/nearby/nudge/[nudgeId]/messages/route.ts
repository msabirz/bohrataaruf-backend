import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nudges, nudgeMessages, profiles } from '@/lib/db/schema';
import { and, asc, eq, or } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';

export async function GET(request: Request, { params }: { params: Promise<{ nudgeId: string }> }) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { nudgeId } = await params;

    // Participant check only — deliberately NOT gated on status/expiry.
    // History is preserved permanently; only the ability to send new
    // messages (POST .../message) is blocked once a nudge ends.
    const nudge = await db
      .select({ id: nudges.id })
      .from(nudges)
      .where(and(eq(nudges.id, nudgeId), or(eq(nudges.fromUserId, userId), eq(nudges.toUserId, userId))))
      .limit(1)
      .then((res) => res[0]);

    if (!nudge) {
      return NextResponse.json({ error: 'Nudge not found' }, { status: 404 });
    }

    const rows = await db
      .select({
        id: nudgeMessages.id,
        fromUserId: nudgeMessages.fromUserId,
        message: nudgeMessages.message,
        createdAt: nudgeMessages.createdAt,
        fromAlias: profiles.alias,
      })
      .from(nudgeMessages)
      .innerJoin(profiles, eq(profiles.userId, nudgeMessages.fromUserId))
      .where(eq(nudgeMessages.nudgeId, nudgeId))
      .orderBy(asc(nudgeMessages.createdAt));

    const messages = rows.map((r) => ({
      id: r.id,
      fromAlias: r.fromAlias,
      message: r.message,
      createdAt: r.createdAt,
      isMine: r.fromUserId === userId,
    }));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Get nudge messages error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
