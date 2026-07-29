import { NextResponse } from 'next/server';
import { db, executeQuery } from '@/lib/db';
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

    // Insert (user_id = me, target_id = them, action = 'declined')
    // This allows the sender's original 'interested' row to remain untouched.
    const query = sql`
      INSERT INTO interactions (user_id, target_id, action)
      VALUES (${userId}, ${targetId}, 'declined')
      ON CONFLICT (user_id, target_id) DO UPDATE SET action = 'declined'
    `;
    
    await executeQuery(query);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Decline interest error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
