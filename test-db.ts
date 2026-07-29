import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  const query = sql`
    SELECT 
      p.photo_key as "photoUri",
      p.photo_key as photo_key_unquoted
    FROM profiles p
    LIMIT 1
  `;
  const result: any = await db.execute(query);
  console.log(result);
  process.exit(0);
}
main();
