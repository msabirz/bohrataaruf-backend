import { db } from './src/lib/db';
import { pushTokens, users, pushPreferences } from './src/lib/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const targetId = '4e214c55-bdf8-4f5f-b711-cc5e08db67f2';
  const prefs = await db.select().from(pushPreferences).where(eq(pushPreferences.userId, targetId));
  console.log('=== PUSH PREFERENCES ===');
  console.log(JSON.stringify(prefs, null, 2));

  console.log('\n=== PUSH TOKENS ===');
  const tokens = await db.select().from(pushTokens);
  console.log(JSON.stringify(tokens, null, 2));
  
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
