CREATE TYPE "public"."photo_privacy_mode" AS ENUM('always', 'three_then_request', 'request_only', 'blur_until_match');
ALTER TABLE "profiles" ADD COLUMN "photo_privacy_mode" "photo_privacy_mode" DEFAULT 'three_then_request' NOT NULL;
ALTER TABLE "photo_views" ADD COLUMN "extra_view_approved_until" timestamp with time zone;
ALTER TABLE "push_preferences" ADD COLUMN "photo_requests_enabled" boolean DEFAULT true NOT NULL;
CREATE TABLE "photo_privacy_gender_rules" (
	"gender" "gender" PRIMARY KEY NOT NULL,
	"allowed_modes" "photo_privacy_mode"[] NOT NULL,
	"default_mode" "photo_privacy_mode" NOT NULL,
	"updated_at" timestamp
);
INSERT INTO "photo_privacy_gender_rules" ("gender", "allowed_modes", "default_mode") VALUES
	('female', ARRAY['always','three_then_request','request_only','blur_until_match']::"photo_privacy_mode"[], 'three_then_request'),
	('male', ARRAY['always','request_only','blur_until_match']::"photo_privacy_mode"[], 'request_only');
