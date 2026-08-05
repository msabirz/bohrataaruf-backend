import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nudges, nudgeMessages, profiles } from '@/lib/db/schema';
import { and, eq, or } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { NearbyNudgeMessageSchema } from '@/lib/api/validators';
import { sendPushNotification } from '@/lib/pushNotifications';

const READ_SUPPRESSION_MS = 45 * 1000;

export async function POST(request: Request, { params }: { params: Promise<{ nudgeId: string }> }) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { nudgeId } = await params;

    const body = await request.json();
    const parsed = NearbyNudgeMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }
    const { message } = parsed.data;

    const nudge = await db
      .select()
      .from(nudges)
      .where(and(eq(nudges.id, nudgeId), or(eq(nudges.fromUserId, userId), eq(nudges.toUserId, userId))))
      .limit(1)
      .then((res) => res[0]);

    if (!nudge) {
      return NextResponse.json({ error: 'Nudge not found' }, { status: 404 });
    }
    if (nudge.status !== 'active' || nudge.expiresAt <= new Date()) {
      return NextResponse.json({ error: 'This nudge has ended' }, { status: 400 });
    }

    const [saved] = await db
      .insert(nudgeMessages)
      .values({ nudgeId, fromUserId: userId, message })
      .returning();

    const isFrom = nudge.fromUserId === userId;
    const recipientId = isFrom ? nudge.toUserId : nudge.fromUserId;
    const recipientLastRead = isFrom ? nudge.lastReadByTo : nudge.lastReadByFrom;

    const recentlyRead = recipientLastRead != null && Date.now() - new Date(recipientLastRead).getTime() < READ_SUPPRESSION_MS;

    if (!recentlyRead) {
      const senderProfile = await db.select({ alias: profiles.alias }).from(profiles).where(eq(profiles.userId, userId)).limit(1).then((res) => res[0]);
      sendPushNotification(
        recipientId,
        'nudges',
        'New message at the gathering',
        `${senderProfile?.alias ?? 'Someone'} sent you a message`,
        { type: 'nudge_message', nudgeId }
      ).catch((e) => console.warn('[push] nudge message notify failed:', e));
    }

    return NextResponse.json({ message: saved });
  } catch (error) {
    console.error('Send nudge message error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
