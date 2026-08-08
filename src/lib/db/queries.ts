import { sql, SQL } from 'drizzle-orm';

// includeSkipped: false (default) excludes every past interaction, same as
// always. true lifts the exclusion for 'skip' only — interested/withdrawn/
// declined always stay excluded regardless. Callers use this as a second
// pass when the normal (false) query comes back empty, so a genuinely
// fresh pool always wins first; skips only resurface once nothing new is
// left to show.
// viewerLat/viewerLng: optional — when both are provided, adds a
// "distanceKm" column computed via the same haversine formula
// buildSearchFilterSql's radius filter already uses. Only the resulting
// km distance is ever exposed to a client, never the candidate's raw
// coordinates (u.latitude/u.longitude are deliberately not selected).
export function buildBaseCandidateQuery(
  viewerId: string,
  viewerGender: string,
  excludeIds?: string[],
  includeSkipped: boolean = false,
  viewerLat?: number | null,
  viewerLng?: number | null
) {
  const excludeSql = excludeIds && excludeIds.length > 0
    ? sql`AND u.id NOT IN (${sql.join(excludeIds.map(id => sql`${id}`), sql`, `)})`
    : sql``;

  const myInteractionExclusion = includeSkipped
    ? sql`i.user_id = ${viewerId} AND i.target_id = u.id AND i.action != 'skip'`
    : sql`i.user_id = ${viewerId} AND i.target_id = u.id`;

  const distanceSql = viewerLat != null && viewerLng != null
    ? sql`,
      CASE WHEN u.latitude IS NULL OR u.longitude IS NULL THEN NULL ELSE (
        6371 * acos(
          LEAST(1, GREATEST(-1,
            cos(radians(${viewerLat})) * cos(radians(u.latitude)) *
            cos(radians(u.longitude) - radians(${viewerLng})) +
            sin(radians(${viewerLat})) * sin(radians(u.latitude))
          ))
        )
      ) END as "distanceKm"`
    : sql``;

  return sql`
    SELECT
      u.id, u.date_of_birth as "dob", u.city,
      p.alias, p.education, p.profession, p.has_children as "hasChildren", p.bio_text as "bio", p.intro_line as "introLine", p.photo_key as "photoUri", p.photo_key_blurred as "photoUriBlurred", p.height_cm as "heightCm",
      p.photo_privacy_mode as "photoPrivacyMode",
      p.lifestyle_answers as "lifestyleAnswers"${distanceSql},
      COALESCE(pv.views_used, 0) as "viewsUsed",
      pv.extra_view_requested as "extraViewRequested",
      pv.extra_view_approved as "extraViewApproved",
      pv.extra_view_approved_until as "extraViewApprovedUntil"
    FROM users u
    JOIN profiles p ON u.id = p.user_id
    JOIN verifications v ON u.id = v.user_id
    LEFT JOIN photo_views pv ON pv.viewer_id = ${viewerId} AND pv.profile_id = u.id
    LEFT JOIN preferences pr ON pr.user_id = u.id
    WHERE u.id != ${viewerId}
      ${excludeSql}
      AND u.is_active = true
      AND u.abandoned_at IS NULL
      AND u.is_test_account = false
      AND p.photo_key IS NOT NULL AND p.photo_key != ''
      AND u.gender IS DISTINCT FROM ${viewerGender}
      AND v.status = 'verified'
      AND NOT EXISTS (
        SELECT 1 FROM interactions i WHERE ${myInteractionExclusion}
      )
      AND NOT EXISTS (
        SELECT 1 FROM reports r 
        WHERE r.reporter_id = ${viewerId} 
          AND r.reported_user_id = u.id 
          AND r.status IN ('pending', 'reviewed', 'actioned')
      )
      AND NOT EXISTS (
        SELECT 1 FROM interactions their_i WHERE their_i.user_id = u.id AND their_i.target_id = ${viewerId} AND their_i.action = 'interested'
      )
      AND NOT EXISTS (
        SELECT 1 FROM matches m WHERE (m.user_a = ${viewerId} AND m.user_b = u.id) OR (m.user_a = u.id AND m.user_b = ${viewerId})
      )
      AND NOT EXISTS (
        SELECT 1 FROM withdrawal_log wl 
        WHERE wl.user_id = ${viewerId} 
          AND wl.target_id = u.id 
          AND wl.withdrawn_count >= 3 
          AND wl.last_withdrawn_at > now() - interval '7 days'
      )
  `;
}

