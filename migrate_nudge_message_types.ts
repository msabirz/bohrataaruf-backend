import 'dotenv/config';
import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';

function isDuplicateError(e: any): boolean {
  const str = `${String(e)} ${e?.message || ''} ${e?.cause?.message || ''} ${e?.cause?.code || ''} ${e?.code || ''}`;
  return str.includes('already exists') || str.includes('duplicate_object') || str.includes('42710') || str.includes('42P07') || str.includes('42701');
}

async function main() {
  console.log('Running nudge_messages message-type migration...');

  const columns: [string, string][] = [
    ['message_type', "text NOT NULL DEFAULT 'text'"],
    ['contact_method', 'text'],
    ['latitude', 'numeric(10,7)'],
    ['longitude', 'numeric(10,7)'],
    ['deleted_at', 'timestamptz'],
  ];

  for (const [name, def] of columns) {
    try {
      await db.execute(sql.raw(`ALTER TABLE "nudge_messages" ADD COLUMN IF NOT EXISTS "${name}" ${def};`));
      console.log(`nudge_messages.${name} added.`);
    } catch (e: any) {
      if (!isDuplicateError(e)) throw e;
      console.log(`nudge_messages.${name} already exists, skipping.`);
    }
  }

  try {
    await db.execute(sql`
      ALTER TABLE "nudge_messages" ADD CONSTRAINT "nudge_messages_message_type_check"
      CHECK (message_type IN ('text', 'contact_share', 'location'));
    `);
    console.log('message_type CHECK constraint added.');
  } catch (e: any) {
    if (!isDuplicateError(e)) throw e;
    console.log('message_type CHECK constraint already exists, skipping.');
  }

  console.log('Migration complete.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
