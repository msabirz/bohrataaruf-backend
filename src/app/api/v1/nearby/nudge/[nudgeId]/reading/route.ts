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

    const nudge = await db
      .select({ fromUserId: nudges.fromUserId, toUserId: nudges.toUserId })
      .from(nudges)
      .where(and(eq(nudges.id, nudgeId), or(eq(nudges.fromUserId, userId), eq(nudges.toUserId, userId))))
      .limit(1)
      .then((res) => res[0]);

    if (!nudge) {
      return NextResponse.json({ error: 'Nudge not found' }, { status: 404 });
    }

    const isFrom = nudge.fromUserId === userId;
    await db
      .update(nudges)
      .set(isFrom ? { lastReadByFrom: new Date() } : { lastReadByTo: new Date() })
      .where(eq(nudges.id, nudgeId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Nudge reading heartbeat error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
