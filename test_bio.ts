import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

async function run() {
  const res = await sql`SELECT user_id, alias, bio_text, intro_line FROM profiles WHERE bio_text IS NOT NULL LIMIT 5`;
  console.log('Profiles with bio:', res);
  process.exit(0);
}
run();
