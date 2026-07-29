import { db } from './src/lib/db';
import { reports, interactions } from './src/lib/db/schema';
import { sql } from 'drizzle-orm';

async function main() {
  const allReports = await db.select().from(reports).execute();
  console.log('--- ALL REPORTS ---');
  console.log(allReports);
  
  if (allReports.length > 0) {
    const r = allReports[0];
    const viewerId = r.reporterId;
    const candidateId = r.reportedUserId;
    
    console.log(`\n--- TESTING EXCLUSION LOGIC FOR viewer: ${viewerId}, candidate: ${candidateId} ---`);
    const res = await db.execute(sql`
      SELECT 1 FROM reports r 
      WHERE r.reporter_id = ${viewerId} 
        AND r.reported_user_id = ${candidateId} 
        AND r.status IN ('pending', 'reviewed', 'actioned')
    `);
    console.log('Result of EXISTS subquery:', res.rows);
    console.log('NOT EXISTS would evaluate to:', res.rows.length === 0);
  }
}
main().catch(console.error).finally(() => process.exit(0));
