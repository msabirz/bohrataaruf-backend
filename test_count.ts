import { db } from './src/lib/db';
import { users } from './src/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { GET } from './src/app/api/v1/matching/search/count/route';

async function main() {
  const viewer = await db.execute(sql`
    SELECT u.id FROM users u JOIN verifications v ON u.id = v.user_id
    WHERE u.gender = 'female' AND v.status = 'verified' LIMIT 1
  `).then(res => (res as any).rows?.[0]);

  if (!viewer) { console.log('No viewer found'); process.exit(1); }
  console.log(`Viewer: ${viewer.id}`);

  // Test 1: no filters (broad)
  const req1 = new Request('http://localhost/api/v1/matching/search/count?page=1', {
    headers: { 'x-user-id': viewer.id },
  });
  const res1 = await GET(req1);
  const json1 = await res1.json();
  console.log(`\n[Broad - no filters]  status=${res1.status}  count=${json1.count}`);

  // Test 2: city filter that should narrow results
  const req2 = new Request('http://localhost/api/v1/matching/search/count?cities=Surat', {
    headers: { 'x-user-id': viewer.id },
  });
  const res2 = await GET(req2);
  const json2 = await res2.json();
  console.log(`[City: Surat]          status=${res2.status}  count=${json2.count}`);

  // Test 3: impossible filter (should be 0)
  const req3 = new Request('http://localhost/api/v1/matching/search/count?cities=Timbuktu', {
    headers: { 'x-user-id': viewer.id },
  });
  const res3 = await GET(req3);
  const json3 = await res3.json();
  console.log(`[City: Timbuktu]       status=${res3.status}  count=${json3.count}`);

  console.log('\n✓ count <= broad is expected (Surat ≤ all cities)');
  console.log('✓ count for Timbuktu should be 0');
  process.exit(0);
}
main().catch(console.error);
