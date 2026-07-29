import { db } from './src/lib/db';
import { notificationsLog, contactMessages } from './src/lib/db/schema';
import { desc } from 'drizzle-orm';

async function main() {
  console.log('=== CURRENT DB NOTIFICATIONS ===');
  const notifs = await db.select().from(notificationsLog).orderBy(desc(notificationsLog.createdAt)).limit(10);
  console.log(JSON.stringify(notifs, null, 2));

  console.log('\n=== CURRENT CONTACT MESSAGES ===');
  const tickets = await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(5);
  console.log(JSON.stringify(tickets, null, 2));

  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
