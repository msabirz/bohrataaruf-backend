import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  const r: any = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'biodata%'`);
  const rows = r?.rows ?? r;
  console.log('Biodata tables in DB:', JSON.stringify(rows));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
