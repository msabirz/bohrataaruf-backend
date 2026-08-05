import 'dotenv/config';
import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';

function isDuplicateError(e: any): boolean {
  const str = `${String(e)} ${e?.message || ''} ${e?.cause?.message || ''} ${e?.cause?.code || ''} ${e?.code || ''}`;
  return str.includes('already exists') || str.includes('duplicate_object') || str.includes('42710') || str.includes('42P07') || str.includes('42701');
}

async function main() {
  console.log('Running lifestyle traits migration...');

  try {
    await db.execute(sql`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "lifestyle_answers" jsonb;`);
    console.log('Added profiles.lifestyle_answers.');
  } catch (e: any) {
    throw e;
  }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "public"."lifestyle_trait_pairs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "slug" text NOT NULL,
        "question_label" text NOT NULL,
        "left_option_key" text NOT NULL,
        "left_option_label" text NOT NULL,
        "left_icon_mobile" text NOT NULL,
        "left_icon_web" text NOT NULL,
        "right_option_key" text NOT NULL,
        "right_option_label" text NOT NULL,
        "right_icon_mobile" text NOT NULL,
        "right_icon_web" text NOT NULL,
        "sort_order" integer DEFAULT 0 NOT NULL,
        "active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp DEFAULT now(),
        CONSTRAINT "lifestyle_trait_pairs_slug_unique" UNIQUE("slug")
      );
    `);
    console.log('Created lifestyle_trait_pairs table.');
  } catch (e: any) {
    if (!isDuplicateError(e)) throw e;
  }

  try {
    await db.execute(sql`
      INSERT INTO "lifestyle_trait_pairs"
        ("slug", "question_label", "left_option_key", "left_option_label", "left_icon_mobile", "left_icon_web", "right_option_key", "right_option_label", "right_icon_mobile", "right_icon_web", "sort_order")
      VALUES
        ('coffee_or_chai', 'Coffee or Chai?', 'coffee', 'Coffee', 'coffee', 'coffee', 'chai', 'Chai', 'custom:teacup', 'custom:teacup', 0),
        ('introvert_extrovert', 'Introvert or Extrovert?', 'introvert', 'Introvert', 'user', 'user', 'extrovert', 'Extrovert', 'users', 'users', 1),
        ('early_riser_night_owl', 'Early Riser or Night Owl?', 'early_riser', 'Early Riser', 'sunrise', 'sunrise', 'night_owl', 'Night Owl', 'moon', 'moon', 2),
        ('reader_storyteller', 'Reader or Storyteller?', 'reader', 'Reader', 'book', 'book', 'storyteller', 'Storyteller', 'mic', 'mic', 3),
        ('homebody_traveler', 'Homebody or Traveler?', 'homebody', 'Homebody', 'home', 'home', 'traveler', 'Traveler', 'send', 'plane', 4)
      ON CONFLICT ("slug") DO NOTHING;
    `);
    console.log('Seeded 5 initial lifestyle trait pairs.');
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
