import { db } from '../src/lib/db';
import { users } from '../src/lib/db/schema';
import crypto from 'crypto';

async function main() {
  const defaultPassword = 'password123';
  const newHash = crypto.createHash('sha256').update(defaultPassword).digest('hex');
  
  console.log(`Resetting all user passwords to: ${defaultPassword}`);
  
  await db.update(users).set({ passwordHash: newHash });
  
  console.log('All passwords have been reset successfully!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
