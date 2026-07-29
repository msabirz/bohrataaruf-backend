import { preferences, profiles, users } from '@/lib/db/schema';

export interface CriterionResult {
  criterion: string;
  matched: boolean;
  detail?: string;
}

export interface MatchScoreResult {
  percentage: number | null;
  breakdown: CriterionResult[];
}

/**
 * Computes a compatibility percentage comparing the VIEWER's preferences against the CANDIDATE's actual profile/prefs data.
 * Skips unset preferences entirely so they don't dilute the score.
 */
export function computeMatchScore(
  viewerPrefs: Partial<typeof preferences.$inferSelect> | null | undefined,
  candidateUser: any,
  candidateProfile: any,
  candidatePrefs: Partial<typeof preferences.$inferSelect> | null | undefined
): MatchScoreResult {
  if (!viewerPrefs) return { percentage: null, breakdown: [] };

  const breakdown: CriterionResult[] = [];
  let evaluatedCount = 0;
  let matchedPoints = 0;

  // 1. Age Range
  if (viewerPrefs.ageMin != null && viewerPrefs.ageMax != null) {
    evaluatedCount++;
    const matched = candidateUser.age != null && candidateUser.age >= viewerPrefs.ageMin && candidateUser.age <= viewerPrefs.ageMax;
    if (matched) matchedPoints++;
    breakdown.push({
      criterion: 'Age range',
      matched,
    });
  }

  // 2. City
  if (viewerPrefs.preferredCities && viewerPrefs.preferredCities.length > 0) {
    evaluatedCount++;
    const matched = !!candidateUser.city && viewerPrefs.preferredCities.includes(candidateUser.city);
    if (matched) matchedPoints++;
    breakdown.push({
      criterion: 'City',
      matched,
    });
  }

  // 3. Education
  if (viewerPrefs.preferredEducation && viewerPrefs.preferredEducation.length > 0) {
    evaluatedCount++;
    const matched = !!candidateProfile.education && viewerPrefs.preferredEducation.includes(candidateProfile.education);
    if (matched) matchedPoints++;
    breakdown.push({
      criterion: 'Education',
      matched,
    });
  }

  // 4. Profession
  if (viewerPrefs.preferredProfessions && viewerPrefs.preferredProfessions.length > 0) {
    evaluatedCount++;
    const matched = !!candidateProfile.profession && viewerPrefs.preferredProfessions.includes(candidateProfile.profession);
    if (matched) matchedPoints++;
    breakdown.push({
      criterion: 'Profession',
      matched,
    });
  }

  // 5. Family Expectation
  if (viewerPrefs.familyExpectation) {
    evaluatedCount++;
    const matched = !!candidatePrefs?.familyExpectation && viewerPrefs.familyExpectation === candidatePrefs.familyExpectation;
    if (matched) matchedPoints++;
    breakdown.push({
      criterion: 'Family expectation',
      matched,
    });
  }

  // 6. Practice Level
  if (viewerPrefs.practiceLevel) {
    evaluatedCount++;
    const matched = !!candidatePrefs?.practiceLevel && viewerPrefs.practiceLevel === candidatePrefs.practiceLevel;
    if (matched) matchedPoints++;
    breakdown.push({
      criterion: 'Practice level',
      matched,
    });
  }

  // 7. Partner Quality Tags (Shared Values)
  if (viewerPrefs.partnerQualityTags && viewerPrefs.partnerQualityTags.length > 0) {
    evaluatedCount++;
    const viewerTags = viewerPrefs.partnerQualityTags;
    const candidateTags = candidatePrefs?.partnerQualityTags || [];
    
    let overlapCount = 0;
    for (const tag of candidateTags) {
      if (viewerTags.includes(tag)) overlapCount++;
    }

    const fraction = overlapCount / viewerTags.length;
    matchedPoints += fraction;
    
    breakdown.push({
      criterion: 'Shared values',
      matched: fraction >= 0.5,
      detail: `${overlapCount} of ${viewerTags.length} matched`
    });
  }

  // 8. Children Acceptance
  if (viewerPrefs.childrenAcceptance && candidateProfile?.hasChildren === true) {
    if (viewerPrefs.childrenAcceptance === 'prefer_not') {
      // 2x penalty weight without hard exclusion
      evaluatedCount += 2;
      matchedPoints += 0;
      breakdown.push({
        criterion: 'Children acceptance',
        matched: false,
        detail: 'Prefers no children'
      });
    } else if (viewerPrefs.childrenAcceptance === 'yes') {
      evaluatedCount += 1;
      matchedPoints += 1;
      breakdown.push({
        criterion: 'Children acceptance',
        matched: true,
      });
    } else if (viewerPrefs.childrenAcceptance === 'open') {
      evaluatedCount += 1;
      matchedPoints += 0.8;
      breakdown.push({
        criterion: 'Children acceptance',
        matched: true,
        detail: 'Open to children'
      });
    }
  }

  if (evaluatedCount === 0) {
    return { percentage: null, breakdown: [] };
  }

  const percentage = Math.round((matchedPoints / evaluatedCount) * 100);
  return { percentage, breakdown };
}
