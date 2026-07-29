require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('Creating ENUM...');
    await sql`CREATE TYPE "public"."otp_purpose" AS ENUM('login', 'password_reset');`;
  } catch (e) {
    console.log('ENUM may already exist:', e.message);
  }
  
  try {
    console.log('Altering TABLE...');
    await sql`ALTER TABLE "otps" ADD COLUMN "purpose" "public"."otp_purpose" DEFAULT 'login' NOT NULL;`;
    console.log('Done.');
  } catch (e) {
    console.log('Column may already exist:', e.message);
  }
}

main();
