import { db } from '@/lib/db';
import { verifications, preferences } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { computeMatchScore } from '@/lib/matching';

export async function fetchRichCandidateProfile(viewerId: string, candidateId: string) {
  // Fetch requester verification status
  const myVerification = await db.select().from(verifications).where(eq(verifications.userId, viewerId)).limit(1).then(res => res[0]);
  const viewerVerificationStatus = myVerification ? myVerification.status : 'unsubmitted';
  const viewerIsVerified = viewerVerificationStatus === 'verified';

  const myPrefs = await db.select().from(preferences).where(eq(preferences.userId, viewerId)).limit(1).then(res => res[0]);

  const query = sql`
    SELECT 
      u.id, u.date_of_birth as "dob", u.city, 
      p.alias, p.education, p.profession, p.bio_text as "bio", p.intro_line as "introLine", p.photo_key as "photoUri",
      p.marital_status as "maritalStatus", p.willing_to_relocate as "willingToRelocate", p.field_of_study as "fieldOfStudy", u.jamaat,
      p.brothers_count as "brothersCount", p.brothers_married_count as "brothersMarriedCount",
      p.sisters_count as "sistersCount", p.sisters_married_count as "sistersMarriedCount",
      p.has_children as "hasChildren", p.children_count as "childrenCount",
      p.children_boys_count as "childrenBoysCount", p.children_girls_count as "childrenGirlsCount",
      p.children_living_status as "childrenLivingStatus",
      COALESCE(pv.views_used, 0) as "viewsUsed"
    FROM users u
    JOIN profiles p ON u.id = p.user_id
    LEFT JOIN photo_views pv ON pv.viewer_id = ${viewerId} AND pv.profile_id = u.id
    WHERE u.id = ${candidateId}
  `;
  const rawResult: any = await db.execute(query);
  const rows = Array.isArray(rawResult) ? rawResult : (rawResult.rows || []);
  const row = rows[0];

  if (!row) {
    return null;
  }

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
    jamaat: row.jamaat,
    education: row.education,
    fieldOfStudy: row.fieldOfStudy,
    profession: row.profession,
    maritalStatus: row.maritalStatus,
    willingToRelocate: row.willingToRelocate,
    brothersCount: row.brothersCount,
    brothersMarriedCount: row.brothersMarriedCount,
    sistersCount: row.sistersCount,
    sistersMarriedCount: row.sistersMarriedCount,
    hasChildren: row.hasChildren,
    childrenCount: row.childrenCount,
    childrenBoysCount: row.childrenBoysCount,
    childrenGirlsCount: row.childrenGirlsCount,
    childrenLivingStatus: row.childrenLivingStatus,
    // Never the real photo in a browsing/pre-match context — only
    // POST /api/v1/matching/photo-view legitimately reveals it, gated by the 3-view cap.
    // (matches/[id] explicitly overrides this field with a real, always-on URL afterward —
    // that override is intentional and unaffected by this.)
    photoUri: null,
    viewsRemaining,
    matchPercentage: percentage,
    viewerIsVerified,
    viewerVerificationStatus,
    preferences: candidatePrefs,
  };
}
