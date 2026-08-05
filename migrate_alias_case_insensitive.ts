import 'dotenv/config';
import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';

function isDuplicateError(e: any): boolean {
  const str = `${String(e)} ${e?.message || ''} ${e?.cause?.message || ''} ${e?.cause?.code || ''} ${e?.code || ''}`;
  return str.includes('already exists') || str.includes('duplicate_object') || str.includes('42710') || str.includes('42P07') || str.includes('42701');
}

async function main() {
  console.log('Running alias case-insensitivity migration...');

  // Two random generations (or a rename) could previously coexist as case
  // variants of the same alias (e.g. "Anon Star" / "anon star") — the
  // plain `profiles_alias_unique` constraint is case-sensitive. This
  // functional unique index closes that gap. Postgres raises the same
  // SQLSTATE 23505 for a violation here as for the plain constraint, so
  // the existing retry-on-23505 logic in alias/generate, basics, and
  // auth/signup already handles this correctly with no code changes.
  //
  // Any existing case-variant duplicates must be resolved before this
  // index can be created — check first rather than let it fail opaquely.
  const dupes: any = await db.execute(sql`
    SELECT lower(alias) as lower_alias, array_agg(alias) as variants, count(*)
    FROM profiles
    GROUP BY lower(alias)
    HAVING count(*) > 1
  `);
  const dupeRows = Array.isArray(dupes) ? dupes : dupes.rows;
  if (dupeRows.length > 0) {
    console.error('Existing case-variant alias duplicates found — resolve manually before re-running:', dupeRows);
    process.exit(1);
  }

  try {
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "profiles_alias_lower_unique" ON "profiles" (lower("alias"));`);
    console.log('Created case-insensitive unique index on profiles.alias.');
  } catch (e: any) {
    if (!isDuplicateError(e)) throw e;
  }

  console.log('Migration complete.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
