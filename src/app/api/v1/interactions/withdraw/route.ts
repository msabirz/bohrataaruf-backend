import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { TargetIdSchema } from '@/lib/api/validators';

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = TargetIdSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const { profileId: targetId } = parsed.data;

    // Delete the interaction so the user reappears in the feed.
    // The withdrawal_log will still track the abuse prevention count.
    const query = sql`
      DELETE FROM interactions
      WHERE user_id = ${userId} AND target_id = ${targetId}
    `;
    
    await db.execute(query);

    // Upsert withdrawal log for abuse prevention
    const logQuery = sql`
      INSERT INTO withdrawal_log (user_id, target_id, withdrawn_count, last_withdrawn_at)
      VALUES (${userId}, ${targetId}, 1, now())
      ON CONFLICT (user_id, target_id) DO UPDATE 
      SET withdrawn_count = withdrawal_log.withdrawn_count + 1,
          last_withdrawn_at = now()
    `;
    await db.execute(logQuery);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Withdraw interest error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
