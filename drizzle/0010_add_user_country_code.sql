ALTER TABLE "users" ADD COLUMN "country_code" text NOT NULL DEFAULT '+91';
ALTER TABLE "users" DROP CONSTRAINT "users_phone_unique";
ALTER TABLE "users" ADD CONSTRAINT "users_phone_country_code_unique" UNIQUE("phone","country_code");
