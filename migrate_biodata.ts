import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Creating biodata_link_outcome enum...');
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "biodata_link_outcome" AS ENUM ('pending', 'viewed', 'expired_unviewed');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);

  console.log('Creating biodata_links table...');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "biodata_links" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
      "token" text NOT NULL UNIQUE,
      "created_at" timestamp DEFAULT now(),
      "expires_at" timestamp NOT NULL
    )
  `);

  console.log('Creating biodata_link_history table...');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "biodata_link_history" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "token_hash" text NOT NULL,
      "generated_at" timestamp DEFAULT now(),
      "expires_at" timestamp NOT NULL,
      "viewed_at" timestamp,
      "viewer_ip" text,
      "outcome" "biodata_link_outcome" DEFAULT 'pending' NOT NULL
    )
  `);

  console.log('Creating indexes...');
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "biodata_link_history_user_id_idx" ON "biodata_link_history" ("user_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "biodata_link_history_token_hash_idx" ON "biodata_link_history" ("token_hash")`);

  // Verify
  const r: any = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'biodata%'`);
  const rows = r?.rows ?? r;
  console.log('✓ Biodata tables now in DB:', JSON.stringify(rows));
  process.exit(0);
}
main().catch(e => { console.error('Migration failed:', e); process.exit(1); });
