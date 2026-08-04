import 'dotenv/config';
import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';

function isDuplicateError(e: any): boolean {
  const str = `${String(e)} ${e?.message || ''} ${e?.cause?.message || ''} ${e?.cause?.code || ''} ${e?.code || ''}`;
  return str.includes('already exists') || str.includes('duplicate_object') || str.includes('42710') || str.includes('42P07') || str.includes('42701');
}

async function main() {
  console.log('Running photo privacy migration...');

  try {
    await db.execute(sql`CREATE TYPE "public"."photo_privacy_mode" AS ENUM('always', 'three_then_request', 'request_only', 'blur_until_match');`);
    console.log('Created photo_privacy_mode enum.');
  } catch (e: any) {
    if (!isDuplicateError(e)) throw e;
  }

  try {
    await db.execute(sql`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "photo_privacy_mode" "photo_privacy_mode" DEFAULT 'three_then_request' NOT NULL;`);
    console.log('Added profiles.photo_privacy_mode.');
  } catch (e: any) {
    throw e;
  }

  try {
    await db.execute(sql`ALTER TABLE "photo_views" ADD COLUMN IF NOT EXISTS "extra_view_approved_until" timestamptz;`);
    console.log('Added photo_views.extra_view_approved_until.');
  } catch (e: any) {
    throw e;
  }

  try {
    await db.execute(sql`ALTER TABLE "push_preferences" ADD COLUMN IF NOT EXISTS "photo_requests_enabled" boolean DEFAULT true NOT NULL;`);
    console.log('Added push_preferences.photo_requests_enabled.');
  } catch (e: any) {
    throw e;
  }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "public"."photo_privacy_gender_rules" (
        "gender" "public"."gender" PRIMARY KEY NOT NULL,
        "allowed_modes" "public"."photo_privacy_mode"[] NOT NULL,
        "default_mode" "public"."photo_privacy_mode" NOT NULL,
        "updated_at" timestamp
      );
    `);
    console.log('Created photo_privacy_gender_rules table.');
  } catch (e: any) {
    if (!isDuplicateError(e)) throw e;
  }

  try {
    await db.execute(sql`
      INSERT INTO "photo_privacy_gender_rules" ("gender", "allowed_modes", "default_mode") VALUES
        ('female', ARRAY['always','three_then_request','request_only','blur_until_match']::"public"."photo_privacy_mode"[], 'three_then_request'),
        ('male', ARRAY['always','request_only','blur_until_match']::"public"."photo_privacy_mode"[], 'request_only')
      ON CONFLICT ("gender") DO NOTHING;
    `);
    console.log('Seeded photo_privacy_gender_rules.');
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
