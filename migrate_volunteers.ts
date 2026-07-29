import { db } from './src/lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Querying existing foreign keys for verifications...');
  const res: any = await db.execute(sql`
    SELECT constraint_name 
    FROM information_schema.table_constraints 
    WHERE table_name = 'verifications' AND constraint_type = 'FOREIGN KEY'
  `);
  
  const fks = (res.rows || res).map((r: any) => r.constraint_name);
  console.log('Found FKs:', fks);
  
  // We expect something like 'verifications_reviewed_by_users_id_fk'
  // But let's just use a DO block to safely drop whatever constraint is on reviewed_by and add the new one.
  console.log('Applying schema changes (adding volunteers table & altering verifications FK)...');
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "volunteers" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "name" text NOT NULL,
      "active" boolean DEFAULT true NOT NULL,
      "created_at" timestamp DEFAULT now()
    );
  `);
  
  console.log('Created volunteers table.');
  
  const dropFkSql = `
    DO $$
    DECLARE constraint_name text;
    BEGIN
      SELECT tc.constraint_name INTO constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'verifications' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'reviewed_by';
      
      IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE "verifications" DROP CONSTRAINT ' || quote_ident(constraint_name);
      END IF;
    END $$;
  `;
  
  await db.execute(sql.raw(dropFkSql));
  console.log('Dropped old reviewed_by constraint if it existed.');
  
  await db.execute(sql`
    ALTER TABLE "verifications" ADD CONSTRAINT "verifications_reviewed_by_volunteers_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "volunteers"("id") ON DELETE set null ON UPDATE no action;
  `);
  console.log('Added new reviewed_by constraint pointing to volunteers.id.');
  
  console.log('Done.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
