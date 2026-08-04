import { db } from '@/lib/db';
import { getViewUrl } from '@/lib/storage';
import { verifications, preferences } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { computeMatchScore } from '@/lib/matching';
import { resolvePhotoAccess } from '@/lib/photoAccess';

export async function fetchRichCandidateProfile(viewerId: string, candidateId: string) {
  // Fetch requester verification status
  const myVerification = await db.select().from(verifications).where(eq(verifications.userId, viewerId)).limit(1).then(res => res[0]);
  const viewerVerificationStatus = myVerification ? myVerification.status : 'unsubmitted';
  const viewerIsVerified = viewerVerificationStatus === 'verified';

  const myPrefs = await db.select().from(preferences).where(eq(preferences.userId, viewerId)).limit(1).then(res => res[0]);

  const query = sql`
    SELECT 
      u.id, u.date_of_birth as "dob", u.city, 
      p.alias, p.education, p.profession, p.height_cm as "heightCm", p.bio_text as "bio", p.intro_line as "introLine", p.photo_key as "photoUri", p.photo_key_blurred as "photoUriBlurred",
      p.marital_status as "maritalStatus", p.willing_to_relocate as "willingToRelocate", p.field_of_study as "fieldOfStudy", u.jamaat,
      p.brothers_count as "brothersCount", p.brothers_married_count as "brothersMarriedCount",
      p.sisters_count as "sistersCount", p.sisters_married_count as "sistersMarriedCount",
      p.has_children as "hasChildren", p.children_count as "childrenCount",
      p.children_boys_count as "childrenBoysCount", p.children_girls_count as "childrenGirlsCount",
      p.children_living_status as "childrenLivingStatus",
      p.photo_privacy_mode as "photoPrivacyMode",
      COALESCE(pv.views_used, 0) as "viewsUsed",
      pv.extra_view_requested as "extraViewRequested",
      pv.extra_view_approved as "extraViewApproved",
      pv.extra_view_approved_until as "extraViewApprovedUntil"
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
    jamaat: row.jamaat,
    education: row.education,
    fieldOfStudy: row.fieldOfStudy,
    profession: row.profession,
    heightCm: row.heightCm,
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
    // Resolved per the owner's photo privacy mode — real key only for
    // `always` mode or an active request grant, blurred derivative
    // otherwise. (matches/[id] explicitly overrides this field with a real,
    // always-on URL afterward — that override is intentional and unaffected
    // by this.)
    photoUri: await getViewUrl(access.photoKeyToServe),
    viewsRemaining: access.viewsRemaining,
    photoPrivacyMode: row.photoPrivacyMode,
    photoRequestStatus: access.photoRequestStatus,
    photoGrantedUntil: access.photoGrantedUntil,
    matchPercentage: percentage,
    viewerIsVerified,
    viewerVerificationStatus,
    preferences: candidatePrefs,
  };
}
