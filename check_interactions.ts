import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  const viewerId = '5d577b4e-b3b9-4263-9d7b-873955d05d42';
  const candidateId = 'c758c494-0ca4-496c-a748-b408b95bc5cf';
  
  await db.execute(sql`DELETE FROM interactions WHERE user_id = ${viewerId} AND target_id = ${candidateId} AND action = 'skip'`);
  console.log('Deleted skip interaction');
}
main().catch(console.error).finally(() => process.exit(0));
