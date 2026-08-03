import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, verifications } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { buildBaseCandidateQuery, buildSearchFilterSql } from '@/lib/db/queries';

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);

    // Parse the same filter params as /matching/search
    const ageMin = url.searchParams.get('ageMin') ? parseInt(url.searchParams.get('ageMin')!, 10) : null;
    const ageMax = url.searchParams.get('ageMax') ? parseInt(url.searchParams.get('ageMax')!, 10) : null;
    const cities = url.searchParams.get('cities')?.split(',').filter(Boolean) || [];
    const education = url.searchParams.get('education')?.split(',').filter(Boolean) || [];
    const professions = url.searchParams.get('professions')?.split(',').filter(Boolean) || [];
    const familyExpectation = url.searchParams.get('familyExpectation');
    const practiceLevel = url.searchParams.get('practiceLevel');
    const maritalStatus = url.searchParams.get('maritalStatus');
    const willingToRelocate = url.searchParams.get('willingToRelocate') === 'true';
    const radiusKm = url.searchParams.get('radiusKm') ? parseFloat(url.searchParams.get('radiusKm')!) : null;

    const me = await db
      .select({ gender: users.gender, latitude: users.latitude, longitude: users.longitude })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then((res) => res[0]);

    if (!me || !me.gender) {
      return NextResponse.json({ error: 'Incomplete profile: missing gender' }, { status: 400 });
    }

    const baseQuery = buildBaseCandidateQuery(userId, me.gender);
    const filterSql = buildSearchFilterSql({
      ageMin, ageMax, cities, education, professions,
      familyExpectation: familyExpectation || undefined,
      practiceLevel: practiceLevel || undefined,
      maritalStatus: maritalStatus || undefined,
      willingToRelocate,
      viewerLat: me.latitude,
      viewerLng: me.longitude,
      radiusKm,
    });

    // Wrap in COUNT(*) — no photos, no match scoring, no pagination
    const countQuery = sql`SELECT COUNT(*) as count FROM (${baseQuery} ${filterSql}) AS subq`;
    const rawResult: any = await db.execute(countQuery);
    const rows = Array.isArray(rawResult) ? rawResult : (rawResult.rows || []);
    const count = parseInt(rows[0]?.count ?? '0', 10);
    const viewerHasLocation = me.latitude != null && me.longitude != null;

    return NextResponse.json({ count, viewerHasLocation });
  } catch (error) {
    console.error('Error counting search profiles:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
