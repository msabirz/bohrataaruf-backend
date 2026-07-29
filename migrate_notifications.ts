import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Running notifications_log migration...');

  // 1. Create the notifications_log table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notifications_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type varchar(50) NOT NULL,
      title text NOT NULL,
      body text NOT NULL,
      related_id uuid,
      is_read boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  console.log('✅ Created notifications_log table');

  // 2. Create index for fast unread check & count queries
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications_log(user_id, is_read)
  `);
  console.log('✅ Created idx_notifications_user_unread index');

  console.log('\n✅ All migrations complete.');
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
