import { db } from './src/lib/db';
import { users, profiles } from './src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { TEST_FIXTURE_USER_ID, TEST_FIXTURE_USER_ID_2 } from './src/lib/testFixtures';

async function ensureFixture(id: string, phone: string, name: string, gender: 'male' | 'female') {
  const existing = await db.select().from(users).where(eq(users.id, id)).then(r => r[0]);

  if (existing) {
    console.log(`Fixture ${id} already exists:`, JSON.stringify(existing, null, 2));
    if (!existing.isTestAccount) {
      await db.update(users).set({ isTestAccount: true }).where(eq(users.id, id));
      console.log('Backfilled isTestAccount=true on existing fixture row.');
    }
    return;
  }

  const [user] = await db.insert(users).values({
    id,
    phone,
    name,
    gender,
    dateOfBirth: '2000-01-01',
    city: 'Test City',
    jamaat: 'Test',
    isActive: true,
    isTestAccount: true,
  }).returning();

  await db.insert(profiles).values({
    userId: id,
    alias: name,
  });

  console.log(`Created fixture ${id}:`, JSON.stringify(user, null, 2));
}

async function main() {
  await ensureFixture(TEST_FIXTURE_USER_ID, '0000000000', 'TEST FIXTURE ACCOUNT A - DO NOT USE FOR REAL DATA', 'male');
  await ensureFixture(TEST_FIXTURE_USER_ID_2, '0000000001', 'TEST FIXTURE ACCOUNT B - DO NOT USE FOR REAL DATA', 'female');
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
