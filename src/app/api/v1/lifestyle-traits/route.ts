import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lifestyleTraitPairs } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const pairs = await db.select().from(lifestyleTraitPairs)
      .where(eq(lifestyleTraitPairs.active, true))
      .orderBy(asc(lifestyleTraitPairs.sortOrder));

    return NextResponse.json({ pairs });
  } catch (error) {
    console.error('Get lifestyle traits error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
