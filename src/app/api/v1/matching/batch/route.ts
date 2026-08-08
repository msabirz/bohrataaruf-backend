import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getViewUrl } from '@/lib/storage';
import { users, profiles, verifications, preferences } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { buildBaseCandidateQuery, buildSearchFilterSql } from '@/lib/db/queries';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { computeMatchScore } from '@/lib/matching';
import { computeAgeSafe } from '@/lib/api/serialize';
import { resolvePhotoAccess } from '@/lib/photoAccess';
import { isModeB } from '@/lib/modeGuard';

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (isModeB()) return NextResponse.json({ error: 'MODE_B', message: 'Coming soon' }, { status: 200 });

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
      db.select({ gender: users.gender, latitude: users.latitude, longitude: users.longitude }).from(users).where(eq(users.id, userId)).limit(1).then(res => res[0]),
    ]);
    const viewerVerificationStatus = myVerification ? myVerification.status : 'unsubmitted';
    const viewerIsVerified = viewerVerificationStatus === 'verified';

    if (!me || !me.gender) {
      return NextResponse.json({ error: 'Incomplete profile: missing gender' }, { status: 400 });
    }

    const baseQuery = buildBaseCandidateQuery(userId, me.gender, excludeIds, false, me.latitude, me.longitude);

    // Merge body.filters over myPrefs securely
    const filters = body.filters || {};
    console.log('[Backend matching/batch] received explicit filters:', filters);

    // If a filter is explicitly null/undefined-but-absent, it means 'Any' in
    // the UI and falls back to the viewer's saved preferences. heightMin/
    // heightMax/radiusKm have no saved-preference equivalent (the
    // preferences table has no such columns) — direct passthrough only.
    const effectivePrefs = myPrefs ? {
      ageMin: filters.ageMin !== undefined ? filters.ageMin : myPrefs.ageMin,
      ageMax: filters.ageMax !== undefined ? filters.ageMax : myPrefs.ageMax,
      heightMin: filters.heightMin,
      heightMax: filters.heightMax,
      cities: filters.preferredCities !== undefined ? filters.preferredCities : (filters.city ? [filters.city] : myPrefs.preferredCities),
      education: body.teaser ? undefined : (filters.preferredEducation !== undefined ? filters.preferredEducation : myPrefs.preferredEducation),
      professions: filters.preferredProfessions !== undefined ? filters.preferredProfessions : myPrefs.preferredProfessions,
      practiceLevel: filters.practiceLevel !== undefined ? filters.practiceLevel : myPrefs.practiceLevel,
      radiusKm: filters.radiusKm,
    } : {
      ageMin: filters.ageMin,
      ageMax: filters.ageMax,
      heightMin: filters.heightMin,
      heightMax: filters.heightMax,
      cities: filters.preferredCities !== undefined ? filters.preferredCities : (filters.city ? [filters.city] : undefined),
      education: filters.preferredEducation,
      professions: filters.preferredProfessions,
      practiceLevel: filters.practiceLevel,
      radiusKm: filters.radiusKm,
    };

    const strictFilterSql = buildSearchFilterSql({
      ageMin: effectivePrefs.ageMin,
      ageMax: effectivePrefs.ageMax,
      heightMin: effectivePrefs.heightMin,
      heightMax: effectivePrefs.heightMax,
      cities: effectivePrefs.cities || undefined,
      education: effectivePrefs.education || undefined,
      professions: effectivePrefs.professions || undefined,
      practiceLevel: effectivePrefs.practiceLevel || undefined,
      radiusKm: effectivePrefs.radiusKm,
      viewerLat: me.latitude,
      viewerLng: me.longitude,
    });

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

    // Skip-recycling: only once nothing genuinely new is left (under the
    // same filters, if any were explicitly chosen), lift the exclusion on
    // previously-skipped candidates. Interested/withdrawn/declined/matched/
    // reported stay excluded regardless.
    if (results.length === 0) {
      const recycleBaseQuery = buildBaseCandidateQuery(userId, me.gender, excludeIds, true, me.latitude, me.longitude);
      const recycleQuery = hasExplicitFilters
        ? sql`${recycleBaseQuery} ${strictFilterSql} LIMIT ${limit}`
        : sql`${recycleBaseQuery} ORDER BY (CASE WHEN (TRUE ${strictFilterSql}) THEN 0 ELSE 1 END) LIMIT ${limit}`;
      const rawRecycleResult: any = await db.execute(recycleQuery);
      results = Array.isArray(rawRecycleResult) ? rawRecycleResult : (rawRecycleResult.rows || []);
      console.log(`[Backend matching/batch] recycled-skip results count: ${results.length}`);
    }

    if (results.length === 0) {
      return NextResponse.json({ candidates: [] });
    }

    const candidates = await Promise.all(results.map(async (result) => {
      const age = computeAgeSafe(result.dob);
      const access = resolvePhotoAccess(result);

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
        heightCm: result.heightCm,
        bio: result.bio,
        introLine: result.introLine,
        lifestyleAnswers: result.lifestyleAnswers,
        distanceKm: result.distanceKm != null ? Math.round(result.distanceKm * 10) / 10 : null,
        // Resolved per the owner's photo privacy mode — real key only for
        // `always` mode or an active request grant, blurred derivative
        // otherwise, never a placeholder.
        photoUri: await getViewUrl(access.photoKeyToServe),
        viewsRemaining: access.viewsRemaining,
        photoPrivacyMode: result.photoPrivacyMode,
        photoRequestStatus: access.photoRequestStatus,
        photoGrantedUntil: access.photoGrantedUntil,
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
