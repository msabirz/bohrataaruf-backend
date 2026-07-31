import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';

// Cache for 1 hour (3600 seconds) to prevent DB spam on marketing page loads — same
// pattern as member-distribution.
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
    // Round DOWN to the nearest 100 — never overstate. Only the rounded value is ever
    // returned; the real precise count never leaves the server.
    const roundedCount = Math.floor(rawCount / 100) * 100;

    return NextResponse.json({ roundedCount });
  } catch (error) {
    console.error('Registered count error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
