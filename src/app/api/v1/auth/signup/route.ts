import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, profiles, preferences } from '@/lib/db/schema';
import { SignupSchema } from '@/lib/api/validators';
import { signToken, hashItsNumber } from '@/lib/api/auth';
import crypto from 'crypto';
import { attachReferral, notifyReferralJoined } from '@/lib/share/referral';

// New OTP-free signup path: ITS number + password only. The card photo is
// attached in a second call (existing authenticated verification/upload-url
// + verification/its-card flow) once this route returns a token — no new
// anonymous upload infrastructure needed.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = SignupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const { itsNumber, password, referralLinkId, referralNameConsent } = parsed.data;

    const itsNumberHash = hashItsNumber(itsNumber);
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    let userRow;
    try {
      const insertRes = await db.insert(users).values({
        itsNumberHash,
        passwordHash,
        name: 'New User',
        phone: null,
        dateOfBirth: null,
        city: null,
      }).returning();
      userRow = insertRes[0];
    } catch (err: any) {
      const dbErrorCode = err?.code || err?.cause?.code;
      if (dbErrorCode === '23505') {
        return NextResponse.json({
          error: 'DUPLICATE_ITS_NUMBER',
          message: 'This ITS number is already registered to another account. If you believe this is a mistake, please contact support.',
        }, { status: 409 });
      }
      throw err;
    }

    // Create empty profile and preferences rows, same pattern as otp/verify.
    try {
      const placeholderAlias = `New ${Math.floor(100000 + Math.random() * 900000)}`;
      await db.insert(profiles).values({
        userId: userRow.id,
        alias: placeholderAlias,
      });
    } catch (e) {
      console.error('[auth/signup] Failed to create profile row:', e);
    }

    try {
      await db.insert(preferences).values({
        userId: userRow.id,
      });
    } catch (e) {
      console.error('[auth/signup] Failed to create preferences row:', e);
    }

    // Share-link referral (web only, optional). Never fails signup: an unknown,
    // stopped or switched-off link is simply ignored.
    if (referralLinkId) {
      const consent = referralNameConsent === true;
      const link = await attachReferral(userRow.id, referralLinkId, consent);
      // Without consent she is told now, by the link's label only. With consent she is
      // told once the new person saves their name (see profile/basics), so the first
      // name can be included.
      if (link && !consent) await notifyReferralJoined(link);
    }

    const token = await signToken(userRow.id);

    // Set HTTP-only secure cookie for the web client (shared backend).
    const response = NextResponse.json({ token });
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
