import { db } from '@/lib/db';
import { users, profiles, preferences, verifications } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface ProfileCompletionItem {
  field: string;
  label: string;
  completed: boolean;
  weight: number;
  tier: 1 | 2 | 3;
  route: string;
}

export interface ProfileCompletionResult {
  percentage: number;
  completedCount: number;
  applicableTotal: number;
  isComplete: boolean;
  missingFields: { field: string; label: string; route: string; weight: number }[];
  breakdown: ProfileCompletionItem[];
}

/**
 * Computes Profile Completion Percentage using Option A (Tiered Weighting, 100% total scale).
 * Tier 1: Core Essentials (40%)
 * Tier 2: Partner Preferences (40%)
 * Tier 3: Background & Details (20%) - 4 fields @ 5% for Never-Married, 5 fields @ 4% for Divorced/Widowed
 */
export function computeProfileCompletion(
  user: any,
  profile: any,
  prefs: any,
  verification: any
): ProfileCompletionResult {
  const isDivorcedOrWidowed = profile?.maritalStatus === 'divorced' || profile?.maritalStatus === 'widowed';
  const tier3Weight = isDivorcedOrWidowed ? (20 / 6) : 4;

  const breakdown: ProfileCompletionItem[] = [
    // --- TIER 1: CORE ESSENTIALS (40%) ---
    {
      field: 'photoUri',
      label: 'Profile Photo Uploaded',
      completed: !!(profile?.photoKey && profile.photoKey.trim() !== ''),
      weight: 15,
      tier: 1,
      route: '/account/edit',
    },
    {
      field: 'itsVerification',
      label: 'ITS Verification Submitted',
      completed: !!(verification && verification.status && verification.status !== 'unsubmitted' && verification.status !== 'none'),
      weight: 10,
      tier: 1,
      route: '/account/verification',
    },
    {
      field: 'bio',
      label: 'Bio Written (10+ characters)',
      completed: !!(profile?.bioText && profile.bioText.trim().length >= 10),
      weight: 10,
      tier: 1,
      route: '/account/edit',
    },
    {
      field: 'introLine',
      label: 'Intro Line / Tagline Set',
      completed: !!(profile?.introLine && profile.introLine.trim() !== ''),
      weight: 5,
      tier: 1,
      route: '/account/edit',
    },

    // --- TIER 2: PARTNER PREFERENCES (40%) ---
    {
      field: 'prefAgeRange',
      label: 'Preferred Age Range',
      completed: !!(prefs?.ageMin != null && prefs?.ageMax != null),
      weight: 5,
      tier: 2,
      route: '/onboarding/preferences',
    },
    {
      field: 'prefCities',
      label: 'Preferred Cities',
      completed: !!(prefs?.preferredCities && prefs.preferredCities.length > 0),
      weight: 5,
      tier: 2,
      route: '/onboarding/preferences',
    },
    {
      field: 'prefEducation',
      label: 'Preferred Education',
      completed: !!(prefs?.preferredEducation && prefs.preferredEducation.length > 0),
      weight: 5,
      tier: 2,
      route: '/onboarding/preferences',
    },
    {
      field: 'prefProfessions',
      label: 'Preferred Professions',
      completed: !!(prefs?.preferredProfessions && prefs.preferredProfessions.length > 0),
      weight: 5,
      tier: 2,
      route: '/onboarding/preferences',
    },
    {
      field: 'prefFamilySetup',
      label: 'Preferred Family Setup',
      completed: !!(prefs?.familyExpectation && prefs.familyExpectation.trim() !== ''),
      weight: 5,
      tier: 2,
      route: '/onboarding/preferences',
    },
    {
      field: 'prefPracticeLevel',
      label: 'Preferred Practice Level',
      completed: !!(prefs?.practiceLevel && prefs.practiceLevel.trim() !== ''),
      weight: 5,
      tier: 2,
      route: '/onboarding/preferences',
    },
    {
      field: 'prefQualityTags',
      label: 'Partner Quality Tags (Shared Values)',
      completed: !!(prefs?.partnerQualityTags && prefs.partnerQualityTags.length > 0),
      weight: 5,
      tier: 2,
      route: '/onboarding/preferences',
    },
    {
      field: 'prefChildrenAcceptance',
      label: 'Children Acceptance Preference',
      completed: !!(prefs?.childrenAcceptance && prefs.childrenAcceptance.trim() !== ''),
      weight: 5,
      tier: 2,
      route: '/onboarding/preferences',
    },

    // --- TIER 3: BACKGROUND & DETAILS (20%) ---
    {
      field: 'jamaat',
      label: 'Jamaat Specified',
      completed: !!((user?.jamaat && user.jamaat.trim() !== '') || (profile?.jamaat && profile.jamaat.trim() !== '')),
      weight: tier3Weight,
      tier: 3,
      route: '/account/edit',
    },
    {
      field: 'fieldOfStudy',
      label: 'Field of Study Specified',
      completed: !!(profile?.fieldOfStudy && profile.fieldOfStudy.trim() !== ''),
      weight: tier3Weight,
      tier: 3,
      route: '/account/edit',
    },
    {
      field: 'maritalStatus',
      label: 'Marital Status Detail',
      completed: !!(profile?.maritalStatus && profile.maritalStatus.trim() !== ''),
      weight: tier3Weight,
      tier: 3,
      route: '/account/edit',
    },
    {
      field: 'siblingsInfo',
      label: 'Siblings Information',
      completed: profile?.brothersCount != null || profile?.sistersCount != null,
      weight: tier3Weight,
      tier: 3,
      route: '/account/edit',
    },
    {
      field: 'email',
      label: 'Recovery Email Address Added',
      completed: !!(user?.email && user.email.trim() !== ''),
      weight: tier3Weight,
      tier: 3,
      route: '/account/edit',
    },
  ];

  // Conditional Children field for Divorced/Widowed users only
  if (isDivorcedOrWidowed) {
    breakdown.push({
      field: 'childrenInfo',
      label: 'Children Details',
      completed: profile?.hasChildren === false || (profile?.hasChildren === true && profile?.childrenCount != null && !!profile?.childrenLivingStatus),
      weight: tier3Weight,
      tier: 3,
      route: '/account/edit',
    });
  }

  let totalWeightCompleted = 0;
  let completedCount = 0;
  const applicableTotal = breakdown.length;
  const missingFields: { field: string; label: string; route: string; weight: number }[] = [];

  for (const item of breakdown) {
    if (item.completed) {
      completedCount++;
      totalWeightCompleted += item.weight;
    } else {
      missingFields.push({
        field: item.field,
        label: item.label,
        route: item.route,
        weight: item.weight,
      });
    }
  }

  const percentage = Math.min(100, Math.round(totalWeightCompleted));
  const isComplete = percentage === 100 && missingFields.length === 0;

  return {
    percentage,
    completedCount,
    applicableTotal,
    isComplete,
    missingFields,
    breakdown,
  };
}

export async function getProfileCompletion(userId: string): Promise<ProfileCompletionResult | null> {
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1).then(res => res[0]);
  const profile = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1).then(res => res[0]);
  const prefs = await db.select().from(preferences).where(eq(preferences.userId, userId)).limit(1).then(res => res[0]);
  const verification = await db.select().from(verifications).where(eq(verifications.userId, userId)).limit(1).then(res => res[0]);

  if (!user || !profile) {
    return null;
  }

  return computeProfileCompletion(user, profile, prefs, verification);
}
