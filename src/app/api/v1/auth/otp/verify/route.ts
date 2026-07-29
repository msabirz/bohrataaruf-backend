import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, profiles, preferences } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { VerifyOtpSchema } from '@/lib/api/validators';
import { signToken } from '@/lib/api/auth';
import { verifyOtp } from '@/lib/api/otp';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = VerifyOtpSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }
    
    const { phone, code } = parsed.data;

    try {
      await verifyOtp(phone, code, 'login');
    } catch (err: any) {
      const msg = err.message;
      if (msg.includes('No OTP') || msg.includes('expired')) {
        return NextResponse.json({ error: msg }, { status: 400 });
      } else if (msg.includes('Too many')) {
        return NextResponse.json({ error: msg }, { status: 429 });
      } else {
        return NextResponse.json({ error: msg }, { status: 401 });
      }
    }

    // Find or create user
    let userRow = await db.select().from(users).where(eq(users.phone, phone)).limit(1).then(res => res[0]);
    
    if (userRow && userRow.abandonedAt) {
      console.log(`[otp/verify] Account ${userRow.id} was abandoned at ${userRow.abandonedAt}. Clearing abandoned_at to allow resuming onboarding...`);
      const updated = await db.update(users).set({ abandonedAt: null }).where(eq(users.id, userRow.id)).returning();
      userRow = updated[0];
    }

    if (!userRow) {
      try {
        // Create stub user (this happens on first login, onboarding fills the rest)
        // itsNumberHash is legitimately null at this point
        const insertRes = await db.insert(users).values({
          phone,
          name: 'New User',
          dateOfBirth: new Date('2000-01-01').toISOString(),
          city: '',
        }).returning();
        
        userRow = insertRes[0];
      } catch (err: any) {
        const dbErrorCode = err?.code || err?.cause?.code;
        if (dbErrorCode === '23505') {
          console.warn('[otp/verify] Unique violation on user insert, fetching existing user instead...');
          const existingRow = await db.select().from(users).where(eq(users.phone, phone)).limit(1).then(res => res[0]);
          if (!existingRow) {
             throw new Error('Hit unique constraint but row still missing');
          }
          userRow = existingRow;
        } else {
          throw err;
        }
      }

      // Create empty profile and preferences for the new user
      if (userRow) {
        try {
          const placeholderAlias = `New ${Math.floor(100000 + Math.random() * 900000)}`;
          await db.insert(profiles).values({
            userId: userRow.id,
            alias: placeholderAlias,
          });
        } catch (e) {
          console.error('[otp/verify] Failed to create profile row:', e);
        }
        
        try {
          await db.insert(preferences).values({
            userId: userRow.id,
          });
        } catch (e) {
          console.error('[otp/verify] Failed to create preferences row:', e);
        }
      }
    }

    const token = await signToken(userRow.id);
    const responseBody = { token };
    console.log('[verifyOtp backend] sending response:', JSON.stringify(responseBody));
    
    // Set HTTP-only secure cookie for the web client (shared backend)
    const response = NextResponse.json(responseBody);
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
