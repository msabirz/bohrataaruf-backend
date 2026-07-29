const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const res = await pool.query(`SELECT user_id, alias, bio_text, intro_line FROM profiles ORDER BY created_at DESC LIMIT 3`);
  console.log(res.rows);
  
  const chunks = await pool.query(`SELECT DISTINCT language FROM bio_chunks`);
  console.log('Bio chunk languages:', chunks.rows);
  
  const gu = await pool.query(`SELECT COUNT(*) FROM bio_chunks WHERE language = 'gu'`);
  const ur = await pool.query(`SELECT COUNT(*) FROM bio_chunks WHERE language = 'ur'`);
  const en = await pool.query(`SELECT COUNT(*) FROM bio_chunks WHERE language = 'en'`);
  
  console.log(`Counts: EN: ${en.rows[0].count}, GU: ${gu.rows[0].count}, UR: ${ur.rows[0].count}`);
  
  pool.end();
}
run();
