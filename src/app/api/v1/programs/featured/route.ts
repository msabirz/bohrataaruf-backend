import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { taarufPrograms } from '@/lib/db/schema';
import { and, eq, or, isNull, gte } from 'drizzle-orm';

// Public (falls under the /api/v1/programs prefix in middleware.ts's publicRoutes).
// Next.js resolves this static segment before the sibling [slug]/route.ts dynamic
// route, so "/api/v1/programs/featured" never gets treated as a program slug.
//
// The ONLY gate is a program's own "Feature on Homepage" toggle (+ an optional
// featureUntil expiry) — this has no relationship to SITE_MODE. Whichever
// homepage (Plan A or Plan B) is live reads from this same endpoint.
export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const program = await db.select({
      id: taarufPrograms.id,
      title: taarufPrograms.title,
      slug: taarufPrograms.slug,
      city: taarufPrograms.city,
      startDate: taarufPrograms.startDate,
      endDate: taarufPrograms.endDate,
    }).from(taarufPrograms)
      .where(and(
        eq(taarufPrograms.status, 'published'),
        eq(taarufPrograms.featureOnHomepage, true),
        or(isNull(taarufPrograms.featureUntil), gte(taarufPrograms.featureUntil, today)),
      ))
      .orderBy(taarufPrograms.startDate)
      .limit(1)
      .then(r => r[0] ?? null);

    return NextResponse.json({ program });
  } catch (error) {
    console.error('[Featured Program GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
