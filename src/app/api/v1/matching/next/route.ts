import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, profiles, verifications, preferences } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { buildBaseCandidateQuery } from '@/lib/db/queries';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { computeMatchScore } from '@/lib/matching';

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const excludeId = url.searchParams.get('excludeId');

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
    const baseQuery = buildBaseCandidateQuery(userId, me.gender, excludeId ? [excludeId] : []);

    let strictFilterSql = sql``;
    
    // Add preference filters if we have them
    if (myPrefs) {
      if (myPrefs.ageMin) {
        // e.g. age >= ageMin => birth date <= current year - ageMin
        const maxDob = new Date();
        maxDob.setFullYear(maxDob.getFullYear() - myPrefs.ageMin);
        strictFilterSql = sql`${strictFilterSql} AND u.date_of_birth <= ${maxDob.toISOString()}`;
      }
      if (myPrefs.ageMax) {
        const minDob = new Date();
        minDob.setFullYear(minDob.getFullYear() - myPrefs.ageMax - 1);
        strictFilterSql = sql`${strictFilterSql} AND u.date_of_birth > ${minDob.toISOString()}`;
      }
      if (myPrefs.preferredCities && myPrefs.preferredCities.length > 0) {
        strictFilterSql = sql`${strictFilterSql} AND u.city IN (${sql.join(myPrefs.preferredCities.map(c => sql`${c}`), sql`, `)})`;
      }
      if (myPrefs.preferredEducation && myPrefs.preferredEducation.length > 0) {
        strictFilterSql = sql`${strictFilterSql} AND p.education IN (${sql.join(myPrefs.preferredEducation.map(e => sql`${e}`), sql`, `)})`;
      }
    }

    // Attempt Strict query first
    const strictQuery = sql`${baseQuery} ${strictFilterSql} LIMIT 1`;
    console.log('\n--- [getNextMatch] DIAGNOSTICS ---');
    console.log('STRICT SQL:', (strictQuery as any).toSQL ? (strictQuery as any).toSQL() : 'No toSQL() available');
    
    let rawStrictResult: any = await db.execute(strictQuery);
    let strictRows = Array.isArray(rawStrictResult) ? rawStrictResult : (rawStrictResult.rows || []);
    console.log('STRICT ROWS RETURNED:', strictRows.length, strictRows);
    let result = strictRows[0];

    // Fallback to loose query (no preference filters) if nothing found
    if (!result) {
      const looseQuery = sql`${baseQuery} LIMIT 1`;
      console.log('LOOSE SQL:', (looseQuery as any).toSQL ? (looseQuery as any).toSQL() : 'No toSQL() available');
      let rawLooseResult: any = await db.execute(looseQuery);
      let looseRows = Array.isArray(rawLooseResult) ? rawLooseResult : (rawLooseResult.rows || []);
      console.log('LOOSE ROWS RETURNED:', looseRows.length, looseRows);
      result = looseRows[0];
    }
    
    console.log('FINAL RESULT OBJECT:', !!result);
    console.log('--------------------------------\n');

    if (!result) {
      return NextResponse.json({ message: 'No more candidates available at this time.' }, { status: 404 });
    }

    const age = Math.abs(new Date(Date.now() - new Date(result.dob).getTime()).getUTCFullYear() - 1970);
    const viewsRemaining = Math.max(0, 3 - result.viewsUsed);

    // Fetch candidate's preferences to compute the score
    const candidatePrefs = await db.select().from(preferences).where(eq(preferences.userId, result.id)).limit(1).then(res => res[0]);
    const { percentage } = computeMatchScore(
      myPrefs,
      { age, city: result.city },
      { education: result.education, profession: result.profession, hasChildren: result.hasChildren },
      candidatePrefs
    );

    const payload = {
      profileId: result.id,
      alias: result.alias,
      age,
      city: result.city,
      education: result.education,
      profession: result.profession,
      bio: result.bio,
      introLine: result.introLine,
      // Never the real photo in a browsing/pre-match context — only
      // POST /api/v1/matching/photo-view legitimately reveals it, gated by the 3-view cap.
      photoUri: null,
      viewsRemaining,
      matchPercentage: percentage,
      viewerIsVerified,
      viewerVerificationStatus,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Get next match error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
