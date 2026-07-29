import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Running contact_messages ticket-status migration...');

  // 1. Extend the enum by adding 'closed' value (idempotent in Postgres)
  await db.execute(sql`ALTER TYPE contact_message_status ADD VALUE IF NOT EXISTS 'closed'`);
  console.log('✅ Enum extended with "closed"');

  // 2. Add user_id column (FK to users)
  await db.execute(sql`ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE SET NULL`);
  console.log('✅ user_id column added');

  // 3. Add admin_reply_text column
  await db.execute(sql`ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS admin_reply_text text`);
  console.log('✅ admin_reply_text column added');

  // 4. Add replied_at column
  await db.execute(sql`ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS replied_at timestamptz`);
  console.log('✅ replied_at column added');

  // 5. Add support_alerts_enabled to push_preferences
  await db.execute(sql`ALTER TABLE push_preferences ADD COLUMN IF NOT EXISTS support_alerts_enabled boolean NOT NULL DEFAULT true`);
  console.log('✅ support_alerts_enabled column added to push_preferences');

  console.log('\n✅ All migrations complete.');
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
