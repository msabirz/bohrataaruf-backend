-- "Share your biodata" module (web only).
--
-- share_settings        one row per user: master switch + what to show
-- share_extra_details   her own free-form details (father's name, native place...);
--                       deliberately a separate table, never joined into browsing queries
-- share_links           named links she makes (max 5 active, enforced in code)
-- share_link_opens      one row per REAL open (bots/chat previews never recorded);
--                       no IP address stored; pruned after 90 days by a cleanup job
-- share_promo_settings  single admin-editable row for the promo block on the shared page
-- users.referred_by_link_id / referral_name_consent
--                       which link a new signup came from, and whether they agreed to
--                       be named (first name) to the person who shared it

CREATE TABLE IF NOT EXISTS "share_settings" (
	"user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
	"sharing_enabled" boolean DEFAULT true NOT NULL,
	"name_mode" text DEFAULT 'first' NOT NULL,
	"photo_mode" text DEFAULT 'blurred' NOT NULL,
	"visible_fields" jsonb DEFAULT '["age","maritalStatus","city"]'::jsonb NOT NULL,
	"max_active_links" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone,
	CONSTRAINT "share_settings_name_mode_check" CHECK ("name_mode" IN ('first', 'full')),
	CONSTRAINT "share_settings_photo_mode_check" CHECK ("photo_mode" IN ('blurred', 'own'))
);

CREATE TABLE IF NOT EXISTS "share_extra_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "share_extra_details_user_idx" ON "share_extra_details" ("user_id");

CREATE TABLE IF NOT EXISTS "share_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"label" text NOT NULL,
	"token" text NOT NULL UNIQUE,
	-- 'one_view' | '24h' | '3d' | '7d' | '30d'
	"expiry_kind" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	-- set when a one-view link has been opened by a real person
	"used_at" timestamp with time zone,
	-- set when she stops the link, or switches sharing off (links never revive)
	"stopped_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "share_links_expiry_kind_check" CHECK ("expiry_kind" IN ('one_view', '24h', '3d', '7d', '30d'))
);
CREATE INDEX IF NOT EXISTS "share_links_user_idx" ON "share_links" ("user_id");

CREATE TABLE IF NOT EXISTS "share_link_opens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"link_id" uuid NOT NULL REFERENCES "share_links"("id") ON DELETE CASCADE,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	-- 'iphone' | 'android' | 'desktop' | 'other'
	"device" text NOT NULL DEFAULT 'other',
	-- 'whatsapp' | 'instagram' | 'facebook' | 'direct' | 'other'
	"source" text NOT NULL DEFAULT 'other'
);
CREATE INDEX IF NOT EXISTS "share_link_opens_link_idx" ON "share_link_opens" ("link_id", "opened_at");
CREATE INDEX IF NOT EXISTS "share_link_opens_opened_at_idx" ON "share_link_opens" ("opened_at");

CREATE TABLE IF NOT EXISTS "share_promo_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1,
	"promo_text" text NOT NULL DEFAULT 'Find more such profiles on Bohra Taaruf. Join, and follow us on Instagram for updates.',
	"join_label" text NOT NULL DEFAULT 'Join Bohra Taaruf',
	"instagram_url" text NOT NULL DEFAULT 'https://www.instagram.com/bohrataaruf',
	"site_url" text NOT NULL DEFAULT 'https://bohrataaruf.com',
	"updated_at" timestamp with time zone,
	CONSTRAINT "share_promo_settings_single_row" CHECK ("id" = 1)
);
INSERT INTO "share_promo_settings" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referred_by_link_id" uuid REFERENCES "share_links"("id") ON DELETE SET NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referral_name_consent" boolean DEFAULT false NOT NULL;
