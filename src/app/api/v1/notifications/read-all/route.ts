import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notificationsLog } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';

export async function PATCH(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await db
      .update(notificationsLog)
      .set({ isRead: true })
      .where(and(eq(notificationsLog.userId, userId), eq(notificationsLog.isRead, false)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Notification Read All PATCH]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
