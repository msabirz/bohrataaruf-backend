import { NextResponse } from 'next/server';
import { db, executeQuery } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: matchId } = await params;

    // Must ensure the requester is part of this match
    const query = sql`
      SELECT suggested_opener as "suggestedOpener"
      FROM matches m
      WHERE m.id = ${matchId} AND (m.user_a = ${userId} OR m.user_b = ${userId})
      LIMIT 1
    `;
    
    const row = await executeQuery(query).then(res => res[0] as any);

    if (!row) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    return NextResponse.json({ text: row.suggestedOpener || '' });
  } catch (error) {
    console.error('Get opener error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
