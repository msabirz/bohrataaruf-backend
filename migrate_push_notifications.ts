import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Creating push_tokens and push_preferences tables...');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "push_tokens" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
      "token" text NOT NULL,
      "platform" text NOT NULL,
      "created_at" timestamp DEFAULT now(),
      CONSTRAINT "push_tokens_token_unique" UNIQUE("token")
    )
  `);
  console.log('✓ Created push_tokens table.');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "push_preferences" (
      "user_id" uuid PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE cascade,
      "matches_enabled" boolean DEFAULT true NOT NULL,
      "received_interests_enabled" boolean DEFAULT true NOT NULL,
      "verification_updates_enabled" boolean DEFAULT true NOT NULL,
      "handoff_updates_enabled" boolean DEFAULT true NOT NULL
    )
  `);
  console.log('✓ Created push_preferences table.');

  console.log('Migration complete!');
  process.exit(0);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
