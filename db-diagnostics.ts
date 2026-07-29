import { db } from './src/lib/db/index';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';
config({ path: '.env.local' });

async function run() {
  console.log('--- WITHDRAWAL LOGS ---');
  const logResult = await db.execute(sql`SELECT * FROM withdrawal_log`);
  const logs = Array.isArray(logResult) ? logResult : (logResult as any).rows;
  console.log(logs);

  if (logs && logs.length > 0) {
    const userId = logs[0].user_id;
    const targetId = logs[0].target_id;
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
      SELECT u.id, p.alias FROM users u JOIN profiles p ON u.id = p.user_id 
      WHERE u.id IN (${userId}, ${targetId})
    `);
    console.log('\n--- NAMES ---');
    console.log(Array.isArray(names) ? names : (names as any).rows);
  }

  process.exit(0);
}
run();
