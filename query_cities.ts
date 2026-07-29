import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const cities = await sql`SELECT DISTINCT city FROM users`;
  console.log('Distinct cities:', cities);
}

main().catch(console.error);
