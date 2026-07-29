import 'dotenv/config';
import { db } from './src/lib/db';
import { profiles, users } from './src/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { generateUniqueAlias } from './src/lib/alias-generator';

async function main() {
  const isExecute = process.argv.includes('--execute');

  // Get all users where alias matches their first name
  const affected = await db
    .select({
      userId: profiles.userId,
      firstName: users.name,
      alias: profiles.alias,
      gender: users.gender,
    })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .where(
      sql`lower(${profiles.alias}) = lower(split_part(${users.name}, ' ', 1))`
    );

  console.log(`Found ${affected.length} accounts needing alias migration.`);

  if (!isExecute) {
    console.log('Run with --execute to perform the migration.');
    return;
  }

  for (const acc of affected) {
    const userGender = (acc.gender || 'male') as 'male' | 'female';
    
    let finalAlias = undefined;
    for (let i = 0; i < 5; i++) {
      const candidate = await generateUniqueAlias(userGender);
      try {
        await db.update(profiles).set({ alias: candidate }).where(eq(profiles.userId, acc.userId));
        finalAlias = candidate;
        break;
      } catch (e: any) {
        if (e.code === '23505' || (e.message && e.message.includes('unique constraint'))) {
          continue;
        }
        throw e;
      }
    }
    
    if (!finalAlias) {
      const candidate = await generateUniqueAlias(userGender);
      const suffix = Math.floor(100 + Math.random() * 900);
      finalAlias = `${candidate} ${suffix}`;
      await db.update(profiles).set({ alias: finalAlias }).where(eq(profiles.userId, acc.userId));
    }
    
    console.log(`Migrated ${acc.userId}: ${acc.alias} -> ${finalAlias}`);
  }

  console.log('Migration complete.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
