export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

export function keysToCamelCase(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(keysToCamelCase);
  }

  return Object.keys(obj).reduce((acc: any, key: string) => {
    const camelKey = toCamelCase(key);
    acc[camelKey] = keysToCamelCase(obj[key]);
    return acc;
  }, {});
}
import { getViewUrl } from '@/lib/storage';
import { computeMatchScore } from '@/lib/matching';
import { resolvePhotoAccess } from '@/lib/photoAccess';

// dob is nullable now that onboarding no longer collects it up-front —
// null-guard rather than silently computing a nonsense ~56yo from
// `new Date(null)` (epoch).
export function computeAgeSafe(dobValue: unknown): number | null {
  if (!dobValue) return null;
  return Math.abs(new Date(Date.now() - new Date(dobValue as string).getTime()).getUTCFullYear() - 1970);
}

// Higher level serializers specifically for the contract
export async function serializeProfile(dbProfile: any, dbUser: any, dbPreferences?: any): Promise<any> {
  const base = {
    ...keysToCamelCase(dbUser),
    ...keysToCamelCase(dbProfile),
    photoUri: await getViewUrl(dbProfile.photoKey),
    bio: dbProfile.bioText, // Map explicit frontend 'bio' field
    // keysToCamelCase recurses into nested objects — lifestyleAnswers' inner
    // keys are lifestyleTraitPairs.slug values (e.g. "coffee_or_chai"), not
    // DB column names, so they must pass through unmangled or every client
    // lookup against the slug from GET /lifestyle-traits silently breaks.
    lifestyleAnswers: dbProfile.lifestyleAnswers ?? null,
  };
  
  // Calculate age if not present
  if (dbUser.dateOfBirth) {
    const dob = new Date(dbUser.dateOfBirth);
    const diff = Date.now() - dob.getTime();
    const age = Math.abs(new Date(diff).getUTCFullYear() - 1970);
    base.age = age;
    // Map dob correctly
    base.dob = dbUser.dateOfBirth;
  }
  
  if (dbPreferences) {
    base.preferences = {
      ageRange: {
        min: dbPreferences.ageMin,
        max: dbPreferences.ageMax,
      },
      cities: dbPreferences.preferredCities || [],
      education: dbPreferences.preferredEducation || [],
      professions: dbPreferences.preferredProfessions || [],
      practiceLevel: dbPreferences.practiceLevel,
      familyExpectation: dbPreferences.familyExpectation,
      partnerQualityTags: dbPreferences.partnerQualityTags || [],
      childrenAcceptance: dbPreferences.childrenAcceptance,
    };
  }
  
  return base;
}

export async function serializeInterestedProfile(row: any, viewerPrefs?: any, candidatePrefs?: any): Promise<any> {
  const age = computeAgeSafe(row.dob);
  
  let matchPercentage = undefined;
  if (viewerPrefs) {
    const { percentage } = computeMatchScore(viewerPrefs, { age, city: row.city }, { education: row.education, profession: row.profession, hasChildren: row.hasChildren }, candidatePrefs);
    matchPercentage = percentage;
  }

  // Routed through the same resolvePhotoAccess() every other candidate-serving
  // call site uses (see photoAccess.ts) — this used to hardcode the blurred
  // key unconditionally, which was actually wrong for 'always'-mode profiles
  // (should never be blurred) and never exposed viewsRemaining/request-status
  // for the Interests screen's own tap-to-view mechanic to work.
  const access = resolvePhotoAccess({
    photoPrivacyMode: row.photoPrivacyMode,
    photoUri: row.photoUri,
    photoUriBlurred: row.photoUriBlurred,
    viewsUsed: row.viewsUsed,
    extraViewRequested: row.extraViewRequested,
    extraViewApproved: row.extraViewApproved,
    extraViewApprovedUntil: row.extraViewApprovedUntil,
  });

  return {
    profileId: row.id,
    alias: row.alias,
    age,
    city: row.city,
    profession: row.profession,
    photoUri: await getViewUrl(access.photoKeyToServe),
    viewsRemaining: access.viewsRemaining,
    photoPrivacyMode: row.photoPrivacyMode,
    photoRequestStatus: access.photoRequestStatus,
    photoGrantedUntil: access.photoGrantedUntil,
    bio: row.bio,
    introLine: row.introLine,
    matchPercentage,
  };
}

export async function serializeMutualMatch(dbMatch: any, otherUser: any, otherProfile: any, myUserId: string, viewerPrefs?: any, candidatePrefs?: any): Promise<any> {
  // Determine whose status is A and B
  const amUserA = dbMatch.user_a === myUserId;
  const myStatus = amUserA ? dbMatch.handoff_a_status : dbMatch.handoff_b_status;
  const theirStatus = amUserA ? dbMatch.handoff_b_status : dbMatch.handoff_a_status;
  
  const myHandles = amUserA ? dbMatch.handoff_a_handles : dbMatch.handoff_b_handles;
  const theirHandles = amUserA ? dbMatch.handoff_b_handles : dbMatch.handoff_a_handles;

  let handoffStatus = 'action_required';
  if (myStatus === 'shared' && theirStatus === 'shared') {
    handoffStatus = 'complete';
  } else if (myStatus === 'shared') {
    handoffStatus = 'waiting_on_them';
  } else if (theirStatus === 'shared') {
    handoffStatus = 'waiting_on_me';
  }

  const age = computeAgeSafe(otherUser.date_of_birth);
  
  let matchPercentage = undefined;
  if (viewerPrefs) {
    const { percentage } = computeMatchScore(viewerPrefs, { age, city: otherUser.city }, { education: otherProfile.education, profession: otherProfile.profession, hasChildren: otherProfile.hasChildren }, candidatePrefs);
    matchPercentage = percentage;
  }

  return {
    matchId: dbMatch.id,
    profileId: otherUser.id,
    alias: otherProfile.alias,
    realName: otherUser.name,
    realPhotoUri: await getViewUrl(otherProfile.photoKey),
    bio: otherProfile.bio_text,
    age,
    city: otherUser.city,
    matchedAt: new Date(dbMatch.matched_at).toISOString(),
    handoffStatus,
    platformsSharedByMe: myHandles ? Object.keys(myHandles) : [],
    platformsSharedByThem: theirHandles ? Object.keys(theirHandles) : [],
    theirHandles: handoffStatus === 'complete' ? theirHandles : undefined,
    matchPercentage,
  };
}
