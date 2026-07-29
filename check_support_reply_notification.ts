import { db } from './src/lib/db';
import { users, contactMessages, notificationsLog } from './src/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { POST as contactPost } from './src/app/api/marketing/contact/route';
import { GET as unreadCountGet } from './src/app/api/v1/notifications/unread-count/route';
import { sendPushNotification } from './src/lib/pushNotifications';

async function main() {
  console.log('--- DIAGNOSIS: Support Reply Notification ---');
  
  // 1. Pick a test user
  const user = await db.select({ id: users.id, name: users.name }).from(users).limit(1).then(r => r[0]);
  if (!user) throw new Error('No user found');
  console.log(`👤 Test User: ${user.id} (${user.name})`);

  // Clear previous notifications for this user
  await db.delete(notificationsLog).where(eq(notificationsLog.userId, user.id));

  // 2. Submit a support ticket via POST /api/marketing/contact
  console.log('👉 Submitting support ticket...');
  const submitRes = await contactPost(new Request('http://localhost/api/marketing/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      userId: user.id,
      name: user.name || 'Test User',
      email: 'test@support.org',
      subject: 'My ticket subject',
      message: 'Need help with account',
    }),
  }));
  const submitJson = await submitRes.json();
  console.log(`   - Ticket submitted: ${submitRes.status} | success: ${submitJson.success}`);

  // Fetch the ticket from DB
  const ticket = await db.select().from(contactMessages).where(eq(contactMessages.userId, user.id)).orderBy(desc(contactMessages.createdAt)).limit(1).then(r => r[0]);
  if (!ticket) throw new Error('No ticket found in DB');
  console.log(`   - Ticket ID: ${ticket.id}`);

  // 3. Simulate volunteer reply (directly invoke same push function as action route)
  console.log('👉 Simulating volunteer reply push trigger...');
  await sendPushNotification(
    ticket.userId!,
    'support_alerts',
    'Support replied to your ticket',
    `Your inquiry "${ticket.subject}" has been answered. Tap to view the reply.`,
    { screen: 'contact', ticketId: ticket.id },
  );

  // 4. Query notifications_log directly
  console.log('👉 Querying notifications_log from DB...');
  const rows = await db.select().from(notificationsLog).where(eq(notificationsLog.userId, user.id));
  console.log(`   - Found notifications count: ${rows.length}`);
  if (rows.length > 0) {
    const row = rows[0];
    console.log('   - ACTUAL DB ROW:');
    console.log(JSON.stringify(row, null, 2));
  } else {
    console.log('   ❌ No rows found in notifications_log!');
  }

  // 5. Call GET /api/v1/notifications/unread-count
  console.log('👉 Calling GET /api/v1/notifications/unread-count API...');
  const countRes = await unreadCountGet(new Request('http://localhost/api/v1/notifications/unread-count', {
    headers: { 'x-user-id': user.id },
  }));
  const countJson = await countRes.json();
  console.log('   - ACTUAL API RESPONSE:');
  console.log(JSON.stringify(countJson, null, 2));

  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
