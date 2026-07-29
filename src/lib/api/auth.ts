import { SignJWT } from 'jose';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

console.log('[auth] JWT_SECRET loaded:', process.env.JWT_SECRET ? `yes, length ${process.env.JWT_SECRET.length}` : 'NO - USING FALLBACK');

export async function signToken(userId: string) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is missing');
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1y')
    .sign(secret);
}

export function hashItsNumber(itsNumber: string): string {
  if (!process.env.ITS_HASH_SECRET) {
    throw new Error('ITS_HASH_SECRET environment variable is missing');
  }
  return crypto.createHmac('sha256', process.env.ITS_HASH_SECRET).update(itsNumber).digest('hex');
}

export async function getAuthenticatedUserId(request: Request): Promise<string | null> {
  const userId = request.headers.get('x-user-id');
  console.log('[auth] getAuthenticatedUserId extracted from header:', userId);
  if (!userId) return null;

  const user = await db.select({ id: users.id, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then(res => res[0]);

  console.log('[auth] DB lookup for userId', userId, '-> found user:', !!user, 'isActive:', user?.isActive);

  if (!user || !user.isActive) {
    return null;
  }

  return user.id;
}
