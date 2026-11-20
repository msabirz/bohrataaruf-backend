-- Blog posts written in the admin panel (Admin > Blog) and shown on /blog.
-- The body is Markdown. Only rows with status 'published' are public.
CREATE TABLE IF NOT EXISTS "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"author_name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid REFERENCES "volunteers"("id") ON DELETE SET NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug"),
	CONSTRAINT "blog_posts_status_check" CHECK ("status" IN ('draft', 'published'))
);
CREATE INDEX IF NOT EXISTS "blog_posts_status_published_idx" ON "blog_posts" ("status", "published_at" DESC);
