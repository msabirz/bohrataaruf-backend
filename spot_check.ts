import { db } from './src/lib/db';
import { users, profiles } from './src/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

async function main() {
  const userIds = [
    'dc52ba64-522c-474f-a7fb-50cf79822aa9',
    'e2a2f249-32b7-449b-ac32-406b22d3a1a4',
    'aa56fa1d-4315-4da4-97e0-fa5bf5eeaeda',
    'e2f5529c-406f-49a2-857b-0cd2d9b2a1db'
  ];

  const results = await db
    .select({
      userId: users.id,
      realName: users.name,
      currentAlias: profiles.alias,
    })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .where(inArray(users.id, userIds));

  console.log('Spot Check Results:');
  results.forEach(m => {
    console.log(`- UserID: ${m.userId} | Real Name: ${m.realName} | Current Alias: ${m.currentAlias}`);
  });

  process.exit(0);
}

main().catch(console.error);
