import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  await sql`ALTER TABLE push_preferences ADD COLUMN IF NOT EXISTS security_alerts_enabled BOOLEAN DEFAULT true NOT NULL;`;
  console.log("Column added successfully");
}
main().catch(console.error);
