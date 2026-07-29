CREATE TABLE "push_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "token" text NOT NULL,
  "platform" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "push_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "push_preferences" (
  "user_id" uuid PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "matches_enabled" boolean DEFAULT true NOT NULL,
  "received_interests_enabled" boolean DEFAULT true NOT NULL,
  "verification_updates_enabled" boolean DEFAULT true NOT NULL,
  "handoff_updates_enabled" boolean DEFAULT true NOT NULL
);
