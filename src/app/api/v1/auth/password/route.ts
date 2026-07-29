import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { SetPasswordSchema } from '@/lib/api/validators';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = SetPasswordSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }
    
    const { password } = parsed.data;

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));

    return NextResponse.json({ success: true, token: request.headers.get('authorization')?.split(' ')[1] });
  } catch (error) {
    console.error('Set password error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
