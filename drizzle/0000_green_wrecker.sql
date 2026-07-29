CREATE TYPE "public"."interaction_action" AS ENUM('skip', 'interested', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."chunk_language" AS ENUM('en', 'gu', 'ur');--> statement-breakpoint
CREATE TYPE "public"."chunk_type" AS ENUM('opening', 'profession', 'family', 'partner_pref', 'closing');--> statement-breakpoint
CREATE TYPE "public"."family_expectation" AS ENUM('very_important', 'somewhat', 'flexible');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."handoff_status" AS ENUM('pending', 'shared');--> statement-breakpoint
CREATE TYPE "public"."preferred_language" AS ENUM('en', 'gu', 'ur');--> statement-breakpoint
CREATE TYPE "public"."marital_status" AS ENUM('never_married', 'divorced', 'widowed');--> statement-breakpoint
CREATE TYPE "public"."practice_level" AS ENUM('very_devout', 'practicing', 'moderate', 'flexible');--> statement-breakpoint
CREATE TYPE "public"."willing_to_relocate" AS ENUM('yes', 'no', 'depends');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TABLE "bio_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chunk_type" "chunk_type" NOT NULL,
	"condition_key" text,
	"template_text" text NOT NULL,
	"language" "chunk_language" DEFAULT 'en'
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"action" "interaction_action" NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "interactions_user_id_target_id_unique" UNIQUE("user_id","target_id")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_a" uuid NOT NULL,
	"user_b" uuid NOT NULL,
	"matched_at" timestamp DEFAULT now(),
	"handoff_a_status" "handoff_status" DEFAULT 'pending',
	"handoff_a_handles" jsonb,
	"handoff_b_status" "handoff_status" DEFAULT 'pending',
	"handoff_b_handles" jsonb,
	"suggested_opener" text,
	CONSTRAINT "matches_user_a_user_b_unique" UNIQUE("user_a","user_b"),
	CONSTRAINT "user_a_lt_user_b" CHECK ("matches"."user_a" < "matches"."user_b")
);
--> statement-breakpoint
CREATE TABLE "otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "photo_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"viewer_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"views_used" integer DEFAULT 0,
	"extra_view_requested" boolean DEFAULT false,
	"extra_view_approved" boolean,
	"last_viewed_at" timestamp,
	CONSTRAINT "photo_views_viewer_id_profile_id_unique" UNIQUE("viewer_id","profile_id")
);
--> statement-breakpoint
CREATE TABLE "preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"age_min" integer,
	"age_max" integer,
	"preferred_cities" text[],
	"preferred_education" text[],
	"preferred_professions" text[],
	"family_expectation" "family_expectation",
	"practice_level" "practice_level",
	"partner_quality_tags" text[]
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"alias" text NOT NULL,
	"education" text,
	"field_of_study" text,
	"profession" text,
	"willing_to_relocate" "willing_to_relocate",
	"marital_status" "marital_status",
	"bio_text" text,
	"intro_line" text,
	"photo_url" text,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"its_number_hash" text,
	"password_hash" text,
	"name" text NOT NULL,
	"gender" "gender",
	"date_of_birth" date NOT NULL,
	"city" text NOT NULL,
	"jamaat" text,
	"preferred_language" "preferred_language" DEFAULT 'gu',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_its_number_hash_unique" UNIQUE("its_number_hash")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "verification_status" DEFAULT 'pending',
	"rejection_reason" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"vouched_by" uuid,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "verifications_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_target_id_users_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_user_a_users_id_fk" FOREIGN KEY ("user_a") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_user_b_users_id_fk" FOREIGN KEY ("user_b") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_views" ADD CONSTRAINT "photo_views_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_views" ADD CONSTRAINT "photo_views_profile_id_users_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_vouched_by_users_id_fk" FOREIGN KEY ("vouched_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "interactions_user_action_idx" ON "interactions" USING btree ("user_id","action");--> statement-breakpoint
CREATE INDEX "interactions_target_id_idx" ON "interactions" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "matches_user_a_idx" ON "matches" USING btree ("user_a");--> statement-breakpoint
CREATE INDEX "matches_user_b_idx" ON "matches" USING btree ("user_b");--> statement-breakpoint
CREATE INDEX "otps_phone_idx" ON "otps" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "photo_views_viewer_profile_idx" ON "photo_views" USING btree ("viewer_id","profile_id");