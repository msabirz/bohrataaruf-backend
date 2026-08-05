import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nudges } from '@/lib/db/schema';
import { and, eq, or } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';

export async function POST(request: Request, { params }: { params: Promise<{ nudgeId: string }> }) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { nudgeId } = await params;

    const [updated] = await db
      .update(nudges)
      .set({ status: 'expired', endedBy: userId })
      .where(and(eq(nudges.id, nudgeId), or(eq(nudges.fromUserId, userId), eq(nudges.toUserId, userId))))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Nudge not found' }, { status: 404 });
    }

    return NextResponse.json({ nudge: updated });
  } catch (error) {
    console.error('End nudge error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
