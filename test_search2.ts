import { db } from './src/lib/db';
import { users, preferences } from './src/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { computeMatchScore } from './src/lib/matching';

async function main() {
  // Let's manually pick an arbitrary user with a gender and prefs
  const viewer = await db.select().from(users).where(eq(users.gender, 'female')).limit(1).then(res => res[0]);
  if (!viewer) return;
  
  const myPrefs = await db.select().from(preferences).where(eq(preferences.userId, viewer.id)).limit(1).then(res => res[0]);
  
  console.log(`Viewer: ${viewer.id} (${viewer.gender})`);
  console.log(`Viewer age range prefs: ${myPrefs?.ageMin} - ${myPrefs?.ageMax}`);

  const getPage = async (page: number) => {
    const limit = 2;
    const offset = (page - 1) * limit;
    
    // Simplest raw query to guarantee candidates: opposite gender, limit, offset
    const query = sql`
      SELECT u.id, u.date_of_birth as "dob", u.city, p.education, p.profession
      FROM users u
      JOIN profiles p ON u.id = p.user_id
      WHERE u.id != ${viewer.id} AND u.gender IS DISTINCT FROM ${viewer.gender}
      LIMIT ${limit} OFFSET ${offset}
    `;
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
  
  const overlap = page1.filter((r1: any) => page2.some((r2: any) => r2.id === r1.id));
  console.log(`Overlap between pages: ${overlap.length}`);
  
  if (page1.length > 0) {
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
    console.log(`Computed Percentage for ${row.id}: ${percentage}%`);
  }

  process.exit(0);
}
main().catch(console.error);
