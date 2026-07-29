import { db } from './src/lib/db/index';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';
config({ path: '.env.local' });

async function run() {
  const userId = 'c758c494-0ca4-496c-a748-b408b95bc5cf'; // Tester
  const targetId = 'e6f2491d-2475-4332-ad4a-32cfa687d1fb'; // Gujrat2F

  console.log(`\nTesting pair: User ${userId} <-> Target ${targetId}`);

  console.log('\n--- INTERACTIONS (BOTH WAYS) ---');
  const interactions = await db.execute(sql`
    SELECT * FROM interactions 
    WHERE (user_id = ${userId} AND target_id = ${targetId})
       OR (user_id = ${targetId} AND target_id = ${userId})
  `);
  console.log(Array.isArray(interactions) ? interactions : (interactions as any).rows);

  console.log('\n--- MATCHES ---');
  const matches = await db.execute(sql`
    SELECT * FROM matches
    WHERE (user_a = ${userId} AND user_b = ${targetId})
       OR (user_a = ${targetId} AND user_b = ${userId})
  `);
  console.log(Array.isArray(matches) ? matches : (matches as any).rows);
  
  // Also, query the user profile name for easier reading
  const names = await db.execute(sql`
    SELECT u.id, p.alias, u.gender FROM users u JOIN profiles p ON u.id = p.user_id 
    WHERE u.id IN (${userId}, ${targetId})
  `);
  console.log('\n--- NAMES & GENDER ---');
  console.log(Array.isArray(names) ? names : (names as any).rows);

  // Run getNextMatch for user
  const me = await db.execute(sql`SELECT gender FROM users WHERE id = ${userId}`);
  const meGender = (Array.isArray(me) ? me[0] : (me as any).rows[0]).gender;

  const getNextMatchQuery = sql`
    SELECT u.id, p.alias
    FROM users u
    JOIN profiles p ON u.id = p.user_id
    JOIN verifications v ON u.id = v.user_id
    WHERE u.id != ${userId}
      AND u.is_active = true
      AND u.gender IS DISTINCT FROM ${meGender}
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
  const result = await db.execute(getNextMatchQuery);
  const rows = Array.isArray(result) ? result : (result as any).rows;
  console.log('\n--- getNextMatch fresh results for User ---');
  console.log('Total candidates:', rows.length);
  console.log('Target in feed?', rows.some((r: any) => r.id === targetId));

  process.exit(0);
}
run();
