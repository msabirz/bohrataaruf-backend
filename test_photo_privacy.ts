import 'dotenv/config';
import { webcrypto } from 'node:crypto';
if (!(globalThis as any).crypto) (globalThis as any).crypto = webcrypto;
import { db } from './src/lib/db';
import { users, profiles, verifications, photoViews, notificationsLog } from './src/lib/db/schema';
import { signToken, hashItsNumber } from './src/lib/api/auth';
import { eq, and } from 'drizzle-orm';

const BASE = 'http://localhost:3000/api/v1';

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`  OK: ${msg}`);
}

async function main() {
  console.log('--- Setting up test accounts ---');

  const suffix = Date.now().toString().slice(-6);
  const [owner] = await db.insert(users).values({
    name: 'Test Owner Male',
    itsNumberHash: hashItsNumber(`10${suffix}`),
    gender: 'male',
    dateOfBirth: '1990-01-01',
    city: 'Mumbai',
    isTestAccount: true,
  }).returning();

  const [viewer] = await db.insert(users).values({
    name: 'Test Viewer Female',
    itsNumberHash: hashItsNumber(`20${suffix}`),
    gender: 'female',
    dateOfBirth: '1992-01-01',
    city: 'Mumbai',
    isTestAccount: true,
  }).returning();

  try {
    await db.insert(profiles).values([
      { userId: owner.id, alias: 'TestOwnerAlias', photoKey: 'test/owner-real.jpg', photoKeyBlurred: 'test/owner-blurred.jpg' },
      { userId: viewer.id, alias: 'TestViewerAlias', photoKey: 'test/viewer-real.jpg', photoKeyBlurred: 'test/viewer-blurred.jpg' },
    ]);

    await db.insert(verifications).values([
      { userId: owner.id, status: 'verified' },
      { userId: viewer.id, status: 'verified' },
    ]);

    const ownerToken = await signToken(owner.id);
    const viewerToken = await signToken(viewer.id);

    const ownerHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` };
    const viewerHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${viewerToken}` };

    console.log('\n--- Test 1: photo-privacy-options reflects admin-seeded male rule ---');
    const optionsRes = await fetch(`${BASE}/profile/photo-privacy-options`, { headers: ownerHeaders });
    const options = await optionsRes.json();
    console.log('  options:', options);
    assert(optionsRes.status === 200, 'options fetch returns 200');
    assert(JSON.stringify(options.allowedModes.slice().sort()) === JSON.stringify(['always', 'blur_until_match', 'request_only'].sort()), 'male allowedModes matches seeded rule');
    assert(options.defaultMode === 'request_only', 'male defaultMode is request_only');

    console.log('\n--- Test 2: gender restriction rejects disallowed mode ---');
    const rejectRes = await fetch(`${BASE}/profile`, {
      method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ photoPrivacyMode: 'three_then_request' }),
    });
    console.log('  status:', rejectRes.status, await rejectRes.clone().json());
    assert(rejectRes.status === 400, 'male setting three_then_request (not in allowed set) is rejected with 400');

    console.log('\n--- Test 3: gender restriction accepts allowed mode ---');
    const acceptRes = await fetch(`${BASE}/profile`, {
      method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ photoPrivacyMode: 'request_only' }),
    });
    assert(acceptRes.status === 200, 'male setting request_only (allowed) succeeds with 200');

    console.log('\n--- Test 4: viewer requests owner\'s photo ---');
    const reqRes = await fetch(`${BASE}/matching/photo-view-request`, {
      method: 'POST', headers: viewerHeaders, body: JSON.stringify({ profileId: owner.id }),
    });
    const reqBody = await reqRes.json();
    console.log('  status:', reqRes.status, reqBody);
    assert(reqRes.status === 200 && reqBody.success, 'photo view request succeeds');

    const pvRow = await db.select().from(photoViews).where(and(eq(photoViews.viewerId, viewer.id), eq(photoViews.profileId, owner.id))).limit(1).then(r => r[0]);
    assert(pvRow?.extraViewRequested === true, 'DB: extra_view_requested=true after request');

    const ownerNotif = await db.select().from(notificationsLog).where(and(eq(notificationsLog.userId, owner.id), eq(notificationsLog.type, 'photo_view_request'))).then(r => r[0]);
    assert(!!ownerNotif && ownerNotif.relatedId === viewer.id, 'DB: owner got a photo_view_request notification with relatedId=viewer');

    console.log('\n--- Test 5: owner sees pending request ---');
    const listRes = await fetch(`${BASE}/matching/photo-view-requests`, { headers: ownerHeaders });
    const listBody = await listRes.json();
    console.log('  requests:', listBody.requests);
    assert(listBody.requests.some((r: any) => r.viewerId === viewer.id), 'owner\'s pending requests list includes viewer');

    console.log('\n--- Test 6: owner approves for 24h ---');
    const approveRes = await fetch(`${BASE}/matching/photo-view-request/${viewer.id}`, {
      method: 'PATCH', headers: ownerHeaders, body: JSON.stringify({ decision: 'approve', duration: '24h' }),
    });
    assert(approveRes.status === 200, 'approve request succeeds');

    const pvAfterApprove = await db.select().from(photoViews).where(and(eq(photoViews.viewerId, viewer.id), eq(photoViews.profileId, owner.id))).limit(1).then(r => r[0]);
    assert(pvAfterApprove?.extraViewApproved === true, 'DB: extra_view_approved=true after approve');
    assert(!!pvAfterApprove?.extraViewApprovedUntil, 'DB: extra_view_approved_until is set (24h, not permanent)');
    const hoursUntil = pvAfterApprove!.extraViewApprovedUntil!.getTime() - Date.now();
    assert(hoursUntil > 23 * 3600 * 1000 && hoursUntil < 25 * 3600 * 1000, 'DB: expiry is ~24h from now');

    const viewerNotif = await db.select().from(notificationsLog).where(and(eq(notificationsLog.userId, viewer.id), eq(notificationsLog.type, 'photo_view_response'))).then(r => r[0]);
    assert(!!viewerNotif, 'DB: viewer got a photo_view_response notification');

    console.log('\n--- Test 7: viewer now resolves owner\'s REAL photo via resolvePhotoAccess ---');
    const profileRes = await fetch(`${BASE}/matching/profile/${owner.id}`, { headers: viewerHeaders });
    const profileBody = await profileRes.json();
    console.log('  photoUri contains real key segment:', profileBody.photoUri?.includes('owner-real'));
    console.log('  photoRequestStatus:', profileBody.photoRequestStatus, 'photoGrantedUntil:', profileBody.photoGrantedUntil);
    assert(profileRes.status === 200, 'candidate profile fetch succeeds');
    assert(profileBody.photoUri?.includes('owner-real'), 'served photoUri resolves to the REAL photo key, not blurred, once granted');
    assert(profileBody.photoRequestStatus === 'approved', 'photoRequestStatus reflects approved');
    assert(!!profileBody.photoGrantedUntil, 'photoGrantedUntil is present');

    console.log('\n--- Test 8: owner sees active grant ---');
    const grantsRes = await fetch(`${BASE}/matching/photo-view-grants`, { headers: ownerHeaders });
    const grantsBody = await grantsRes.json();
    assert(grantsBody.grants.some((g: any) => g.viewerId === viewer.id), 'owner\'s active grants list includes viewer');

    console.log('\n--- Test 9: owner revokes — silent, no notification ---');
    const notifCountBefore = await db.select().from(notificationsLog).where(eq(notificationsLog.userId, viewer.id)).then(r => r.length);
    const revokeRes = await fetch(`${BASE}/matching/photo-view-grants/${viewer.id}/revoke`, { method: 'POST', headers: ownerHeaders });
    assert(revokeRes.status === 200, 'revoke succeeds');
    const notifCountAfter = await db.select().from(notificationsLog).where(eq(notificationsLog.userId, viewer.id)).then(r => r.length);
    assert(notifCountAfter === notifCountBefore, 'DB: no new notification row created for viewer after revoke (silent per requirement)');

    const pvAfterRevoke = await db.select().from(photoViews).where(and(eq(photoViews.viewerId, viewer.id), eq(photoViews.profileId, owner.id))).limit(1).then(r => r[0]);
    assert(pvAfterRevoke?.extraViewApproved === false, 'DB: extra_view_approved=false after revoke');
    assert(pvAfterRevoke?.extraViewApprovedUntil === null, 'DB: extra_view_approved_until cleared after revoke');

    console.log('\n--- Test 10: post-revoke, viewer is served the BLURRED photo again (never a placeholder) ---');
    const profileRes2 = await fetch(`${BASE}/matching/profile/${owner.id}`, { headers: viewerHeaders });
    const profileBody2 = await profileRes2.json();
    console.log('  photoUri contains blurred key segment:', profileBody2.photoUri?.includes('owner-blurred'));
    assert(profileBody2.photoUri?.includes('owner-blurred'), 'served photoUri reverts to the blurred derivative post-revoke — never null/placeholder');
    assert(profileBody2.photoRequestStatus === 'denied' || profileBody2.photoRequestStatus === 'none', 'photoRequestStatus no longer approved post-revoke');

    console.log('\n--- Test 11: self-serve photo-view endpoint blocked for request_only mode ---');
    const selfServeRes = await fetch(`${BASE}/matching/photo-view`, {
      method: 'POST', headers: viewerHeaders, body: JSON.stringify({ profileId: owner.id }),
    });
    console.log('  status:', selfServeRes.status);
    assert(selfServeRes.status === 403, 'self-serve tap-to-view is blocked (403) for request_only mode');

    console.log('\nALL PHOTO PRIVACY TESTS PASSED');
  } finally {
    console.log('\n--- Cleaning up test accounts ---');
    await db.delete(users).where(eq(users.id, owner.id));
    await db.delete(users).where(eq(users.id, viewer.id));
    console.log('  Cleanup complete (cascade-deleted profiles/verifications/photo_views/notifications).');
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('\nTEST FAILURE:', e);
  process.exit(1);
});
