CREATE TABLE IF NOT EXISTS "volunteers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now()
);

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

ALTER TABLE "verifications" ADD CONSTRAINT "verifications_reviewed_by_volunteers_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "volunteers"("id") ON DELETE set null ON UPDATE no action;
