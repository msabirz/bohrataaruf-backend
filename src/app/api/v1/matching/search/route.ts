import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getViewUrl } from '@/lib/storage';
import { users, verifications, preferences } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { computeMatchScore } from '@/lib/matching';
import { computeAgeSafe } from '@/lib/api/serialize';
import { resolvePhotoAccess } from '@/lib/photoAccess';
import { buildBaseCandidateQuery, buildSearchFilterSql } from '@/lib/db/queries';

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    
    // Parse query params for search filters
    const ageMin = url.searchParams.get('ageMin') ? parseInt(url.searchParams.get('ageMin')!, 10) : null;
    const ageMax = url.searchParams.get('ageMax') ? parseInt(url.searchParams.get('ageMax')!, 10) : null;
    const heightMin = url.searchParams.get('heightMin') ? parseInt(url.searchParams.get('heightMin')!, 10) : null;
    const heightMax = url.searchParams.get('heightMax') ? parseInt(url.searchParams.get('heightMax')!, 10) : null;
    const cities = url.searchParams.get('cities')?.split(',').filter(Boolean) || [];
    const education = url.searchParams.get('education')?.split(',').filter(Boolean) || [];
    const professions = url.searchParams.get('professions')?.split(',').filter(Boolean) || [];
    const familyExpectation = url.searchParams.get('familyExpectation');
    const practiceLevel = url.searchParams.get('practiceLevel');
    const maritalStatus = url.searchParams.get('maritalStatus');
    const willingToRelocate = url.searchParams.get('willingToRelocate') === 'true';
    const radiusKm = url.searchParams.get('radiusKm') ? parseFloat(url.searchParams.get('radiusKm')!) : null;

    // Pagination
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = 20;
    const offset = (page - 1) * limit;

    // Fetch requester verification status but do NOT block if unverified
    const myVerification = await db.select().from(verifications).where(eq(verifications.userId, userId)).limit(1).then(res => res[0]);
    const viewerVerificationStatus = myVerification ? myVerification.status : 'unsubmitted';
    const viewerIsVerified = viewerVerificationStatus === 'verified';

    const myPrefs = await db.select().from(preferences).where(eq(preferences.userId, userId)).limit(1).then(res => res[0]);
    const me = await db.select({ gender: users.gender, latitude: users.latitude, longitude: users.longitude }).from(users).where(eq(users.id, userId)).limit(1).then(res => res[0]);
    if (!me || !me.gender) {
      return NextResponse.json({ error: 'Incomplete profile: missing gender' }, { status: 400 });
    }

    // Build the base query excluding interactions and matches, and ensuring target is verified
    const baseQuery = buildBaseCandidateQuery(userId, me.gender);

    const searchFilterSql = buildSearchFilterSql({
      ageMin, ageMax, heightMin, heightMax, cities, education, professions,
      familyExpectation: familyExpectation || undefined,
      practiceLevel: practiceLevel || undefined,
      maritalStatus: maritalStatus || undefined,
      willingToRelocate,
      viewerLat: me.latitude,
      viewerLng: me.longitude,
      radiusKm,
    });

    const query = sql`${baseQuery} ${searchFilterSql} LIMIT ${limit} OFFSET ${offset}`;
    const rawResult: any = await db.execute(query);
    const rows = Array.isArray(rawResult) ? rawResult : (rawResult.rows || []);

    const candidates = await Promise.all(rows.map(async (row: any) => {
      const age = computeAgeSafe(row.dob);
      const access = resolvePhotoAccess(row);
      const candidatePrefs = await db.select().from(preferences).where(eq(preferences.userId, row.id)).limit(1).then(res => res[0]);
      
      let percentage: number | null = null;
      if (myPrefs) {
        const score = computeMatchScore(
          myPrefs,
          { age, city: row.city },
          { education: row.education, profession: row.profession, hasChildren: row.hasChildren },
          candidatePrefs
        );
        percentage = score.percentage;
      }

      return {
        profileId: row.id,
        alias: row.alias,
        bio: row.bio,
        introLine: row.introLine,
        age,
        city: row.city,
        education: row.education,
        profession: row.profession,
        heightCm: row.heightCm,
        // Resolved per the owner's photo privacy mode — real key only for
        // `always` mode or an active request grant, blurred derivative
        // otherwise, never a placeholder.
        photoUri: await getViewUrl(access.photoKeyToServe),
        viewsRemaining: access.viewsRemaining,
        photoPrivacyMode: row.photoPrivacyMode,
        photoRequestStatus: access.photoRequestStatus,
        photoGrantedUntil: access.photoGrantedUntil,
        matchPercentage: percentage,
        viewerIsVerified,
        viewerVerificationStatus,
      };
    }));

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error('Error searching profiles:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
