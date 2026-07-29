import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { LoginSchema } from '@/lib/api/validators';
import { signToken, hashItsNumber } from '@/lib/api/auth';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }
    
    const { itsNumber, password } = parsed.data;

    // Use HMAC-SHA256 with secret instead of plain SHA256
    const itsNumberHash = hashItsNumber(itsNumber);
    
    const userRow = await db.select().from(users).where(eq(users.itsNumberHash, itsNumberHash)).limit(1).then(res => res[0]);
    
    if (!userRow) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!userRow.passwordHash) {
      return NextResponse.json({ error: 'Password not set. Please complete onboarding or reset password.' }, { status: 403 });
    }

    // Verify password hash
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    if (userRow.passwordHash !== passwordHash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (userRow.abandonedAt) {
      console.log(`[login] Account ${userRow.id} was abandoned at ${userRow.abandonedAt}. Clearing abandoned_at on successful password login...`);
      await db.update(users).set({ abandonedAt: null }).where(eq(users.id, userRow.id));
    }

    const token = await signToken(userRow.id);
    
    // Set HTTP-only secure cookie for the web client (shared backend)
    const response = NextResponse.json({ token });
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
