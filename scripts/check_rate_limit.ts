import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const recentInteractions = await sql`
    SELECT id, action, created_at, user_id 
    FROM interactions 
    ORDER BY created_at DESC 
    LIMIT 15
  `;

  console.log("\n====== RECENT DB INTERACTIONS (Newest First) ======");
  recentInteractions.forEach(i => {
    console.log(`- Action: ${String(i.action).padEnd(12)} | Time: ${new Date(i.created_at).toISOString()} | Actor: ${i.user_id.substring(0,8)}...`);
  });
  console.log("===================================================\n");
}

main().catch(console.error);
