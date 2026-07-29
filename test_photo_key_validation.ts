import { POST as photoPost } from './src/app/api/v1/profile/photo/route';
import { POST as uploadUrlPost } from './src/app/api/v1/profile/photo/upload-url/route';
import { db } from './src/lib/db';
import { profiles } from './src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { TEST_FIXTURE_USER_ID } from './src/lib/testFixtures';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

function req(userId: string, photoKey: string) {
  return new Request('http://localhost/api/v1/profile/photo', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify({ photoKey }),
  });
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   PHOTO KEY VALIDATION FIX — LIVE VERIFICATION AGAINST REAL R2  ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Reset fixture photoKey to a known baseline
  await db.update(profiles).set({ photoKey: null }).where(eq(profiles.userId, TEST_FIXTURE_USER_ID));

  // ── Case 1: raw local device URI (the exact pattern found in the audit) ──
  console.log('👉 CASE 1: Submitting a raw local device URI (the exact pattern found on real accounts)...');
  const fakePath = 'file:///data/user/0/host.exp.exponent/cache/ImagePicker/eeb831b6-b2cd-425c-9acd-7add144ebaec.jpeg';
  const res1 = await photoPost(req(TEST_FIXTURE_USER_ID, fakePath));
  const json1 = await res1.json();
  console.log(`   HTTP Status: ${res1.status}`);
  console.log(`   Response: ${JSON.stringify(json1)}`);
  const row1 = await db.select().from(profiles).where(eq(profiles.userId, TEST_FIXTURE_USER_ID)).then(r => r[0]);
  console.log(`   DB photoKey after attempt: ${row1?.photoKey === null ? 'still NULL (rejected, not persisted)' : row1?.photoKey}`);
  if (res1.status !== 400 || row1?.photoKey !== null) throw new Error('FAIL: fake local path was NOT rejected!');
  console.log('   ✅ REJECTED as expected.\n');

  // ── Case 2: correctly-formatted key that was never actually uploaded ──
  console.log('👉 CASE 2: Submitting a correctly-formatted key that does NOT exist in R2...');
  const phantomKey = `profile-photos/${TEST_FIXTURE_USER_ID}-deadbeefcafe0000.jpg`;
  const res2 = await photoPost(req(TEST_FIXTURE_USER_ID, phantomKey));
  const json2 = await res2.json();
  console.log(`   HTTP Status: ${res2.status}`);
  console.log(`   Response: ${JSON.stringify(json2)}`);
  const row2 = await db.select().from(profiles).where(eq(profiles.userId, TEST_FIXTURE_USER_ID)).then(r => r[0]);
  console.log(`   DB photoKey after attempt: ${row2?.photoKey === null ? 'still NULL (rejected, not persisted)' : row2?.photoKey}`);
  if (res2.status !== 400 || row2?.photoKey !== null) throw new Error('FAIL: phantom key (right shape, not in R2) was NOT rejected!');
  console.log('   ✅ REJECTED as expected — object does not exist in R2.\n');

  // ── Case 3: real end-to-end flow — get presigned URL, actually upload to R2, then submit ──
  console.log('👉 CASE 3: Real flow — request upload-url, actually PUT bytes to R2, then submit the returned key...');
  const uploadUrlRes = await uploadUrlPost(new Request('http://localhost/api/v1/profile/photo/upload-url', {
    method: 'POST',
    headers: { 'x-user-id': TEST_FIXTURE_USER_ID },
  }));
  const { uploadUrl, objectKey } = await uploadUrlRes.json();
  console.log(`   Issued objectKey: ${objectKey}`);

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]), // minimal JPEG SOI/EOI bytes
  });
  console.log(`   PUT to R2 status: ${putRes.status}`);
  if (!putRes.ok) throw new Error('FAIL: could not actually upload test bytes to R2');

  const res3 = await photoPost(req(TEST_FIXTURE_USER_ID, objectKey));
  const json3 = await res3.json();
  console.log(`   HTTP Status: ${res3.status}`);
  console.log(`   Response: ${JSON.stringify(json3).slice(0, 120)}...`);
  const row3 = await db.select().from(profiles).where(eq(profiles.userId, TEST_FIXTURE_USER_ID)).then(r => r[0]);
  console.log(`   DB photoKey after attempt: ${row3?.photoKey}`);
  if (res3.status !== 200 || row3?.photoKey !== objectKey) throw new Error('FAIL: a genuinely-uploaded real key was rejected!');
  console.log('   ✅ ACCEPTED as expected — real upload with real R2 object persists correctly.\n');

  // Cleanup: delete the real test object from R2, reset fixture profile
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
  });
  await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: objectKey }));
  await db.update(profiles).set({ photoKey: null }).where(eq(profiles.userId, TEST_FIXTURE_USER_ID));
  console.log('🧹 Cleaned up: deleted test object from R2, reset fixture photoKey to null.\n');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   ALL 3 CASES BEHAVED CORRECTLY — FIX VERIFIED AGAINST REAL R2  ');
  console.log('═══════════════════════════════════════════════════════════════');
  process.exit(0);
}

main().catch(e => {
  console.error('\n❌ VERIFICATION FAILED:', e.message || e);
  process.exit(1);
});
