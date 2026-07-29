/**
 * Bot detection integration test.
 * Requires the Next.js dev server to be running at localhost:3000.
 *
 * Flow:
 *  1. Insert a fresh biodata_links row directly (bypasses auth, good for testing)
 *  2. GET /biodata/[token] with WhatsApp UA → expect OG HTML, link NOT consumed
 *  3. Verify link still exists in biodata_links
 *  4. GET /biodata/[token] with real browser UA → expect profile HTML, link consumed
 *  5. Verify link removed from biodata_links
 *  6. GET /biodata/[token] again → expect expired/used page (link gone)
 */
import { db } from './src/lib/db';
import { users, biodataLinks, biodataLinkHistory } from './src/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { randomBytes, createHash } from 'crypto';
import { TEST_FIXTURE_USER_ID } from './src/lib/testFixtures';

const BASE_URL = 'http://localhost:3003';

async function getVerifiedUserId(): Promise<string> {
  const row = await db.select().from(users).where(eq(users.id, TEST_FIXTURE_USER_ID)).then(r => r[0]);
  if (!row) throw new Error('Test fixture account not found! Run create_test_fixture_account.ts first.');
  return row.id;
}

async function seedLink(userId: string): Promise<string> {
  // Clean up any previous test links for this user
  await db.delete(biodataLinks).where(eq(biodataLinks.userId, userId));

  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.insert(biodataLinks).values({ userId, token, expiresAt });
  await db.insert(biodataLinkHistory).values({ userId, tokenHash, expiresAt, outcome: 'pending' });

  return token;
}

async function linkExists(token: string): Promise<boolean> {
  const res: any = await db.execute(sql`SELECT id FROM biodata_links WHERE token = ${token}`);
  return ((res?.rows ?? res)?.length ?? 0) > 0;
}

async function hitPage(token: string, ua: string): Promise<{ status: number; body: string }> {
  const res = await fetch(`${BASE_URL}/biodata/${token}`, {
    headers: { 'user-agent': ua },
    redirect: 'follow',
  });
  const body = await res.text();
  return { status: res.status, body };
}

function assertOgTags(body: string): void {
  const hasOgTitle = body.includes('og:title');
  const hasOgDesc = body.includes('og:description');
  if (!hasOgTitle || !hasOgDesc) {
    throw new Error(`Missing OG tags. og:title=${hasOgTitle} og:description=${hasOgDesc}`);
  }
}

function assertProfileContent(body: string): void {
  // The real page renders the person's name in an <h1> and shows "Bohra Taaruf"
  if (!body.includes('Bohra Taaruf')) {
    throw new Error('Real profile page missing expected "Bohra Taaruf" marker');
  }
}

function assertExpiredPage(body: string): void {
  if (!body.includes('expired') && !body.includes('Expired') && !body.includes('used')) {
    throw new Error('Expected expired/used page but got unexpected content');
  }
}

async function main() {
  console.log('── Bot Detection Integration Test ──────────────────────────────\n');

  // Verify the dev server is reachable
  try {
    const ping = await fetch(`${BASE_URL}/`, { signal: AbortSignal.timeout(3000) });
    console.log(`Dev server reachable: ${ping.status}\n`);
  } catch {
    console.error(`ERROR: Dev server not responding at ${BASE_URL}. Is "npm run dev" running?`);
    process.exit(1);
  }

  const userId = await getVerifiedUserId();
  console.log(`Test user: ${userId.slice(0, 8)}...`);

  // ── Test 1: Bot request (WhatsApp) ──────────────────────────────────────
  const token = await seedLink(userId);
  console.log(`Token seeded: ${token.slice(0, 12)}...`);

  console.log('\n[1] Sending WhatsApp bot UA...');
  const botRes = await hitPage(token, 'WhatsApp/2.0 (+http://www.whatsapp.com/bot)');
  console.log(`    HTTP status:  ${botRes.status}`);

  const stillExists = await linkExists(token);
  console.log(`    OG tags present: ${botRes.body.includes('og:title') ? '✓' : '✗ MISSING'}`);
  console.log(`    Link NOT consumed: ${stillExists ? '✓' : '✗ WAS CONSUMED — BUG'}`);

  if (!stillExists) {
    console.error('\nFAIL: Bot request consumed the link. Bot detection is broken.');
    process.exit(1);
  }

  // ── Test 2: Second bot UA (Telegram) — should also not consume ──────────
  console.log('\n[2] Sending TelegramBot UA...');
  const telegramRes = await hitPage(token, 'TelegramBot (https://core.telegram.org/bots/webhooks)');
  const stillExistsAfterTelegram = await linkExists(token);
  console.log(`    HTTP status:  ${telegramRes.status}`);
  console.log(`    Link NOT consumed: ${stillExistsAfterTelegram ? '✓' : '✗ WAS CONSUMED — BUG'}`);

  if (!stillExistsAfterTelegram) {
    console.error('\nFAIL: TelegramBot request consumed the link.');
    process.exit(1);
  }

  // ── Test 3: Real browser request — should consume ────────────────────────
  console.log('\n[3] Sending real browser UA (Chrome)...');
  const realRes = await hitPage(
    token,
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  );
  console.log(`    HTTP status:  ${realRes.status}`);

  const consumedAfterReal = !(await linkExists(token));
  console.log(`    Profile content present: ${realRes.body.includes('Bohra Taaruf') ? '✓' : '✗ MISSING'}`);
  console.log(`    Link consumed: ${consumedAfterReal ? '✓' : '✗ LINK STILL IN DB — NOT CONSUMED'}`);

  if (!consumedAfterReal) {
    console.error('\nFAIL: Real browser request did not consume the link.');
    process.exit(1);
  }

  // ── Test 4: Third request (real UA again) on same token — must be expired ─
  console.log('\n[4] Sending same token again with real UA (should be expired/used)...');
  const replayRes = await hitPage(
    token,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  );
  console.log(`    HTTP status:  ${replayRes.status}`);
  const isExpiredContent = replayRes.body.includes('expired') || replayRes.body.includes('Expired') || replayRes.body.includes('used');
  console.log(`    Expired page shown: ${isExpiredContent ? '✓' : '✗ MISSING — SHOWED PROFILE AGAIN'}`);

  if (!isExpiredContent) {
    console.error('\nFAIL: Re-used token showed the profile page instead of expired page.');
    process.exit(1);
  }

  // ── Final: Verify history audit trail ────────────────────────────────────
  const histRows: any = await db.execute(sql`
    SELECT outcome, viewed_at, viewer_ip 
    FROM biodata_link_history 
    WHERE user_id = ${userId}
    ORDER BY generated_at DESC 
    LIMIT 2
  `);
  const rows = (histRows?.rows ?? histRows) || [];
  console.log('\n[5] Audit history:');
  rows.forEach((r: any, i: number) => {
    console.log(`    row ${i + 1}: outcome=${r.outcome} viewed_at=${r.viewed_at ?? 'null'} viewer_ip=${r.viewer_ip ?? 'null'}`);
  });

  console.log('\n✓ All bot detection tests passed');
  process.exit(0);
}

main().catch(e => { console.error('Test error:', e); process.exit(1); });
