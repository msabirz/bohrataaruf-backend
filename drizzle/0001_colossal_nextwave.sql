
CREATE TABLE "withdrawal_log" (
	"user_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"withdrawn_count" integer DEFAULT 0 NOT NULL,
	"last_withdrawn_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "withdrawal_log_user_id_target_id_pk" PRIMARY KEY("user_id","target_id")
);
--> statement-breakpoint
ALTER TABLE "verifications" ADD COLUMN "card_image_key" text;--> statement-breakpoint
ALTER TABLE "withdrawal_log" ADD CONSTRAINT "withdrawal_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_log" ADD CONSTRAINT "withdrawal_log_target_id_users_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;