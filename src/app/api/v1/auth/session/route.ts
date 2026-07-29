import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  // If the request reached here, the middleware already successfully validated the JWT.
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  const user = await db.select({ isActive: users.isActive, abandonedAt: users.abandonedAt }).from(users).where(eq(users.id, userId)).limit(1).then(res => res[0]);

  if (!user) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  if (user.abandonedAt) {
    return NextResponse.json({ valid: false, error: 'Account abandoned due to inactivity. Please contact support.' }, { status: 403 });
  }

  if (!user.isActive) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  return NextResponse.json({ valid: true });
}
