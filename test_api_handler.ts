import { db } from './src/lib/db';
import { users } from './src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { GET } from './src/app/api/v1/matching/search/route';

async function main() {
  const viewer = await db.select().from(users).where(eq(users.gender, 'female')).limit(1).then(res => res[0]);
  if (!viewer) return;
  
  // Create a mock NextRequest that passes the x-user-id header 
  // bypassing middleware since we're calling the route handler directly!
  const req = new Request('http://localhost:3003/api/v1/matching/search?page=1', {
    headers: { 'x-user-id': viewer.id }
  });
  
  const response = await GET(req);
  const json = await response.json();
  
  console.log('--- ROUTE HANDLER RESPONSE ---');
  console.log(`Status: ${response.status}`);
  console.log(`Candidates returned: ${json.candidates?.length || 0}`);
  if (json.candidates?.length > 0) {
     console.log('First Candidate Preview:');
     console.log(`  profileId: ${json.candidates[0].profileId}`);
     console.log(`  alias: ${json.candidates[0].alias}`);
     console.log(`  age: ${json.candidates[0].age}`);
     console.log(`  matchPercentage: ${json.candidates[0].matchPercentage}%`);
  }
  
  process.exit(0);
}
main().catch(console.error);
