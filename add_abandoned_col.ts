import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('--- ADDING abandoned_at COLUMN TO users TABLE ---');
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS abandoned_at TIMESTAMP;`);
  console.log('✅ Column abandoned_at added successfully!');
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
