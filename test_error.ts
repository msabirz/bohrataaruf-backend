import { db } from './src/lib/db';
import { users } from './src/lib/db/schema';
import { hashItsNumber } from './src/lib/api/auth';

async function main() {
  console.log('Testing constraint violation...');
  
  // 1. Insert two users
  const [user1] = await db.insert(users).values({
    phone: 'TEST_PHONE_1_' + Date.now(),
    name: 'Test User 1',
    dateOfBirth: new Date('2000-01-01').toISOString(),
    city: 'Dubai',
    itsNumberHash: hashItsNumber('11111111'),
  }).returning();

  const [user2] = await db.insert(users).values({
    phone: 'TEST_PHONE_2_' + Date.now(),
    name: 'Test User 2',
    dateOfBirth: new Date('2000-01-01').toISOString(),
    city: 'Dubai',
    itsNumberHash: hashItsNumber('22222222'),
  }).returning();

  try {
    // Attempt to give user2 the same ITS number as user1
    await db.update(users)
      .set({ itsNumberHash: hashItsNumber('11111111') })
      .where({ id: user2.id });
  } catch (err: any) {
    console.log('--- ERROR CAUGHT ---');
    console.log('err.code:', err?.code);
    console.log('err.message:', err?.message);
    console.log('err properties:', Object.keys(err));
    console.log('JSON.stringify(err):', JSON.stringify(err, null, 2));
  }

  process.exit(0);
}

main().catch(console.error);
