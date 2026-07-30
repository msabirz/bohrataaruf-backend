import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Server-side auth check for App Router pages/layouts. Middleware only runs on
 * /api/:path* (see src/middleware.ts), so it never protects page routes — pages
 * must verify the JWT themselves rather than trusting any header. Mirrors the
 * same jwtVerify logic middleware uses on API routes.
 */
export async function getAuthenticatedUserFromCookie(): Promise<{ id: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;

  try {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is missing');
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (!payload.userId || typeof payload.userId !== 'string') return null;

    const user = await db.select({ id: users.id, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1)
      .then(res => res[0]);

    if (!user || !user.isActive) return null;

    return { id: user.id };
  } catch {
    return null;
  }
}
