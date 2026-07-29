import { db } from './src/lib/db/index';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';
config({ path: '.env.local' });

async function run() {
  try {
    console.log("Attempting to add 'declined' to interaction_action...");
    await db.execute(sql`ALTER TYPE interaction_action ADD VALUE IF NOT EXISTS 'declined'`);
    console.log("ALTER TYPE successful.");
  } catch (error: any) {
    console.error("ALTER TYPE error:", error.message);
  }
  
  try {
    const result: any = await db.execute(sql`SELECT unnest(enum_range(NULL::interaction_action)) AS enum_value`);
    console.log("Current interaction_action enum values:");
    console.log(result.rows || result);
  } catch (error: any) {
    console.error("Verification error:", error.message);
  }
  process.exit(0);
}
run();
