import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notificationsLog } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { checkAndNotifyExpiringNudges } from '@/lib/nudgeExpiryCheck';

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fire-and-forget — opportunistic day-28/29 retention warning check,
    // not on the response's critical path.
    checkAndNotifyExpiringNudges(userId).catch((e) => console.warn('[nudge-expiry] check failed:', e));

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);

    const notifications = await db
      .select({
        id: notificationsLog.id,
        type: notificationsLog.type,
        title: notificationsLog.title,
        body: notificationsLog.body,
        relatedId: notificationsLog.relatedId,
        isRead: notificationsLog.isRead,
        createdAt: notificationsLog.createdAt,
      })
      .from(notificationsLog)
      .where(eq(notificationsLog.userId, userId))
      .orderBy(desc(notificationsLog.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('[Notifications GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
