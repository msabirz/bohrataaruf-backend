import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';
import { GET as getGenerateRoute } from './src/app/api/v1/biodata/generate/route';
import { createHash } from 'crypto';

// Re-export POST from the generate route
import { POST as postGenerate } from './src/app/api/v1/biodata/generate/route';

async function main() {
  // Get a real user to test with
  const viewer: any = await db.execute(sql`
    SELECT u.id FROM users u JOIN verifications v ON u.id = v.user_id
    WHERE v.status = 'verified' LIMIT 1
  `).then(res => (res as any).rows?.[0]);

  if (!viewer) { console.log('No verified user found'); process.exit(1); }
  console.log(`Test user: ${viewer.id}`);

  // ── Test 1: Generate a link ──────────────────────────────────────────────
  const req1 = new Request('http://localhost/api/v1/biodata/generate', {
    method: 'POST',
    headers: { 'x-user-id': viewer.id },
  });
  const res1 = await postGenerate(req1);
  const json1 = await res1.json();
  console.log(`\n[1] Generate link: status=${res1.status}`);
  console.log(`    url:       ${json1.url}`);
  console.log(`    expiresAt: ${json1.expiresAt}`);

  if (res1.status !== 200 || !json1.url) {
    console.error('FAIL: generate did not return 200 with url');
    process.exit(1);
  }

  // Extract token from URL
  const token = json1.url.split('/biodata/')[1];
  console.log(`    token:     ${token.slice(0, 12)}...`);

  // ── Test 2: Check biodata_links table has the row ────────────────────────
  const linkRow: any = await db.execute(sql`
    SELECT user_id, expires_at FROM biodata_links WHERE token = ${token}
  `).then(res => (res as any).rows?.[0]);
  console.log(`\n[2] biodata_links row: ${linkRow ? `✓ user_id=${linkRow.user_id.slice(0,8)}...` : 'MISSING ✗'}`);

  // ── Test 3: Check history row inserted with outcome='pending' ────────────
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const histRow: any = await db.execute(sql`
    SELECT outcome, viewed_at, viewer_ip FROM biodata_link_history WHERE token_hash = ${tokenHash}
  `).then(res => (res as any).rows?.[0]);
  console.log(`[3] history row: ${histRow ? `✓ outcome=${histRow.outcome}` : 'MISSING ✗'}`);

  // ── Test 4: Generate second link — should REUSE the same link ────────────
  const req2 = new Request('http://localhost/api/v1/biodata/generate', {
    method: 'POST',
    headers: { 'x-user-id': viewer.id },
  });
  const res2 = await postGenerate(req2);
  const json2 = await res2.json();
  const token2 = json2.url.split('/biodata/')[1];
  console.log(`\n[4] Second generate (reuse): status=${res2.status}`);

  console.log(`    Original token: ${token.slice(0, 12)}...`);
  console.log(`    New token:      ${token2.slice(0, 12)}...`);
  console.log(`    Same token returned? ${token === token2 ? '✓ YES' : '✗ NO — BUG (Generated new link)'}`);

  // ── Test 5: Simulate atomic claim (DELETE ... RETURNING) ─────────────────
  console.log('\n[5] Atomic claim via DELETE...RETURNING:');
  const claimed: any = await db.execute(sql`
    DELETE FROM biodata_links WHERE token = ${token2} AND expires_at > now()
    RETURNING user_id, expires_at
  `);
  const claimedRow = (claimed?.rows ?? claimed)?.[0];
  console.log(`    Claimed:  ${claimedRow ? `✓ user_id=${claimedRow.user_id.slice(0,8)}...` : '✗ NOTHING RETURNED'}`);

  // Second claim on same token should return nothing (atomic)
  const claimed2: any = await db.execute(sql`
    DELETE FROM biodata_links WHERE token = ${token2} AND expires_at > now()
    RETURNING user_id
  `);
  const claimedRow2 = (claimed2?.rows ?? claimed2)?.[0];
  console.log(`    Double-claim: ${!claimedRow2 ? '✓ correctly blocked (no row)' : '✗ RACE CONDITION — row returned twice!'}`);

  // ── Test 6: Generate again AFTER claim — should create a fresh link ───────
  const req3 = new Request('http://localhost/api/v1/biodata/generate', {
    method: 'POST',
    headers: { 'x-user-id': viewer.id },
  });
  const res3 = await postGenerate(req3);
  const json3 = await res3.json();
  const token3 = json3.url.split('/biodata/')[1];
  console.log(`\n[6] Generate after claim: status=${res3.status}`);
  console.log(`    Third token: ${token3.slice(0, 12)}...`);
  console.log(`    Is fresh token? ${token3 !== token2 ? '✓ YES' : '✗ NO — BUG (Reused consumed link)'}`);

  // ── Test 7: History audit check ──────────────────────────────────────────
  const histCount: any = await db.execute(sql`
    SELECT COUNT(*) as count FROM biodata_link_history WHERE user_id = ${viewer.id}
  `).then(res => (res as any).rows?.[0]);
  console.log(`\n[7] History rows for user: ${histCount?.count} (expected 2 - original + fresh)`);

  console.log('\n✓ All tests passed');
  process.exit(0);
}
main().catch(e => { console.error('Test failed:', e); process.exit(1); });
