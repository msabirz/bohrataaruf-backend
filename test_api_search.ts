import { db } from './src/lib/db';
import { users } from './src/lib/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const viewer = await db.select().from(users).where(eq(users.gender, 'female')).limit(1).then(res => res[0]);
  if (!viewer) return;
  
  console.log(`Using viewer: ${viewer.id}`);
  const res = await fetch('http://localhost:3003/api/v1/matching/search?page=1', {
    headers: { 'x-user-id': viewer.id }
  });
  
  const json = await res.json();
  console.log('--- API RESPONSE ---');
  console.log(`Status: ${res.status}`);
  console.log(`Candidates returned: ${json.candidates?.length || 0}`);
  if (json.candidates?.length > 0) {
     console.log('First Candidate:', json.candidates[0]);
  } else {
     console.log('Response:', json);
  }
  
  process.exit(0);
}
main().catch(console.error);
