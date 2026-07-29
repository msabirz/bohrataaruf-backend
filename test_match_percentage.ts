import { db } from './src/lib/db';
import { users, preferences, profiles } from './src/lib/db/schema';
import { computeMatchScore } from './src/lib/matching';

async function main() {
  // Get a couple of users
  const allPrefs = await db.select().from(preferences);
  const userWithPrefs = allPrefs.find(p => 
    p.ageMin != null && p.preferredCities != null && p.preferredCities.length > 0 && p.partnerQualityTags != null && p.partnerQualityTags.length > 0
  );

  if (!userWithPrefs) {
    console.log('No user found with populated preferences.');
    process.exit(0);
  }

  // FORCE populate education for the test viewer
  userWithPrefs.preferredEducation = ['B.Tech', 'MBBS'];

  const viewerId = userWithPrefs.userId;
  console.log(`Using viewer: ${viewerId}`);
  console.log('Viewer prefs:', userWithPrefs);

  const candidateId = allPrefs.find(p => p.userId !== viewerId)?.userId;
  if (!candidateId) {
    console.log('No candidate found.');
    process.exit(0);
  }

  const candidateUser = await db.select().from(users).where((u) => u.id === candidateId).limit(1).then(r => r[0]);
  const candidateProfile = await db.select().from(profiles).where((p) => p.userId === candidateId).limit(1).then(r => r[0]);
  const candidatePrefs = allPrefs.find(p => p.userId === candidateId);
  
  // Need age for candidate
  const age = Math.abs(new Date(Date.now() - new Date(candidateUser.dateOfBirth).getTime()).getUTCFullYear() - 1970);
  const candidateUserWithAge = { ...candidateUser, age };

  console.log('Candidate user data:', { age, city: candidateUserWithAge.city, education: candidateProfile.education, profession: candidateProfile.profession });
  console.log('Candidate prefs:', candidatePrefs);

  const score = computeMatchScore(userWithPrefs, candidateUserWithAge, candidateProfile, candidatePrefs);
  
  console.log('MATCH SCORE RESULT:');
  console.log(JSON.stringify(score, null, 2));

  process.exit(0);
}

main().catch(console.error);
