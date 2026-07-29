import { db } from './src/lib/db';
import { users } from './src/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { GET } from './src/app/api/v1/matching/profile/[id]/route';

async function main() {
  // Pick a verified male candidate 
  const candidate = await db.execute(sql`
    SELECT u.id FROM users u
    JOIN verifications v ON u.id = v.user_id
    WHERE u.gender = 'male' AND v.status = 'verified'
    LIMIT 1
  `).then(res => (res as any).rows?.[0]);
  
  // Pick a verified female viewer
  const viewer = await db.execute(sql`
    SELECT u.id FROM users u
    JOIN verifications v ON u.id = v.user_id
    WHERE u.gender = 'female' AND v.status = 'verified'
    LIMIT 1
  `).then(res => (res as any).rows?.[0]);

  if (!candidate || !viewer) {
    console.log('Could not find test accounts');
    process.exit(1);
  }

  console.log(`Viewer: ${viewer.id}, Candidate: ${candidate.id}`);

  // Simulate the GET /matching/profile/[id] call
  const req = new Request(`http://localhost:3003/api/v1/matching/profile/${candidate.id}`, {
    headers: { 'x-user-id': viewer.id }
  });

  // We need to mock the params Promise
  const response = await GET(req, { params: Promise.resolve({ id: candidate.id }) });
  const json = await response.json();

  console.log('\n--- PROFILE DETAIL RESPONSE ---');
  console.log(`Status: ${response.status}`);
  if (response.status === 200) {
    console.log(`  profileId:        ${json.profileId}`);
    console.log(`  alias:            ${json.alias}`);
    console.log(`  age:              ${json.age}`);
    console.log(`  city:             ${json.city}`);
    console.log(`  education:        ${json.education}`);
    console.log(`  matchPercentage:  ${json.matchPercentage}%`);
    console.log(`  viewerIsVerified: ${json.viewerIsVerified}`);
    console.log(`  photoUri:         ${json.photoUri ? '[presigned URL present]' : 'MISSING'}`);
  } else {
    console.log('Error response:', json);
  }

  process.exit(0);
}
main().catch(console.error);
