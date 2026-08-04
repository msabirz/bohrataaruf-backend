import { db } from '@/lib/db';
import { otps } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';

export type OtpPurpose = 'login' | 'password_reset';

/**
 * Generates an OTP, hashes it, stores it in the database with expiry,
 * and enforces the 60-second rate limit.
 */
export async function generateAndSendOtp(phone: string, purpose: OtpPurpose) {
  // Rate limiting: check last OTP request for this phone AND purpose
  const lastOtp = await db.select()
    .from(otps)
    .where(eq(otps.phone, phone))
    // We could filter by purpose if we wanted rate-limits to be purpose-isolated,
    // but globally for the phone is safer to prevent spam.
    .orderBy(desc(otps.createdAt))
    .limit(1)
    .then(res => res[0]);

  if (lastOtp) {
    const now = new Date();
    const diffMs = now.getTime() - lastOtp.createdAt!.getTime();
    if (diffMs < 60 * 1000) { // 60 seconds
      throw new Error('Please wait 60 seconds before requesting another OTP');
    }
  }

  // Generate random 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
  
  // Set expiry to 10 minutes from now
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);

  await db.insert(otps).values({
    phone,
    purpose,
    codeHash,
    expiresAt,
  });

  // SECURITY: this must never return the OTP in production — verify 
  // NODE_ENV is correctly set to 'production' in the actual deployed 
  // Vercel environment before launch, not just locally.
  let responseBody: { success: boolean; devOtp?: string } = { success: true };
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV ONLY] OTP for ${phone} (${purpose}): ${code}`);
    responseBody.devOtp = code;
  }
  
  return responseBody;
}

/**
 * Verifies an OTP against the given phone and purpose.
 * Enforces max attempts and expiry.
 */
export async function verifyOtp(phone: string, code: string, purpose: OtpPurpose) {
  const latestOtp = await db.select()
    .from(otps)
    .where(eq(otps.phone, phone))
    .orderBy(desc(otps.createdAt))
    .limit(1)
    .then(res => res[0]);

  if (!latestOtp) {
    throw new Error('No OTP requested for this number');
  }

  // Ensure purpose matches
  if (latestOtp.purpose !== purpose) {
    throw new Error('Invalid OTP purpose');
  }

  if (new Date() > latestOtp.expiresAt) {
    throw new Error('OTP has expired');
  }

  if (latestOtp.attempts! >= 5) {
    throw new Error('Too many invalid attempts. Request a new OTP.');
  }

  const codeHash = crypto.createHash('sha256').update(code).digest('hex');

  // Timing-safe comparison — both sides are fixed-length (32-byte) SHA-256
  // digests, so a length check before timingSafeEqual is just defensive
  // (guards the rare case latestOtp.codeHash is malformed) rather than
  // something that can legitimately differ in normal operation.
  const codeHashBuf = Buffer.from(codeHash, 'hex');
  const storedHashBuf = Buffer.from(latestOtp.codeHash, 'hex');
  const isValid = codeHashBuf.length === storedHashBuf.length && crypto.timingSafeEqual(codeHashBuf, storedHashBuf);

  if (!isValid) {
    await db.update(otps).set({ attempts: latestOtp.attempts! + 1 }).where(eq(otps.id, latestOtp.id));
    throw new Error('Invalid OTP');
  }

  // Mark used (could delete it or set expiry to now)
  await db.update(otps).set({ expiresAt: new Date() }).where(eq(otps.id, latestOtp.id));

  return true;
}
