import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { taarufPrograms, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthenticatedUserFromCookie } from '@/lib/api/pageAuth';

// Public — no login required (see publicRoutes in src/middleware.ts). Anyone
// can browse published programs; only applying (POST /api/v1/program-applications)
// requires an account.
export async function GET() {
  try {
    const programs = await db.select({
      id: taarufPrograms.id,
      title: taarufPrograms.title,
      slug: taarufPrograms.slug,
      description: taarufPrograms.description,
      city: taarufPrograms.city,
      venueName: taarufPrograms.venueName,
      startDate: taarufPrograms.startDate,
      endDate: taarufPrograms.endDate,
      feeAmount: taarufPrograms.feeAmount,
      registrationDeadline: taarufPrograms.registrationDeadline,
    }).from(taarufPrograms)
      .where(eq(taarufPrograms.status, 'published'))
      .orderBy(taarufPrograms.startDate);

    // Logged-in visitors see programs in their own city surfaced first —
    // a ranking only, never a filter, so nothing is hidden from anyone.
    let myCity: string | null = null;
    const user = await getAuthenticatedUserFromCookie();
    if (user) {
      const row = await db.select({ city: users.city }).from(users).where(eq(users.id, user.id)).limit(1).then(r => r[0]);
      myCity = row?.city ?? null;
    }

    const sorted = myCity
      ? [...programs].sort((a, b) => {
          const aMatch = a.city === myCity ? 0 : 1;
          const bMatch = b.city === myCity ? 0 : 1;
          return aMatch - bMatch;
        })
      : programs;

    return NextResponse.json({ programs: sorted });
  } catch (error) {
    console.error('[Public Programs GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
