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

    // Simple upsert, skipping never triggers a match
    const query = sql`
      INSERT INTO interactions (user_id, target_id, action)
      VALUES (${userId}, ${targetId}, 'skip')
      ON CONFLICT (user_id, target_id) DO UPDATE SET action = 'skip'
    `;
    
    await db.execute(query);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark skip error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
