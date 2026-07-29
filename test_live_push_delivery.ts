import { db } from './src/lib/db';
import { pushTokens, contactMessages } from './src/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { sendPushNotification } from './src/lib/pushNotifications';

async function main() {
  const targetUser = '4e214c55-bdf8-4f5f-b711-cc5e08db67f2'; // Moiz Shakir
  console.log(`📡 Sending Live Push Notification to User: ${targetUser}`);

  // Fetch their latest ticket
  const ticket = await db.select()
    .from(contactMessages)
    .where(eq(contactMessages.userId, targetUser))
    .orderBy(desc(contactMessages.createdAt))
    .limit(1)
    .then(r => r[0]);

  if (!ticket) throw new Error('No ticket found for target user');

  const ticketId = ticket.id;
  const subject = ticket.subject;

  console.log(`   - Ticket: "${subject}" (${ticketId})`);

  // Clear unread count for Moiz Shakir first so we can verify the change from 0 to 1
  await db.execute(sql`UPDATE notifications_log SET is_read = true WHERE user_id = ${targetUser}`);
  console.log('   - Cleared previous unread notifications in DB.');

  // Trigger push
  console.log('👉 Dispatched sendPushNotification...');
  await sendPushNotification(
    targetUser,
    'support_alerts',
    'Live Support Reply Test',
    `Your inquiry "${subject}" has a new reply.`,
    { screen: 'contact', ticketId },
  );

  console.log('\n✅ Push sent successfully to Expo servers.');
  process.exit(0);
}

import { sql } from 'drizzle-orm';
main().catch(e => {
  console.error('❌ Error during push delivery:', e);
  process.exit(1);
});
