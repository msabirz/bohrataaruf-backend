import { db } from './src/lib/db';
import { users, verifications } from './src/lib/db/schema';
import { sql } from 'drizzle-orm';

async function main() {
  // 1. Find our test subjects
  // A: Verified female
  const A = await db.execute(sql`
    SELECT u.id, u.gender, v.status 
    FROM users u JOIN verifications v ON u.id = v.user_id 
    WHERE v.status = 'verified' AND u.gender = 'female' LIMIT 1
  `).then(res => (res as any).rows[0]);

  // B: Unverified male
  const B = await db.execute(sql`
    SELECT u.id, u.gender, v.status 
    FROM users u JOIN verifications v ON u.id = v.user_id 
    WHERE v.status IS DISTINCT FROM 'verified' AND u.gender = 'male' LIMIT 1
  `).then(res => (res as any).rows[0]);

  // C: Unverified female
  const C = await db.execute(sql`
    SELECT u.id, u.gender, v.status 
    FROM users u JOIN verifications v ON u.id = v.user_id 
    WHERE v.status IS DISTINCT FROM 'verified' AND u.gender = 'female' AND u.id != ${A?.id} LIMIT 1
  `).then(res => (res as any).rows[0]);

  console.log('--- TEST ACCOUNTS ---');
  console.log(`A (Verified Female): ${A?.id}`);
  console.log(`B (Unverified Male) : ${B?.id}, Status: ${B?.status}`);
  console.log(`C (Unverified Female): ${C?.id}, Status: ${C?.status}`);

  if (!A || !B || !C) {
    console.log("Could not find suitable test accounts");
    return process.exit(1);
  }

  // Define the EXACT base query from getNextMatch
  const runGetNextMatchAs = async (viewerId: string, viewerGender: string) => {
    const query = sql`
      SELECT u.id, v.status as candidate_status
      FROM users u
      JOIN profiles p ON u.id = p.user_id
      JOIN verifications v ON u.id = v.user_id
      WHERE u.id != ${viewerId}
        AND u.is_active = true
        AND u.gender IS DISTINCT FROM ${viewerGender}
        AND v.status = 'verified'
        AND NOT EXISTS (
          SELECT 1 FROM interactions i WHERE i.user_id = ${viewerId} AND i.target_id = u.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM interactions their_i WHERE their_i.user_id = u.id AND their_i.target_id = ${viewerId} AND their_i.action = 'interested'
        )
        AND NOT EXISTS (
          SELECT 1 FROM matches m WHERE (m.user_a = ${viewerId} AND m.user_b = u.id) OR (m.user_a = u.id AND m.user_b = ${viewerId})
        )
    `;
    const res = await db.execute(query);
    return (res as any).rows;
  };

  console.log('\n--- TEST 1: Viewer is B (Unverified Male) ---');
  const resultsForB = await runGetNextMatchAs(B.id, B.gender);
  const foundAInB = resultsForB.find((r: any) => r.id === A.id);
  const foundCInB = resultsForB.find((r: any) => r.id === C.id);
  console.log(`Does A (Verified) appear?   ${foundAInB ? 'YES' : 'NO'}`);
  console.log(`Does C (Unverified) appear? ${foundCInB ? 'YES' : 'NO'}`);
  
  // Test with another unverified male as the viewer, to check C's visibility from C's perspective? 
  // The user asked: "Same test logged in as C."
  // If C (Unverified Female) is logged in, she looks for males. So let's find D (Verified Male) and E (Unverified Male).
  
  const D = await db.execute(sql`
    SELECT u.id, u.gender, v.status 
    FROM users u JOIN verifications v ON u.id = v.user_id 
    WHERE v.status = 'verified' AND u.gender = 'male' AND u.id != ${B.id} LIMIT 1
  `).then(res => (res as any).rows[0]);
  
  console.log('\n--- TEST 2: Viewer is C (Unverified Female) ---');
  console.log(`D (Verified Male)   : ${D?.id}`);
  const resultsForC = await runGetNextMatchAs(C.id, C.gender);
  const foundDInC = resultsForC.find((r: any) => r.id === D?.id);
  const foundBInC = resultsForC.find((r: any) => r.id === B.id);
  
  console.log(`Does D (Verified) appear?   ${foundDInC ? 'YES' : 'NO'}`);
  console.log(`Does B (Unverified) appear? ${foundBInC ? 'YES' : 'NO'}`);

  process.exit(0);
}

main().catch(console.error);
