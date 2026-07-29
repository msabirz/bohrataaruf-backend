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

// Higher level serializers specifically for the contract
export async function serializeProfile(dbProfile: any, dbUser: any, dbPreferences?: any): Promise<any> {
  const base = {
    ...keysToCamelCase(dbUser),
    ...keysToCamelCase(dbProfile),
    photoUri: await getViewUrl(dbProfile.photoKey),
    bio: dbProfile.bioText, // Map explicit frontend 'bio' field
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
  const age = Math.abs(new Date(Date.now() - new Date(row.dob).getTime()).getUTCFullYear() - 1970);
  
  let matchPercentage = undefined;
  if (viewerPrefs) {
    const { percentage } = computeMatchScore(viewerPrefs, { age, city: row.city }, { education: row.education, profession: row.profession, hasChildren: row.hasChildren }, candidatePrefs);
    matchPercentage = percentage;
  }

  return {
    profileId: row.id,
    alias: row.alias,
    age,
    city: row.city,
    profession: row.profession,
    photoUri: await getViewUrl(row.photoUri),
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

  const age = Math.abs(new Date(Date.now() - new Date(otherUser.date_of_birth).getTime()).getUTCFullYear() - 1970);
  
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
