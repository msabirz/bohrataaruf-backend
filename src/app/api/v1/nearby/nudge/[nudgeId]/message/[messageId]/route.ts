import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nudges, nudgeMessages } from '@/lib/db/schema';
import { and, eq, or } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';

// Soft-delete only, and only while unseen — "delete before seen" for a
// contact_share message the caller sent themselves. Once the recipient's
// reading heartbeat has passed the message's createdAt, it's permanent.
export async function DELETE(request: Request, { params }: { params: Promise<{ nudgeId: string; messageId: string }> }) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { nudgeId, messageId } = await params;

    const nudge = await db
      .select()
      .from(nudges)
      .where(and(eq(nudges.id, nudgeId), or(eq(nudges.fromUserId, userId), eq(nudges.toUserId, userId))))
      .limit(1)
      .then((res) => res[0]);

    if (!nudge) {
      return NextResponse.json({ error: 'Nudge not found' }, { status: 404 });
    }

    const message = await db
      .select()
      .from(nudgeMessages)
      .where(and(eq(nudgeMessages.id, messageId), eq(nudgeMessages.nudgeId, nudgeId)))
      .limit(1)
      .then((res) => res[0]);

    if (!message || message.deletedAt) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    if (message.fromUserId !== userId) {
      return NextResponse.json({ error: 'You can only delete your own messages' }, { status: 403 });
    }
    if (message.messageType !== 'contact_share') {
      return NextResponse.json({ error: 'Only shared contact details can be deleted' }, { status: 400 });
    }

    const isFrom = nudge.fromUserId === userId;
    const otherLastRead = isFrom ? nudge.lastReadByTo : nudge.lastReadByFrom;
    const alreadySeen = otherLastRead != null && new Date(otherLastRead) >= new Date(message.createdAt!);
    if (alreadySeen) {
      return NextResponse.json({ error: 'This has already been viewed and can no longer be deleted' }, { status: 400 });
    }

    await db.update(nudgeMessages).set({ deletedAt: new Date() }).where(eq(nudgeMessages.id, messageId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete nudge message error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
