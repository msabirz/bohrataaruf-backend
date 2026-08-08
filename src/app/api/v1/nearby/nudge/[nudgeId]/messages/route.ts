import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nudges, nudgeMessages, profiles } from '@/lib/db/schema';
import { and, asc, eq, isNull, or } from 'drizzle-orm';
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
      .select()
      .from(nudges)
      .where(and(eq(nudges.id, nudgeId), or(eq(nudges.fromUserId, userId), eq(nudges.toUserId, userId))))
      .limit(1)
      .then((res) => res[0]);

    if (!nudge) {
      return NextResponse.json({ error: 'Nudge not found' }, { status: 404 });
    }

    // "Seen" reuses the existing thread-level reading heartbeat rather than
    // per-message read tracking — a message is seen once the OTHER
    // participant's last-read marker passes that message's createdAt.
    const isFrom = nudge.fromUserId === userId;
    const otherLastRead = isFrom ? nudge.lastReadByTo : nudge.lastReadByFrom;

    const rows = await db
      .select({
        id: nudgeMessages.id,
        fromUserId: nudgeMessages.fromUserId,
        message: nudgeMessages.message,
        messageType: nudgeMessages.messageType,
        contactMethod: nudgeMessages.contactMethod,
        latitude: nudgeMessages.latitude,
        longitude: nudgeMessages.longitude,
        createdAt: nudgeMessages.createdAt,
        fromAlias: profiles.alias,
      })
      .from(nudgeMessages)
      .innerJoin(profiles, eq(profiles.userId, nudgeMessages.fromUserId))
      .where(and(eq(nudgeMessages.nudgeId, nudgeId), isNull(nudgeMessages.deletedAt)))
      .orderBy(asc(nudgeMessages.createdAt));

    const messages = rows.map((r) => {
      const isMine = r.fromUserId === userId;
      return {
        id: r.id,
        fromAlias: r.fromAlias,
        message: r.message,
        messageType: r.messageType,
        contactMethod: r.contactMethod,
        latitude: r.latitude,
        longitude: r.longitude,
        createdAt: r.createdAt,
        isMine,
        // Only meaningful for the sender's own messages — the recipient
        // doesn't need to know their own "seen" status of what they sent.
        seen: isMine ? (otherLastRead != null && new Date(otherLastRead) >= new Date(r.createdAt!)) : null,
      };
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Get nudge messages error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
