import { db } from './src/lib/db/index';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';
config({ path: '.env.local' });

async function run() {
  const gender = 'male';
  const query = sql`SELECT id, name, gender, (gender IS DISTINCT FROM ${gender}) as is_distinct FROM users`;
  const result: any = await db.execute(query);
  console.log(result.rows ? result.rows : result);
  process.exit(0);
}
run();
