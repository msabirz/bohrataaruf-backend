import 'dotenv/config';
import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';

function isDuplicateError(e: any): boolean {
  const str = `${String(e)} ${e?.message || ''} ${e?.cause?.message || ''} ${e?.cause?.code || ''} ${e?.code || ''}`;
  return str.includes('already exists') || str.includes('duplicate_object') || str.includes('42710') || str.includes('42P07') || str.includes('42701');
}

async function main() {
  console.log('Running Nearby Nudge migration...');

  try {
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS postgis;`);
    console.log('PostGIS extension enabled.');
  } catch (e: any) {
    if (!isDuplicateError(e)) throw e;
  }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "nearby_sessions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "is_visible" boolean DEFAULT false NOT NULL,
        "latitude" decimal(10,7) NOT NULL,
        "longitude" decimal(10,7) NOT NULL,
        "last_seen" timestamptz DEFAULT now(),
        "family_mode" boolean DEFAULT false NOT NULL,
        "expires_at" timestamptz NOT NULL DEFAULT (now() + interval '8 hours'),
        "created_at" timestamptz DEFAULT now(),
        CONSTRAINT "nearby_sessions_user_id_unique" UNIQUE ("user_id")
      );
    `);
    console.log('Created nearby_sessions table.');
  } catch (e: any) {
    if (!isDuplicateError(e)) throw e;
  }

  try {
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_nearby_sessions_geo"
        ON "nearby_sessions" USING GIST (geography(ST_MakePoint(longitude::float8, latitude::float8)));
    `);
    console.log('Created nearby_sessions geo GiST index.');
  } catch (e: any) {
    if (!isDuplicateError(e)) throw e;
  }

  try {
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_nearby_sessions_expires_at" ON "nearby_sessions" ("expires_at");`);
    console.log('Created nearby_sessions expires_at index.');
  } catch (e: any) {
    if (!isDuplicateError(e)) throw e;
  }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "nudges" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "from_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "to_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "status" text NOT NULL DEFAULT 'active' CHECK ("status" IN ('active','expired','declined')),
        "expires_at" timestamptz NOT NULL DEFAULT (now() + interval '8 hours'),
        "ended_by" uuid REFERENCES "users"("id"),
        "last_read_by_from" timestamptz,
        "last_read_by_to" timestamptz,
        "handoff_requested_by" uuid[] DEFAULT '{}',
        "created_at" timestamptz DEFAULT now()
      );
    `);
    console.log('Created nudges table.');
  } catch (e: any) {
    if (!isDuplicateError(e)) throw e;
  }

  try {
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_nudges_unique_pair"
        ON "nudges" (LEAST("from_user_id", "to_user_id"), GREATEST("from_user_id", "to_user_id"));
    `);
    console.log('Created nudges unique-pair index.');
  } catch (e: any) {
    if (!isDuplicateError(e)) throw e;
  }

  try {
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_nudges_to_user_id" ON "nudges" ("to_user_id");`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_nudges_from_user_id" ON "nudges" ("from_user_id");`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_nudges_status" ON "nudges" ("status");`);
    console.log('Created nudges lookup indexes.');
  } catch (e: any) {
    if (!isDuplicateError(e)) throw e;
  }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "nudge_messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "nudge_id" uuid NOT NULL REFERENCES "nudges"("id") ON DELETE CASCADE,
        "from_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "message" text NOT NULL,
        "created_at" timestamptz DEFAULT now()
      );
    `);
    console.log('Created nudge_messages table.');
  } catch (e: any) {
    if (!isDuplicateError(e)) throw e;
  }

  try {
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_nudge_messages_nudge_id" ON "nudge_messages" ("nudge_id", "created_at");`);
    console.log('Created nudge_messages index.');
  } catch (e: any) {
    if (!isDuplicateError(e)) throw e;
  }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "community_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name" text NOT NULL,
        "location_name" text,
        "latitude" decimal(10,7),
        "longitude" decimal(10,7),
        "radius_km" integer DEFAULT 1,
        "starts_at" timestamptz,
        "ends_at" timestamptz,
        "created_by" uuid REFERENCES "users"("id"),
        "is_active" boolean DEFAULT true,
        "created_at" timestamptz DEFAULT now()
      );
    `);
    console.log('Created community_events table.');
  } catch (e: any) {
    if (!isDuplicateError(e)) throw e;
  }

  try {
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_community_events_active_ends_at" ON "community_events" ("is_active", "ends_at");`);
    console.log('Created community_events index.');
  } catch (e: any) {
    if (!isDuplicateError(e)) throw e;
  }

  try {
    await db.execute(sql`ALTER TABLE "push_preferences" ADD COLUMN IF NOT EXISTS "nudges_enabled" boolean DEFAULT true NOT NULL;`);
    console.log('Added push_preferences.nudges_enabled.');
  } catch (e: any) {
    throw e;
  }

  console.log('Migration complete.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
