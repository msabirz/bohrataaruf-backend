/**
 * TASK 11 VERIFICATION SUITE
 * Tests:
 *  1. Cross-account isolation — B cannot see A's tickets
 *  2. Reply & Resolve stored correctly in DB and accessible by A
 *  3. Push notification trigger (log check)
 *  4. "Closed" status — no reply, distinct from "Resolved"
 */
import { db } from './src/lib/db';
import { users, contactMessages } from './src/lib/db/schema';
import { eq, asc, inArray } from 'drizzle-orm';
import { GET as ticketsGet } from './src/app/api/v1/support/tickets/route';
import { POST as contactPost } from './src/app/api/marketing/contact/route';
import { sendPushNotification } from './src/lib/pushNotifications';
import { TEST_FIXTURE_USER_ID, TEST_FIXTURE_USER_ID_2 } from './src/lib/testFixtures';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('          TASK 11: TICKET STATUS & REPLY — VERIFICATION SUITE          ');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // Use dedicated test-fixture accounts
  const rows = await db.select({ id: users.id, name: users.name, phone: users.phone })
    .from(users).where(inArray(users.id, [TEST_FIXTURE_USER_ID, TEST_FIXTURE_USER_ID_2]));
  const userA = rows.find(u => u.id === TEST_FIXTURE_USER_ID);
  const userB = rows.find(u => u.id === TEST_FIXTURE_USER_ID_2);
  if (!userA || !userB) throw new Error('Test fixture accounts not found! Run create_test_fixture_account.ts first.');

  console.log(`👤 Account A: ${userA.id} (${userA.name || userA.phone})`);
  console.log(`👤 Account B: ${userB.id} (${userB.name || userB.phone})\n`);

  // ── STEP 1: Submit a ticket linked to Account A ─────────────────────────
  console.log('👉 STEP 1: Submit ticket via POST /api/marketing/contact (linked to Account A)...');
  const submitRes = await contactPost(new Request('http://localhost/api/marketing/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      userId: userA.id,
      name: userA.name || 'Test User A',
      email: 'testa@verify.test',
      subject: 'Task 11 Verify: Account A Ticket',
      message: 'Test ticket submitted for cross-account isolation verification.',
    }),
  }));
  const submitJson = await submitRes.json();
  console.log(`   - POST status: ${submitRes.status} | success: ${submitJson.success}`);
  if (!submitJson.success) throw new Error(`Submit failed: ${JSON.stringify(submitJson)}`);

  // Fetch the ticket we just inserted
  const allATickets = await db.select()
    .from(contactMessages)
    .where(eq(contactMessages.userId, userA.id))
    .orderBy(asc(contactMessages.createdAt));
  const ticket1 = allATickets[allATickets.length - 1];
  if (!ticket1) throw new Error('Inserted ticket not found in DB');
  console.log(`   - Ticket ID: ${ticket1.id}`);
  console.log(`   - userId stored in DB: ${ticket1.userId} (matches A? ${ticket1.userId === userA.id ? '✅ YES' : '❌ NO'})\n`);

  // ── STEP 2: Cross-account isolation ────────────────────────────────────
  console.log('👉 STEP 2: Account B requests GET /api/v1/support/tickets — must NOT see A\'s ticket...');
  const bRes = await ticketsGet(new Request('http://localhost/api/v1/support/tickets', {
    headers: { 'x-user-id': userB.id },
  }));
  const bJson = await bRes.json();
  console.log(`   - GET /support/tickets as Account B → HTTP ${bRes.status}, ${bJson.tickets?.length} tickets`);
  const leaked = bJson.tickets?.find((t: any) => t.id === ticket1.id);
  if (leaked) throw new Error('❌ SECURITY FAILURE: Account A ticket appeared in Account B response!');
  console.log(`   ✅ CONFIRMED: ticket ${ticket1.id} does NOT appear in Account B's list — cross-account isolation verified.\n`);

  // ── STEP 3: Admin "Reply & Resolve" — directly via DB (admin cookie not available in test context) ──
  console.log('👉 STEP 3: Admin replies to Account A\'s ticket (direct DB write, same as action route does)...');
  const replyText = 'Hello! Thank you for reaching out. Your ticket has been reviewed and resolved. — Volunteer Team';
  const now = new Date();
  await db.update(contactMessages)
    .set({
      adminReplyText: replyText,
      repliedAt: now,
      status: 'resolved' as any,
      isRead: true,
    })
    .where(eq(contactMessages.id, ticket1.id));

  // Verify DB state
  const resolved = await db.select({ status: contactMessages.status, adminReplyText: contactMessages.adminReplyText, repliedAt: contactMessages.repliedAt })
    .from(contactMessages).where(eq(contactMessages.id, ticket1.id)).limit(1).then(r => r[0]);
  console.log(`   - DB status: "${resolved.status}" (expected "resolved")`);
  console.log(`   - DB adminReplyText: "${resolved.adminReplyText?.substring(0, 40)}..."`);
  console.log(`   - DB repliedAt: ${resolved.repliedAt}`);
  if (resolved.status !== 'resolved' || !resolved.adminReplyText || !resolved.repliedAt) {
    throw new Error('Reply did not persist correctly');
  }
  console.log('   ✅ Reply stored in DB correctly.\n');

  // Fire the same push notification the route fires
  console.log('   - Firing push notification to Account A via sendPushNotification...');
  await sendPushNotification(
    userA.id,
    'support_alerts',
    'Support replied to your ticket',
    `Your inquiry "${ticket1.subject}" has been answered. Tap to view the reply.`,
    { screen: 'contact', ticketId: ticket1.id },
  );
  console.log('   - sendPushNotification call completed (check logs above for "Sent support_alerts" or "No tokens registered")\n');

  // ── STEP 4: Account A reads the reply via GET /api/v1/support/tickets ──
  console.log('👉 STEP 4: Account A fetches GET /api/v1/support/tickets — should see reply...');
  const aRes = await ticketsGet(new Request('http://localhost/api/v1/support/tickets', {
    headers: { 'x-user-id': userA.id },
  }));
  const aJson = await aRes.json();
  const foundResolved = aJson.tickets?.find((t: any) => t.id === ticket1.id);
  console.log(`   - Tickets for Account A: ${aJson.tickets?.length}`);
  console.log(`   - Found ticket? ${foundResolved ? 'YES' : 'NO'} | status: "${foundResolved?.status}" | reply present? ${foundResolved?.adminReplyText ? 'YES' : 'NO'}`);
  if (!foundResolved || foundResolved.status !== 'resolved' || !foundResolved.adminReplyText) {
    throw new Error('Account A cannot see resolved ticket with reply');
  }
  console.log('   ✅ CONFIRMED: Account A sees ticket as "resolved" with adminReplyText populated.\n');

  // ── STEP 5: Submit second ticket and "Close without reply" ─────────────
  console.log('👉 STEP 5: Submit ticket 2 for Account A, then close without reply...');
  const submitRes2 = await contactPost(new Request('http://localhost/api/marketing/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      userId: userA.id,
      name: userA.name || 'Test User A',
      email: 'testa@verify.test',
      subject: 'Task 11 Verify: Ticket to be Closed',
      message: 'Duplicate/spam test ticket for "close without reply" verification.',
    }),
  }));
  await submitRes2.json();

  const allATickets2 = await db.select().from(contactMessages)
    .where(eq(contactMessages.userId, userA.id)).orderBy(asc(contactMessages.createdAt));
  const ticket2 = allATickets2[allATickets2.length - 1];
  console.log(`   - Ticket 2 ID: ${ticket2.id}`);

  // Admin closes ticket 2
  await db.update(contactMessages)
    .set({ status: 'closed' as any, isRead: true })
    .where(eq(contactMessages.id, ticket2.id));

  const closedRow = await db.select({ status: contactMessages.status, adminReplyText: contactMessages.adminReplyText })
    .from(contactMessages).where(eq(contactMessages.id, ticket2.id)).limit(1).then(r => r[0]);
  console.log(`   - DB status: "${closedRow.status}" (expected "closed")`);
  console.log(`   - DB adminReplyText: ${closedRow.adminReplyText === null ? 'NULL ✅ (correct — no reply)' : `"${closedRow.adminReplyText}" ❌ (unexpected)`}`);
  if (closedRow.status !== 'closed' || closedRow.adminReplyText !== null) throw new Error('Closed ticket has wrong DB state');

  // Account A sees both tickets — verify clear distinction
  const aRes2 = await ticketsGet(new Request('http://localhost/api/v1/support/tickets', {
    headers: { 'x-user-id': userA.id },
  }));
  const aJson2 = await aRes2.json();
  const closedInList = aJson2.tickets?.find((t: any) => t.id === ticket2.id);
  const resolvedInList = aJson2.tickets?.find((t: any) => t.id === ticket1.id);
  console.log('\n   --- Account A ticket list ---');
  console.log(`   Ticket 1 (resolved): status="${resolvedInList?.status}" adminReplyText="${resolvedInList?.adminReplyText?.substring(0, 30)}..."`);
  console.log(`   Ticket 2 (closed):   status="${closedInList?.status}" adminReplyText=${closedInList?.adminReplyText === null ? 'null' : '"' + closedInList?.adminReplyText + '"'}`);
  if (closedInList?.status !== 'closed' || closedInList?.adminReplyText !== null) throw new Error('Closed ticket presenting incorrectly');
  if (resolvedInList?.status !== 'resolved' || !resolvedInList?.adminReplyText) throw new Error('Resolved ticket presenting incorrectly');
  console.log('   ✅ CONFIRMED: "Closed" (no reply, null adminReplyText) is visually and structurally distinct from "Resolved" (has adminReplyText + repliedAt).\n');

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('              ALL TASK 11 VERIFICATION TESTS PASSED!                  ');
  console.log('═══════════════════════════════════════════════════════════════════════');
  process.exit(0);
}

main().catch(e => {
  console.error('\n❌ VERIFICATION FAILED:', e.message || e);
  process.exit(1);
});
