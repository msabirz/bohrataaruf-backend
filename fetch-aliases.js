require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const result = await sql`SELECT u.name, p.alias FROM profiles p JOIN users u ON p.user_id = u.id WHERE u.name != 'New User' LIMIT 5;`;
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(e);
  }
}

main();
