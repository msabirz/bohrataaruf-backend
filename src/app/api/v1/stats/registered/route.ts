import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';

// Cache for 1 hour — same pattern as /api/marketing/registered-count.
export const revalidate = 3600;

export async function GET() {
  try {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(
        and(
          eq(users.isActive, true),
          eq(users.isTestAccount, false),
          isNull(users.abandonedAt)
        )
      );

    const rawCount = Number(result[0]?.count ?? 0);
    // Round DOWN to the nearest 10 — only the rounded value ever leaves the server.
    const count = Math.floor(rawCount / 10) * 10;

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Registered stats error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
