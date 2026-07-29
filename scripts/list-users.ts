import { db } from '../src/lib/db';
import { users } from '../src/lib/db/schema';

async function main() {
  // Check the raw table dump so we can just grab an id and use it to reset a password manually
  const allUsers = await db.select().from(users);
  
  console.log('--- ALL USERS DUMP ---');
  for (const user of allUsers) {
    if (user.passwordHash) {
       console.log(`ID: ${user.id} | Phone: ${user.phone}`);
    }
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
