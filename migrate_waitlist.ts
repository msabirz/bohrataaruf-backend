import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

function isDuplicateError(e: any): boolean {
  const str = `${String(e)} ${e?.message || ''} ${e?.cause?.message || ''} ${e?.cause?.code || ''} ${e?.code || ''}`;
  return str.includes('already exists') || str.includes('duplicate_object') || str.includes('42710') || str.includes('42P07') || str.includes('42701');
}

async function main() {
  console.log('Running waitlist table migration...');

  const { db } = await import('./src/lib/db');
  const { sql } = await import('drizzle-orm');

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS waitlist (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        email text NOT NULL UNIQUE,
        city text,
        created_at timestamptz DEFAULT now()
      );
    `);
    console.log('waitlist table created (or already existed).');
  } catch (e: any) {
    if (!isDuplicateError(e)) throw e;
    console.log('waitlist table already exists, skipping.');
  }

  console.log('Done.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
