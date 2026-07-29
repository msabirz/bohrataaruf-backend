import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  const cities = ['Indore', 'Bangalore'];
  try {
    const query = sql`SELECT id FROM users u WHERE u.city IN (${sql.join(cities.map(c => sql`${c}`), sql`, `)}) LIMIT 1`;
    console.log("query:", query);
    const res = await db.execute(query);
    console.log("Success", res);
  } catch (e) {
    console.error("Failed", e);
  }
  process.exit(0);
}
main();
