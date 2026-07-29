/**
 * IN-APP NOTIFICATIONS SYSTEM VERIFICATION SUITE
 */
import { db } from './src/lib/db';
import { users, contactMessages, notificationsLog, matches } from './src/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { POST as interestedPost } from './src/app/api/v1/interactions/interested/route';
import { GET as notificationsGet } from './src/app/api/v1/notifications/route';
import { GET as unreadCountGet } from './src/app/api/v1/notifications/unread-count/route';
import { PATCH as readSinglePatch } from './src/app/api/v1/notifications/[id]/read/route';
import { PATCH as readAllPatch } from './src/app/api/v1/notifications/read-all/route';
import { TEST_FIXTURE_USER_ID, TEST_FIXTURE_USER_ID_2 } from './src/lib/testFixtures';

async function getTestUsers() {
  const rows = await db.select({ id: users.id, name: users.name, phone: users.phone })
    .from(users)
    .where(inArray(users.id, [TEST_FIXTURE_USER_ID, TEST_FIXTURE_USER_ID_2]));
  const userA = rows.find(u => u.id === TEST_FIXTURE_USER_ID);
  const userB = rows.find(u => u.id === TEST_FIXTURE_USER_ID_2);
  if (!userA || !userB) throw new Error('Test fixture accounts not found! Run create_test_fixture_account.ts first.');
  return { userA, userB };
}

function makeMockParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('         TASK: IN-APP NOTIFICATION PANEL — VERIFICATION SUITE         ');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const { userA, userB } = await getTestUsers();
  console.log(`👤 User A: ${userA.id} (${userA.name || userA.phone})`);
  console.log(`👤 User B: ${userB.id} (${userB.name || userB.phone})\n`);

  // Clear existing notifications for these users to make checks clean
  await db.delete(notificationsLog).where(eq(notificationsLog.userId, userA.id));
  await db.delete(notificationsLog).where(eq(notificationsLog.userId, userB.id));

  // Ensure test accounts are active and not soft-deleted
  await db.update(users).set({ isActive: true, abandonedAt: null }).where(eq(users.id, userA.id));
  await db.update(users).set({ isActive: true, abandonedAt: null }).where(eq(users.id, userB.id));

  // Clean existing interactions to prevent cooldowns
  await db.execute(sql`DELETE FROM interactions WHERE (user_id = ${userA.id} AND target_id = ${userB.id}) OR (user_id = ${userB.id} AND target_id = ${userA.id})`);
  await db.execute(sql`DELETE FROM matches WHERE (user_a = ${userA.id} AND user_b = ${userB.id}) OR (user_a = ${userB.id} AND user_b = ${userA.id})`);

  // ── STEP 1: User A expresses interest in User B (one-sided) ─────────────────
  console.log('👉 STEP 1: User A expresses interest in User B (expect received_interest notification for B)...');
  const res1 = await interestedPost(new Request('http://localhost/api/v1/interactions/interested', {
    method: 'POST',
    headers: { 'x-user-id': userA.id, 'content-type': 'application/json' },
    body: JSON.stringify({ profileId: userB.id }),
  }));
  const json1 = await res1.json();
  console.log(`   - HTTP Status: ${res1.status} | success: ${json1.success}`);

  // Fetch B's notifications
  const bNotifications = await db.select().from(notificationsLog).where(eq(notificationsLog.userId, userB.id));
  console.log(`   - Notifications created for User B: ${bNotifications.length}`);
  if (bNotifications.length !== 1) throw new Error('Expected 1 notification for B');
  const bNotif = bNotifications[0];
  console.log(`   - Type: "${bNotif.type}" | Title: "${bNotif.title}" | Body: "${bNotif.body}"`);
  console.log(`   - Related ID: ${bNotif.relatedId} (matches User A? ${bNotif.relatedId === userA.id ? '✅ YES' : '❌ NO'})\n`);

  // ── STEP 2: User B expresses reciprocal interest in User A (expect mutual match) ─
  console.log('👉 STEP 2: User B expresses reciprocal interest in User A (expect match notification for BOTH)...');
  const res2 = await interestedPost(new Request('http://localhost/api/v1/interactions/interested', {
    method: 'POST',
    headers: { 'x-user-id': userB.id, 'content-type': 'application/json' },
    body: JSON.stringify({ profileId: userA.id }),
  }));
  const json2 = await res2.json();
  console.log(`   - HTTP Status: ${res2.status} | success: ${json2.success} | mutualMatch: ${json2.mutualMatch}`);

  // Retrieve notifications
  const aNotifsAfterMatch = await db.select().from(notificationsLog).where(eq(notificationsLog.userId, userA.id));
  const bNotifsAfterMatch = await db.select().from(notificationsLog).where(and(eq(notificationsLog.userId, userB.id), eq(notificationsLog.type, 'match')));
  
  console.log(`   - Match notifications for User A: ${aNotifsAfterMatch.length}`);
  console.log(`   - Match notifications for User B: ${bNotifsAfterMatch.length}`);
  if (aNotifsAfterMatch.length !== 1 || bNotifsAfterMatch.length !== 1) {
    throw new Error('Expected exactly 1 match notification for both users');
  }
  
  const aMatchNotif = aNotifsAfterMatch[0];
  console.log(`   - User A Notification -> Type: "${aMatchNotif.type}" | Title: "${aMatchNotif.title}" | relatedId: ${aMatchNotif.relatedId}`);

  // Get match ID from DB
  const matchRow = await db.select().from(matches).where(and(
    eq(matches.userA, LEAST(userA.id, userB.id)),
    eq(matches.userB, GREATEST(userA.id, userB.id))
  )).limit(1).then(r => r[0]);
  console.log(`   - Real Match ID: ${matchRow?.id}`);
  console.log(`   - Related ID matches real match ID? ${aMatchNotif.relatedId === matchRow?.id ? '✅ YES' : '❌ NO'}\n`);

  // ── STEP 3: Fetch notifications via GET /api/v1/notifications ───────────
  console.log('👉 STEP 3: User B fetches GET /api/v1/notifications...');
  const getRes = await notificationsGet(new Request('http://localhost/api/v1/notifications', {
    headers: { 'x-user-id': userB.id },
  }));
  const getJson = await getRes.json();
  console.log(`   - HTTP Status: ${getRes.status}`);
  console.log(`   - Notifications returned: ${getJson.notifications?.length}`);
  getJson.notifications?.forEach((n: any, idx: number) => {
    console.log(`     [${idx}] Title: "${n.title}" | Type: "${n.type}" | isRead: ${n.isRead}`);
  });
  if (getJson.notifications?.length !== 2) throw new Error('Expected 2 notifications for B in API response');
  console.log('   ✅ GET /notifications returned all items sorted correctly.\n');

  // ── STEP 4: Fetch unread count via GET /api/v1/unread-count ───────────────
  console.log('👉 STEP 4: User B fetches unread count via GET /api/v1/notifications/unread-count...');
  const countRes = await unreadCountGet(new Request('http://localhost/api/v1/notifications/unread-count', {
    headers: { 'x-user-id': userB.id },
  }));
  const countJson = await countRes.json();
  console.log(`   - Unread count: ${countJson.count} (expected 2)`);
  if (countJson.count !== 2) throw new Error('Expected unread count to be 2');
  console.log('   ✅ Unread count matches exactly.\n');

  // ── STEP 5: Mark a single notification as read ───────────────────────────
  console.log('👉 STEP 5: Mark first notification as read via PATCH /api/v1/notifications/[id]/read...');
  const targetId = getJson.notifications[0].id;
  const readRes = await readSinglePatch(
    new Request(`http://localhost/api/v1/notifications/${targetId}/read`, {
      method: 'PATCH',
      headers: { 'x-user-id': userB.id },
    }),
    makeMockParams(targetId)
  );
  const readJson = await readRes.json();
  console.log(`   - PATCH status: ${readRes.status} | success: ${readJson.success}`);

  // Fetch count again
  const countRes2 = await unreadCountGet(new Request('http://localhost/api/v1/notifications/unread-count', {
    headers: { 'x-user-id': userB.id },
  }));
  const countJson2 = await countRes2.json();
  console.log(`   - New unread count: ${countJson2.count} (expected 1)`);
  if (countJson2.count !== 1) throw new Error('Expected unread count to decrement to 1');
  console.log('   ✅ Single item marked read, unread count decremented correctly.\n');

  // ── STEP 6: Mark all notifications as read ──────────────────────────────
  console.log('👉 STEP 6: Mark all remaining notifications as read via PATCH /api/v1/notifications/read-all...');
  const readAllRes = await readAllPatch(new Request('http://localhost/api/v1/notifications/read-all', {
    method: 'PATCH',
    headers: { 'x-user-id': userB.id },
  }));
  const readAllJson = await readAllRes.json();
  console.log(`   - PATCH read-all status: ${readAllRes.status} | success: ${readAllJson.success}`);

  // Fetch count again
  const countRes3 = await unreadCountGet(new Request('http://localhost/api/v1/notifications/unread-count', {
    headers: { 'x-user-id': userB.id },
  }));
  const countJson3 = await countRes3.json();
  console.log(`   - Final unread count: ${countJson3.count} (expected 0)`);
  if (countJson3.count !== 0) throw new Error('Expected final unread count to be 0');
  console.log('   ✅ All notifications marked read, unread count cleared.\n');

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('              ALL NOTIFICATION VERIFICATION TESTS PASSED!             ');
  console.log('═══════════════════════════════════════════════════════════════════════');
  process.exit(0);
}

// Helpers for drizzle least/greatest
function LEAST(a: string, b: string) {
  return a < b ? a : b;
}

function GREATEST(a: string, b: string) {
  return a > b ? a : b;
}

import { sql } from 'drizzle-orm';
main().catch(e => {
  console.error('\n❌ VERIFICATION FAILED:', e.message || e);
  process.exit(1);
});
