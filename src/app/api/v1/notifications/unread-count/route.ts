import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notificationsLog } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notificationsLog)
      .where(and(eq(notificationsLog.userId, userId), eq(notificationsLog.isRead, false)));

    const count = Number(result[0]?.count ?? 0);
    return NextResponse.json({ count });
  } catch (error) {
    console.error('[Notifications Count GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
