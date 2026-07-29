import 'dotenv/config';
import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';

function isDuplicateError(e: any): boolean {
  const str = `${String(e)} ${e?.message || ''} ${e?.cause?.message || ''} ${e?.cause?.code || ''} ${e?.code || ''}`;
  return str.includes('already exists') || str.includes('duplicate_object') || str.includes('42710') || str.includes('42P07') || str.includes('42701');
}

async function main() {
  console.log('Running manual schema migrations...');

  try {
    await db.execute(sql`CREATE TYPE "public"."gender_route" AS ENUM('MALE', 'FEMALE', 'NEUTRAL');`);
    console.log('Created gender_route enum.');
  } catch (e: any) {
    if (!isDuplicateError(e)) throw e;
  }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "public"."alias_frameworks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "framework_name" text NOT NULL,
        "gender_route" "public"."gender_route" NOT NULL,
        "prefixes" jsonb NOT NULL,
        "suffixes" jsonb NOT NULL,
        "active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "uploaded_by" uuid
      );
    `);
    console.log('Created alias_frameworks table.');
  } catch (e: any) {
    if (!isDuplicateError(e)) throw e;
  }

  try {
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE "public"."alias_frameworks" ADD CONSTRAINT "alias_frameworks_uploaded_by_volunteers_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."volunteers"("id") ON DELETE set null ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('Added foreign key for alias_frameworks.');
  } catch (e: any) {
    throw e;
  }

  try {
    await db.execute(sql`ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "last_alias_regeneration_at" timestamp;`);
    console.log('Added last_alias_regeneration_at column.');
  } catch (e: any) {
    throw e;
  }

  try {
    await db.execute(sql`ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_alias_unique" UNIQUE ("alias");`);
    console.log('Added unique constraint to profiles.alias.');
  } catch (e: any) {
    if (!isDuplicateError(e)) throw e;
  }

  try {
    await db.execute(sql`ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "alias_regeneration_count" integer DEFAULT 0 NOT NULL;`);
    console.log('Added alias_regeneration_count column.');
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
