import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  const result = await db.execute(sql`SELECT * FROM profiles WHERE alias IN ('Gujrat2F', 'RashidaF')`);

  console.log('Profiles with mock HTTP URLs in photoKey:');
  console.log(result.rows);
  process.exit(0);
}

main().catch(console.error);
