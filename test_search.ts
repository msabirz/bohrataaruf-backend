import { db } from './src/lib/db';
import { users, verifications, preferences, profiles } from './src/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { computeMatchScore } from './src/lib/matching';
import { buildBaseCandidateQuery } from './src/lib/db/queries';

async function main() {
  // Find a verified female to act as the viewer
  const viewer = await db.execute(sql`
    SELECT u.id, u.gender 
    FROM users u JOIN verifications v ON u.id = v.user_id 
    WHERE v.status = 'verified' AND u.gender = 'female' LIMIT 1
  `).then(res => (res as any).rows[0]);

  if (!viewer) {
    console.log("No viewer found");
    return process.exit(1);
  }
  
  console.log(`Viewer: ${viewer.id} (${viewer.gender})`);
  const myPrefs = await db.select().from(preferences).where(eq(preferences.userId, viewer.id)).limit(1).then(res => res[0]);
  if (!myPrefs) {
     console.log("Viewer has no preferences set, percentage might be 0");
  } else {
     console.log(`Viewer age range prefs: ${myPrefs.ageMin} - ${myPrefs.ageMax}`);
  }

  // 1. Test Pagination (Page 1 vs Page 2)
  const getPage = async (page: number) => {
    const limit = 2; // small limit to force multiple pages easily
    const offset = (page - 1) * limit;
    
    // broad search (no extra filters)
    const baseQuery = buildBaseCandidateQuery(viewer.id, viewer.gender);
    const query = sql`${baseQuery} LIMIT ${limit} OFFSET ${offset}`;
    
    const res: any = await db.execute(query);
    return res.rows || [];
  };

  const page1 = await getPage(1);
  const page2 = await getPage(2);
  
  console.log(`\n--- PAGINATION TEST (LIMIT=2) ---`);
  console.log(`Page 1 fetched ${page1.length} rows`);
  page1.forEach((r: any) => console.log(`  - Candidate: ${r.id}`));
  
  console.log(`Page 2 fetched ${page2.length} rows`);
  page2.forEach((r: any) => console.log(`  - Candidate: ${r.id}`));
  
  // Verify independence
  const overlap = page1.filter((r1: any) => page2.some((r2: any) => r2.id === r1.id));
  console.log(`Overlap between pages: ${overlap.length}`);
  
  if (page1.length === 0) {
     console.log("Not enough data to test percentage");
     return process.exit(0);
  }
  
  // 2. Test Match Percentage computation for a specific candidate from Page 1
  console.log(`\n--- PERCENTAGE TEST ---`);
  const row = page1[0];
  const age = Math.abs(new Date(Date.now() - new Date(row.dob).getTime()).getUTCFullYear() - 1970);
  const candidatePrefs = await db.select().from(preferences).where(eq(preferences.userId, row.id)).limit(1).then(res => res[0]);
  
  let percentage: number | null = null;
  if (myPrefs) {
    const score = computeMatchScore(
      myPrefs,
      { age, city: row.city },
      { education: row.education, profession: row.profession },
      candidatePrefs
    );
    percentage = score.percentage;
  }
  
  console.log(`Computed Percentage for ${row.id}: ${percentage}`);
  if (percentage === null) {
      console.log("WARNING: Percentage was strictly null");
  } else if (typeof percentage !== 'number') {
      console.log("WARNING: Percentage is not a number!");
  }

  process.exit(0);
}
main().catch(console.error);
