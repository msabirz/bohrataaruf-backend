import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';
async function main() {
  const res: any = await db.execute(sql`
    SELECT v.id, v.card_image_key, p.alias
    FROM verifications v
    LEFT JOIN profiles p ON v.user_id = p.user_id
    WHERE v.status = 'pending'
  `);
  console.log(res.rows);
  process.exit(0);
}
main();
