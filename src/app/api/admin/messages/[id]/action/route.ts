import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contactMessages, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAdminSession } from '@/lib/adminAuth';
import { sendPushNotification } from '@/lib/pushNotifications';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === 'mark_read') {
      await db.update(contactMessages)
        .set({ isRead: true })
        .where(eq(contactMessages.id, id));
      return NextResponse.json({ success: true, isRead: true });
    }

    if (action === 'update_status') {
      const { status } = body;
      if (!['new', 'in_progress', 'resolved', 'closed'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }

      await db.update(contactMessages)
        .set({ 
          status: status as any, 
          handledBy: session.volunteerId 
        })
        .where(eq(contactMessages.id, id));
      
      return NextResponse.json({ success: true, status, handledBy: session.volunteerId });
    }

    if (action === 'reply') {
      const { replyText } = body;
      if (!replyText || typeof replyText !== 'string' || replyText.trim().length === 0) {
        return NextResponse.json({ error: 'Reply text is required' }, { status: 400 });
      }

      const now = new Date();
      await db.update(contactMessages)
        .set({
          adminReplyText: replyText.trim(),
          repliedAt: now,
          status: 'resolved' as any,
          isRead: true,
          handledBy: session.volunteerId,
        })
        .where(eq(contactMessages.id, id));

      // Fetch ticket to get userId and subject for push notification
      const ticket = await db.select({
        userId: contactMessages.userId,
        subject: contactMessages.subject,
      })
        .from(contactMessages)
        .where(eq(contactMessages.id, id))
        .limit(1)
        .then(r => r[0]);

      if (ticket?.userId) {
        sendPushNotification(
          ticket.userId,
          'support_alerts',
          'Support replied to your ticket',
          `Your inquiry "${ticket.subject}" has been answered. Tap to view the reply.`,
          { screen: 'contact', ticketId: id },
        ).catch(e => console.warn('[push] Support reply notification failed:', e));
      }

      return NextResponse.json({ success: true, status: 'resolved', repliedAt: now.toISOString() });
    }

    if (action === 'close') {
      await db.update(contactMessages)
        .set({
          status: 'closed' as any,
          isRead: true,
          handledBy: session.volunteerId,
        })
        .where(eq(contactMessages.id, id));

      return NextResponse.json({ success: true, status: 'closed' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Admin Message Action API]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
