import 'dotenv/config';
import { db } from './src/lib/db';
import { users, profiles } from './src/lib/db/schema';
import { eq, sql, and, notLike } from 'drizzle-orm';

async function main() {
  const result = await db
    .select({
      userId: users.id,
      name: users.name,
      alias: profiles.alias,
    })
    .from(users)
    .innerJoin(profiles, eq(users.id, profiles.userId))
    .where(
      and(
        sql`split_part(${users.name}, ' ', 1) = ${profiles.alias}`,
        notLike(users.name, '%Test%'),
        notLike(users.name, '%test%')
      )
    );

  console.log(`Found ${result.length} non-test accounts with alias matching first name.`);
  process.exit(0);
}

main().catch(console.error);
