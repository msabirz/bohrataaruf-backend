-- Site-wide settings that an admin can change without a redeploy. First use: "site_mode"
-- ('A' = launch, 'B' = pre-launch), which used to be the SITE_MODE environment variable.
-- When there is no row for a key, the code falls back to the environment variable.
CREATE TABLE IF NOT EXISTS "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	"updated_by" uuid REFERENCES "volunteers"("id") ON DELETE SET NULL
);
