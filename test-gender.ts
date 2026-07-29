import { db } from './src/lib/db/index';
import { users } from './src/lib/db/schema';
import { config } from 'dotenv';
config({ path: '.env.local' });

async function run() {
  const allUsers = await db.select({ id: users.id, name: users.name, gender: users.gender }).from(users);
  console.log("ALL USERS:", allUsers);
  process.exit(0);
}
run();
