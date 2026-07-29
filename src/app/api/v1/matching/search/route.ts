import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getViewUrl } from '@/lib/storage';
import { users, verifications, preferences } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { computeMatchScore } from '@/lib/matching';
import { buildBaseCandidateQuery, buildSearchFilterSql } from '@/lib/db/queries';

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    
    // Parse query params for search filters
    const ageMin = url.searchParams.get('ageMin') ? parseInt(url.searchParams.get('ageMin')!, 10) : null;
    const ageMax = url.searchParams.get('ageMax') ? parseInt(url.searchParams.get('ageMax')!, 10) : null;
    const cities = url.searchParams.get('cities')?.split(',').filter(Boolean) || [];
    const education = url.searchParams.get('education')?.split(',').filter(Boolean) || [];
    const professions = url.searchParams.get('professions')?.split(',').filter(Boolean) || [];
    const familyExpectation = url.searchParams.get('familyExpectation');
    const practiceLevel = url.searchParams.get('practiceLevel');
    const maritalStatus = url.searchParams.get('maritalStatus');
    const willingToRelocate = url.searchParams.get('willingToRelocate') === 'true';

    // Pagination
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = 20;
    const offset = (page - 1) * limit;

    // Fetch requester verification status but do NOT block if unverified
    const myVerification = await db.select().from(verifications).where(eq(verifications.userId, userId)).limit(1).then(res => res[0]);
    const viewerVerificationStatus = myVerification ? myVerification.status : 'unsubmitted';
    const viewerIsVerified = viewerVerificationStatus === 'verified';

    const myPrefs = await db.select().from(preferences).where(eq(preferences.userId, userId)).limit(1).then(res => res[0]);
    const me = await db.select({ gender: users.gender }).from(users).where(eq(users.id, userId)).limit(1).then(res => res[0]);
    if (!me || !me.gender) {
      return NextResponse.json({ error: 'Incomplete profile: missing gender' }, { status: 400 });
    }

    // Build the base query excluding interactions and matches, and ensuring target is verified
    const baseQuery = buildBaseCandidateQuery(userId, me.gender);

    const searchFilterSql = buildSearchFilterSql({
      ageMin, ageMax, cities, education, professions,
      familyExpectation: familyExpectation || undefined,
      practiceLevel: practiceLevel || undefined,
      maritalStatus: maritalStatus || undefined,
      willingToRelocate,
    });

    const query = sql`${baseQuery} ${searchFilterSql} LIMIT ${limit} OFFSET ${offset}`;
    const rawResult: any = await db.execute(query);
    const rows = Array.isArray(rawResult) ? rawResult : (rawResult.rows || []);

    const candidates = await Promise.all(rows.map(async (row: any) => {
      const age = Math.abs(new Date(Date.now() - new Date(row.dob).getTime()).getUTCFullYear() - 1970);
      const viewsRemaining = Math.max(0, 3 - row.viewsUsed);
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
        photoUri: await getViewUrl(row.photoUri),
        viewsRemaining,
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
