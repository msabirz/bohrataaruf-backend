import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notificationsLog } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const [updated] = await db
      .update(notificationsLog)
      .set({ isRead: true })
      .where(and(eq(notificationsLog.id, id), eq(notificationsLog.userId, userId)))
      .returning({ id: notificationsLog.id });

    if (!updated) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, notificationId: updated.id });
  } catch (error) {
    console.error('[Notification Read PATCH]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