export interface SearchFilters {
  ageMin?: number | null;
  ageMax?: number | null;
  heightMin?: number | null;
  heightMax?: number | null;
  cities?: string[];
  education?: string[];
  professions?: string[];
  familyExpectation?: string | null;
  practiceLevel?: string | null;
  maritalStatus?: string | null;
  willingToRelocate?: boolean;
  // Requester's own coordinates + desired radius — named viewer* (not
  // latitude/longitude) to keep unambiguous these are the searcher's
  // position, not a candidate's, since u.latitude/u.longitude below refer
  // to the candidate row being filtered.
  viewerLat?: number | null;
  viewerLng?: number | null;
  radiusKm?: number | null;
}

export function buildSearchFilterSql(filters: SearchFilters): SQL {
  let filterSql = sql``;

  if (filters.ageMin) {
    const maxDob = new Date();
    maxDob.setFullYear(maxDob.getFullYear() - filters.ageMin);
    filterSql = sql`${filterSql} AND u.date_of_birth <= ${maxDob.toISOString()}`;
  }
  if (filters.ageMax) {
    const minDob = new Date();
    minDob.setFullYear(minDob.getFullYear() - filters.ageMax - 1);
    filterSql = sql`${filterSql} AND u.date_of_birth > ${minDob.toISOString()}`;
  }
  if (filters.heightMin) {
    filterSql = sql`${filterSql} AND p.height_cm >= ${filters.heightMin}`;
  }
  if (filters.heightMax) {
    filterSql = sql`${filterSql} AND p.height_cm <= ${filters.heightMax}`;
  }
  if (filters.cities && filters.cities.length > 0) {
    filterSql = sql`${filterSql} AND u.city IN (${sql.join(filters.cities.map(c => sql`${c}`), sql`, `)})`;
  }
  if (filters.education && filters.education.length > 0) {
    filterSql = sql`${filterSql} AND p.education IN (${sql.join(filters.education.map(e => sql`${e}`), sql`, `)})`;
  }
  if (filters.professions && filters.professions.length > 0) {
    filterSql = sql`${filterSql} AND p.profession IN (${sql.join(filters.professions.map(e => sql`${e}`), sql`, `)})`;
  }
  if (filters.familyExpectation) {
    // family_expectation/practice_level live on preferences (pr), not profiles (p) — this was
    // previously referencing a nonexistent p.family_expectation column and 500ing every time
    // this filter was actually used. buildBaseCandidateQuery now LEFT JOINs preferences as pr.
    filterSql = sql`${filterSql} AND pr.family_expectation = ${filters.familyExpectation}`;
  }
  if (filters.practiceLevel) {
    filterSql = sql`${filterSql} AND pr.practice_level = ${filters.practiceLevel}`;
  }
  if (filters.maritalStatus) {
    filterSql = sql`${filterSql} AND p.marital_status = ${filters.maritalStatus}`;
  }
  if (filters.willingToRelocate) {
    filterSql = sql`${filterSql} AND p.willing_to_relocate = true`;
  }
  if (filters.radiusKm != null && filters.viewerLat != null && filters.viewerLng != null) {
    // u.latitude IS NOT NULL guard runs first: in Postgres `false AND NULL`
    // is `false`, so candidates with no stored coordinates are deterministically
    // excluded rather than silently included via NULL propagation.
    // LEAST/GREATEST clamp the acos argument into [-1, 1] since floating-point
    // rounding can push it just outside that domain when two points are
    // extremely close, which would otherwise throw a Postgres runtime error.
    filterSql = sql`${filterSql}
      AND u.latitude IS NOT NULL AND u.longitude IS NOT NULL
      AND (
        6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(${filters.viewerLat})) * cos(radians(u.latitude)) *
            cos(radians(u.longitude) - radians(${filters.viewerLng})) +
            sin(radians(${filters.viewerLat})) * sin(radians(u.latitude))
          ))
        )
      ) <= ${filters.radiusKm}`;
  }

  return filterSql;
}
