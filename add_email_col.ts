import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Adding email column to users table if not exists...');
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;`);
  console.log('✅ Successfully added email column.');
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
