import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ResetPasswordRequestSchema } from '@/lib/api/validators';
import { generateAndSendOtp } from '@/lib/api/otp';
import { hashItsNumber } from '@/lib/api/auth';
import { getLimiterForPath } from '@/lib/rateLimit';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ResetPasswordRequestSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }
    
    const { itsNumber } = parsed.data;

    // Apply Rate Limiting
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || '127.0.0.1';
    // Use ITS number + IP as rate limit key to prevent both generic IP spam and targeted ITS enumeration
    const identifier = `${ip}-${itsNumber}`;

    const url = new URL(request.url);
    const limiter = getLimiterForPath(url.pathname);

    if (limiter) {
      const { success } = await limiter.limit(identifier);
      if (!success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }
    }

    const itsNumberHash = hashItsNumber(itsNumber);
    const userRow = await db.select().from(users).where(eq(users.itsNumberHash, itsNumberHash)).limit(1).then(res => res[0]);

    let devOtp: string | undefined = undefined;

    // We only generate an OTP if the user exists.
    if (userRow && userRow.phone) {
      try {
        const responseBody = await generateAndSendOtp(userRow.phone, 'password_reset');
        devOtp = responseBody.devOtp;
      } catch (err: any) {
        // If rate limited by the OTP logic itself (60 seconds), we can safely swallow it or return the generic success
        // to prevent timing attacks, but it's okay to just return generic success.
        console.warn('OTP Generation error in reset-request:', err.message);
      }
    }

    // ENUMERATION SAFE RESPONSE
    // We always return the exact same message regardless of whether the ITS number exists.
    let responseBody: { message: string; devOtp?: string } = { 
      message: "If this account exists, we've sent a verification code."
    };

    if (process.env.NODE_ENV !== 'production' && devOtp) {
      responseBody.devOtp = devOtp;
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error('Reset request error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
