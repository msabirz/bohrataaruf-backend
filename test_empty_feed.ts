import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  const unverifiedUsersRes: any = await db.execute(sql`
    SELECT u.id, u.gender, v.status as verification_status
    FROM users u
    LEFT JOIN verifications v ON u.id = v.user_id
    WHERE v.status IS DISTINCT FROM 'verified'
  `);
  
  const unverifiedUsers = unverifiedUsersRes.rows || [];
  console.log(`Found ${unverifiedUsers.length} unverified users`);

  for (const u of unverifiedUsers) {
    const userId = u.id;
    console.log(`\nUser: ${userId}, Gender: ${u.gender}, VStatus: ${u.verification_status}`);
    
    if (!u.gender) {
        console.log(`  -> WARNING: NULL gender! This user hits the 400 'Incomplete profile: missing gender' error in getNextMatch.`);
    }

    // Run the actual getNextMatch baseQuery
    const query = sql`
      SELECT u.id
      FROM users u
      JOIN profiles p ON u.id = p.user_id
      JOIN verifications v ON u.id = v.user_id
      WHERE u.id != ${userId}
        AND u.is_active = true
        AND u.gender IS DISTINCT FROM ${u.gender}
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
    `;
    const rowsRes: any = await db.execute(query);
    const rows = rowsRes.rows || [];
    console.log(`  -> Available verified candidates of opposite gender (ignoring prefs): ${rows.length}`);
  }
  process.exit(0);
}
main().catch(console.error);
