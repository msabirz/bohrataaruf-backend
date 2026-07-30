import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, profiles, verifications, preferences } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { buildBaseCandidateQuery } from '@/lib/db/queries';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { computeMatchScore } from '@/lib/matching';

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    
    const limit = Math.min(Math.max(1, body.limit || 10), 50);
    const excludeIds = Array.isArray(body.excludeIds) ? body.excludeIds : [];

    // These three are independent reads — fire them concurrently instead of
    // paying a sequential network round trip for each (neon-http has real
    // per-call latency even though the queries themselves are trivial).
    const [myVerification, myPrefs, me] = await Promise.all([
      db.select().from(verifications).where(eq(verifications.userId, userId)).limit(1).then(res => res[0]),
      db.select().from(preferences).where(eq(preferences.userId, userId)).limit(1).then(res => res[0]),
      db.select({ gender: users.gender }).from(users).where(eq(users.id, userId)).limit(1).then(res => res[0]),
    ]);
    const viewerVerificationStatus = myVerification ? myVerification.status : 'unsubmitted';
    const viewerIsVerified = viewerVerificationStatus === 'verified';

    if (!me || !me.gender) {
      return NextResponse.json({ error: 'Incomplete profile: missing gender' }, { status: 400 });
    }

    const baseQuery = buildBaseCandidateQuery(userId, me.gender, excludeIds);

    let strictFilterSql = sql``;
    
    // Merge body.filters over myPrefs securely
    const filters = body.filters || {};
    console.log('[Backend matching/batch] received explicit filters:', filters);

    // If a filter is explicitly null, it means 'Any' in the UI. If it's undefined, it means fall back to myPrefs.
    const effectivePrefs = myPrefs ? {
      ageMin: filters.ageMin !== undefined ? filters.ageMin : myPrefs.ageMin,
      ageMax: filters.ageMax !== undefined ? filters.ageMax : myPrefs.ageMax,
      preferredCities: filters.city !== undefined ? (filters.city ? [filters.city] : null) : myPrefs.preferredCities,
      preferredEducation: body.teaser ? undefined : myPrefs.preferredEducation,
    } : {
      ageMin: filters.ageMin,
      ageMax: filters.ageMax,
      preferredCities: filters.city ? [filters.city] : undefined,
    };

    if (effectivePrefs) {
      if (effectivePrefs.ageMin) {
        const maxDob = new Date();
        maxDob.setFullYear(maxDob.getFullYear() - effectivePrefs.ageMin);
        strictFilterSql = sql`${strictFilterSql} AND u.date_of_birth <= ${maxDob.toISOString()}`;
      }
      if (effectivePrefs.ageMax) {
        const minDob = new Date();
        minDob.setFullYear(minDob.getFullYear() - effectivePrefs.ageMax - 1);
        strictFilterSql = sql`${strictFilterSql} AND u.date_of_birth > ${minDob.toISOString()}`;
      }
      if (effectivePrefs.preferredCities && effectivePrefs.preferredCities.length > 0) {
        const cityConditions = effectivePrefs.preferredCities.map(c => sql`TRIM(LOWER(u.city)) = TRIM(LOWER(${c}))`);
        strictFilterSql = sql`${strictFilterSql} AND (${sql.join(cityConditions, sql` OR `)})`;
      }
      if (effectivePrefs.preferredEducation && effectivePrefs.preferredEducation.length > 0) {
        const eduConditions = effectivePrefs.preferredEducation.map(e => sql`TRIM(LOWER(p.education)) = TRIM(LOWER(${e}))`);
        strictFilterSql = sql`${strictFilterSql} AND (${sql.join(eduConditions, sql` OR `)})`;
      }
    }

    // A filters object only counts as an explicit choice if it actually carries a key —
    // an empty {} (e.g. a client always sending a filters object) must behave identically
    // to omitting filters entirely, otherwise the loose-fallback safety net below never runs.
    const hasExplicitFilters = body.filters !== undefined && Object.keys(body.filters).length > 0;
    console.log(`[Backend matching/batch] hasExplicitFilters: ${hasExplicitFilters}`);

    let results: any[];

    if (hasExplicitFilters) {
      // User explicitly chose filters (even if selecting 'Any') — respect that exactly,
      // no loose backfill.
      const strictQuery = sql`${baseQuery} ${strictFilterSql} LIMIT ${limit}`;
      const rawResult: any = await db.execute(strictQuery);
      results = Array.isArray(rawResult) ? rawResult : (rawResult.rows || []);
    } else {
      // No explicit filters: one query, ranking strict-matching candidates (based on the
      // viewer's saved preferences) first and letting the rest of the same result set
      // backfill the remaining slots — instead of two sequential full query executions.
      const rankedQuery = sql`${baseQuery} ORDER BY (CASE WHEN (TRUE ${strictFilterSql}) THEN 0 ELSE 1 END) LIMIT ${limit}`;
      const rawResult: any = await db.execute(rankedQuery);
      results = Array.isArray(rawResult) ? rawResult : (rawResult.rows || []);
    }

    console.log(`[Backend matching/batch] results count: ${results.length}`);

    if (results.length === 0) {
      return NextResponse.json({ candidates: [] });
    }

    const candidates = await Promise.all(results.map(async (result) => {
      const age = Math.abs(new Date(Date.now() - new Date(result.dob).getTime()).getUTCFullYear() - 1970);
      const viewsRemaining = Math.max(0, 3 - result.viewsUsed);

      const candidatePrefs = await db.select().from(preferences).where(eq(preferences.userId, result.id)).limit(1).then(res => res[0]);
      const { percentage } = computeMatchScore(
        myPrefs,
        { age, city: result.city },
        { education: result.education, profession: result.profession, hasChildren: result.hasChildren },
        candidatePrefs
      );

      const maskAlias = (alias: string) => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return Array.from(alias).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
      };

      return {
        profileId: result.id,
        alias: body.teaser ? maskAlias(result.alias) : result.alias,
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
    }));

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error('Batch get match error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
