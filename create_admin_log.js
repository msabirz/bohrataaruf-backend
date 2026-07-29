const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);
sql`CREATE TABLE IF NOT EXISTS admin_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id uuid REFERENCES volunteers(id) ON DELETE SET NULL,
  target_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action text NOT NULL,
  reason text,
  created_at timestamp DEFAULT now()
)`.then(() => console.log('Table created')).catch(console.error);
