import { db } from './src/lib/db';
import { users, verifications, preferences, profiles } from './src/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { computeMatchScore } from './src/lib/matching';

async function main() {
  const userId = 'dfd83787-87dd-4a8d-9004-6ffa2de87078';
  console.log(`Debugging getNextMatch for user: ${userId}`);

  // 1. Check me
  const me = await db.select({ gender: users.gender }).from(users).where(eq(users.id, userId)).limit(1).then(res => res[0]);
  if (!me || !me.gender) {
    console.log('Error: missing gender');
    return process.exit(1);
  }
  console.log(`Viewer gender: ${me.gender}`);

  // 2. Base Query
  const baseQuery = sql`
    SELECT 
      u.id, u.date_of_birth as "dob", u.city, 
      p.alias, p.education, p.profession, p.bio_text as "bio", p.intro_line as "introLine", p.photo_key as "photoUri",
      COALESCE(pv.views_used, 0) as "viewsUsed"
    FROM users u
    JOIN profiles p ON u.id = p.user_id
    JOIN verifications v ON u.id = v.user_id
    LEFT JOIN photo_views pv ON pv.viewer_id = ${userId} AND pv.profile_id = u.id
    WHERE u.id != ${userId}
      AND u.is_active = true
      AND u.gender IS DISTINCT FROM ${me.gender}
      AND v.status = 'verified'
      AND NOT EXISTS (
        SELECT 1 FROM interactions i WHERE i.user_id = ${userId} AND i.target_id = u.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM interactions their_i WHERE their_i.user_id = u.id AND their_i.target_id = ${userId} AND their_i.action = 'interested'
      )
      AND NOT EXISTS (
        SELECT 1 FROM matches m WHERE (m.user_a = ${userId} AND m.user_b = u.id) OR (m.user_a = u.id AND m.user_b = ${userId})
      )
      AND NOT EXISTS (
        SELECT 1 FROM withdrawal_log wl 
        WHERE wl.user_id = ${userId} 
          AND wl.target_id = u.id 
          AND wl.withdrawn_count >= 3 
          AND wl.last_withdrawn_at > now() - interval '7 days'
      )
  `;

  const myPrefs = await db.select().from(preferences).where(eq(preferences.userId, userId)).limit(1).then(res => res[0]);
  let strictFilterSql = sql``;
    
  if (myPrefs) {
    if (myPrefs.ageMin) {
      const maxDob = new Date();
      maxDob.setFullYear(maxDob.getFullYear() - myPrefs.ageMin);
      strictFilterSql = sql`${strictFilterSql} AND u.date_of_birth <= ${maxDob.toISOString()}`;
    }
    if (myPrefs.ageMax) {
      const minDob = new Date();
      minDob.setFullYear(minDob.getFullYear() - myPrefs.ageMax - 1);
      strictFilterSql = sql`${strictFilterSql} AND u.date_of_birth > ${minDob.toISOString()}`;
    }
    if (myPrefs.preferredCities && myPrefs.preferredCities.length > 0) {
      strictFilterSql = sql`${strictFilterSql} AND u.city = ANY(${myPrefs.preferredCities})`;
    }
    if (myPrefs.preferredEducation && myPrefs.preferredEducation.length > 0) {
      strictFilterSql = sql`${strictFilterSql} AND p.education = ANY(${myPrefs.preferredEducation})`;
    }
  }

  const strictQuery = sql`${baseQuery} ${strictFilterSql} LIMIT 1`;
  const rawStrictResult: any = await db.execute(strictQuery);
  const strictRows = Array.isArray(rawStrictResult) ? rawStrictResult : (rawStrictResult.rows || []);
  let result = strictRows[0];

  console.log(`Strict query rows: ${strictRows.length}`);

  if (!result) {
    const looseQuery = sql`${baseQuery} LIMIT 1`;
    const rawLooseResult: any = await db.execute(looseQuery);
    const looseRows = Array.isArray(rawLooseResult) ? rawLooseResult : (rawLooseResult.rows || []);
    result = looseRows[0];
    console.log(`Loose query rows: ${looseRows.length}`);
  }

  if (!result) {
    console.log('Result: 404 No more candidates available.');
    process.exit(0);
  }

  console.log(`Found candidate: ${result.id}`);
  
  // Try mapping the result to payload to see if any JS error occurs (e.g., math on null)
  try {
    const age = Math.abs(new Date(Date.now() - new Date(result.dob).getTime()).getUTCFullYear() - 1970);
    const viewsRemaining = Math.max(0, 3 - result.viewsUsed);
    const candidatePrefs = await db.select().from(preferences).where(eq(preferences.userId, result.id)).limit(1).then(res => res[0]);
    
    // Notice this: if computeMatchScore throws, it will be caught here!
    const { percentage } = computeMatchScore(
      myPrefs,
      { age, city: result.city },
      { education: result.education, profession: result.profession },
      candidatePrefs
    );
    console.log(`Payload mapping succeeded! Match percentage: ${percentage}`);
  } catch (e) {
    console.error(`ERROR computing payload!`, e);
  }
  process.exit(0);
}
main().catch(console.error);
