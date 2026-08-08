import 'dotenv/config';
import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';

function isDuplicateError(e: any): boolean {
  const str = `${String(e)} ${e?.message || ''} ${e?.cause?.message || ''} ${e?.cause?.code || ''} ${e?.code || ''}`;
  return str.includes('already exists') || str.includes('duplicate_object') || str.includes('42710') || str.includes('42P07') || str.includes('42701');
}

async function main() {
  console.log('Running nudge_expiry_notified_at migration...');

  try {
    await db.execute(sql`ALTER TABLE "nudges" ADD COLUMN IF NOT EXISTS "nudge_expiry_notified_at" timestamptz;`);
    console.log('nudges.nudge_expiry_notified_at added.');
  } catch (e: any) {
    if (!isDuplicateError(e)) throw e;
    console.log('nudges.nudge_expiry_notified_at already exists, skipping.');
  }

  console.log('Migration complete.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
