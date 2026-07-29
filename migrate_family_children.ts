import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import { sql } from 'drizzle-orm';

function isDuplicateError(e: any): boolean {
  const str = `${String(e)} ${e?.message || ''} ${e?.cause?.message || ''} ${e?.cause?.code || ''} ${e?.code || ''}`;
  return str.includes('already exists') || str.includes('duplicate_object') || str.includes('42710') || str.includes('42P07') || str.includes('42701');
}

async function main() {
  const { db } = await import('./src/lib/db');
  console.log('Running schema migrations for Family & Children features...');

  // 1. Create Enums
  try {
    await db.execute(sql`CREATE TYPE "public"."children_living_status" AS ENUM('with_me', 'not_with_me', 'adults_independent');`);
    console.log('Created children_living_status enum.');
  } catch (e: any) {
    if (!isDuplicateError(e)) throw e;
    console.log('children_living_status enum already exists.');
  }

  try {
    await db.execute(sql`CREATE TYPE "public"."children_acceptance" AS ENUM('yes', 'open', 'prefer_not');`);
    console.log('Created children_acceptance enum.');
  } catch (e: any) {
    if (!isDuplicateError(e)) throw e;
    console.log('children_acceptance enum already exists.');
  }

  // 2. Add Sibling & Children Columns to Profiles
  try {
    await db.execute(sql`
      ALTER TABLE "public"."profiles"
        ADD COLUMN IF NOT EXISTS "brothers_count" integer DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "brothers_married_count" integer DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "sisters_count" integer DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "sisters_married_count" integer DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "has_children" boolean,
        ADD COLUMN IF NOT EXISTS "children_count" integer,
        ADD COLUMN IF NOT EXISTS "children_boys_count" integer,
        ADD COLUMN IF NOT EXISTS "children_girls_count" integer,
        ADD COLUMN IF NOT EXISTS "children_living_status" "public"."children_living_status";
    `);
    console.log('Added sibling and children columns to profiles.');
  } catch (e: any) {
    throw e;
  }

  // 3. Add Preference Column to Preferences
  try {
    await db.execute(sql`
      ALTER TABLE "public"."preferences"
        ADD COLUMN IF NOT EXISTS "children_acceptance" "public"."children_acceptance";
    `);
    console.log('Added children_acceptance column to preferences.');
  } catch (e: any) {
    throw e;
  }

  console.log('Family & Children schema migration complete!');
  process.exit(0);
}

main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
