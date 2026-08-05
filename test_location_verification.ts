import { db } from './src/lib/db';
import { users } from './src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { TEST_FIXTURE_USER_ID } from './src/lib/testFixtures';
import { BasicsSchema } from './src/lib/api/validators';

async function main() {
  console.log('================================================================');
  console.log('   REAL VERIFICATION: LOCATION (latitude/longitude) FEATURE     ');
  console.log('================================================================\n');

  const parsed = BasicsSchema.safeParse({ gender: 'male', latitude: 19.0760, longitude: 72.8777 });
  console.log('BasicsSchema parses valid lat/long:', parsed.success);

  const rejected = BasicsSchema.safeParse({ gender: 'male', latitude: 999, longitude: 72.8777 });
  console.log('BasicsSchema rejects out-of-range latitude=999 (expect false):', rejected.success);

  await db.update(users).set({ latitude: 19.0760, longitude: 72.8777 }).where(eq(users.id, TEST_FIXTURE_USER_ID));
  const afterWrite = await db.select({ latitude: users.latitude, longitude: users.longitude }).from(users).where(eq(users.id, TEST_FIXTURE_USER_ID)).then(r => r[0]);
  console.log('After write, read back via Drizzle:', afterWrite);

  await db.update(users).set({ latitude: null, longitude: null }).where(eq(users.id, TEST_FIXTURE_USER_ID));
  const afterClear = await db.select({ latitude: users.latitude, longitude: users.longitude }).from(users).where(eq(users.id, TEST_FIXTURE_USER_ID)).then(r => r[0]);
  console.log('After explicit null write, read back via Drizzle:', afterClear);

  console.log('\n================================================================');
  process.exit(0);
}

main().catch(e => { console.error('ERR', e); process.exit(1); });
