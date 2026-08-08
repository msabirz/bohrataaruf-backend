import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nudges } from '@/lib/db/schema';
import { and, eq, or } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';

export async function GET(request: Request, { params }: { params: Promise<{ nudgeId: string }> }) {
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

    return NextResponse.json({
      nudge: {
        ...nudge,
        // Convenience boolean so the client never needs to know its own
        // userId to interpret handoffRequestedBy — used to correctly
        // restore "Waiting for them to confirm" on reopening a chat.
        myHandoffRequested: (nudge.handoffRequestedBy ?? []).includes(userId),
        // Same reasoning — the client needs "the other participant's id"
        // (for the info/flag icons) without knowing its own userId.
        otherUserId: nudge.fromUserId === userId ? nudge.toUserId : nudge.fromUserId,
      },
    });
  } catch (error) {
    console.error('Get nudge detail error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
