-- Create biodata_link_outcome enum
CREATE TYPE "biodata_link_outcome" AS ENUM ('pending', 'viewed', 'expired_unviewed');

-- Operational table: one active link per user, deleted on consume
CREATE TABLE IF NOT EXISTS "biodata_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "token" text NOT NULL UNIQUE,
  "created_at" timestamp DEFAULT now(),
  "expires_at" timestamp NOT NULL
);

-- Audit table: append-only, never deleted
CREATE TABLE IF NOT EXISTS "biodata_link_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "generated_at" timestamp DEFAULT now(),
  "expires_at" timestamp NOT NULL,
  "viewed_at" timestamp,
  "viewer_ip" text,
  "outcome" "biodata_link_outcome" DEFAULT 'pending' NOT NULL
);

-- Indexes for audit table lookups
CREATE INDEX IF NOT EXISTS "biodata_link_history_user_id_idx" ON "biodata_link_history" ("user_id");
CREATE INDEX IF NOT EXISTS "biodata_link_history_token_hash_idx" ON "biodata_link_history" ("token_hash");
