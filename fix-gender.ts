import { db } from './src/lib/db/index';
import { users } from './src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { config } from 'dotenv';
config({ path: '.env.local' });

async function run() {
  const targetId = 'e6f2491d-2475-4332-ad4a-32cfa687d1fb';
  await db.update(users).set({ gender: 'female' }).where(eq(users.id, targetId));
  const updated = await db.select({ name: users.name, gender: users.gender }).from(users).where(eq(users.id, targetId));
  console.log("UPDATED USER:", updated);
  process.exit(0);
}
run();
