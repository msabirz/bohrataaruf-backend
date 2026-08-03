import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ResetPasswordConfirmSchema } from '@/lib/api/validators';
import { hashItsNumber } from '@/lib/api/auth';
import { verifyOtp } from '@/lib/api/otp';
import { sendPushNotification } from '@/lib/pushNotifications';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ResetPasswordConfirmSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }
    
    const { itsNumber, otp, newPassword } = parsed.data;

    const itsNumberHash = hashItsNumber(itsNumber);
    const userRow = await db.select().from(users).where(eq(users.itsNumberHash, itsNumberHash)).limit(1).then(res => res[0]);

    if (!userRow || !userRow.phone) {
      // If user doesn't exist, we can return generic error here, since they shouldn't reach here without an OTP.
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 401 });
    }

    try {
      // Re-use strict OTP verification logic
      await verifyOtp(`${userRow.countryCode}${userRow.phone}`, otp, 'password_reset');
    } catch (err: any) {
      const msg = err.message;
      if (msg.includes('No OTP') || msg.includes('expired') || msg.includes('Invalid OTP purpose')) {
        return NextResponse.json({ error: msg }, { status: 400 });
      } else if (msg.includes('Too many')) {
        return NextResponse.json({ error: msg }, { status: 429 });
      } else {
        return NextResponse.json({ error: msg }, { status: 401 });
      }
    }

    // Valid OTP, now hash and set the new password
    const newPasswordHash = crypto.createHash('sha256').update(newPassword).digest('hex');

    await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, userRow.id));

    // Fire push notification for security alert
    sendPushNotification(userRow.id, 'security_alerts', 'Password Changed', 'Your password was successfully reset.')
      .catch(err => console.warn('[push] send failed:', err));

    return NextResponse.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Reset confirm error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
