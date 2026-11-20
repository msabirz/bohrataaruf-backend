import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { blogPosts } from '@/lib/db/schema';

export type BlogPost = typeof blogPosts.$inferSelect;

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

/** Published posts, newest first. Never throws: a database problem must not break the page. */
export async function listPublishedPosts(): Promise<BlogPost[]> {
  try {
    return await db.select().from(blogPosts).where(eq(blogPosts.status, 'published')).orderBy(desc(blogPosts.publishedAt));
  } catch (error) {
    console.error('[Blog list]', error);
    return [];
  }
}

export async function getPublishedPost(slug: string): Promise<BlogPost | null> {
  try {
    const rows = await db.select().from(blogPosts).where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, 'published'))).limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('[Blog post]', error);
    return null;
  }
}

/** Rough reading time, for the post header. */
export function readingMinutes(body: string): number {
  return Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 200));
}

/** What the admin editor may send. Used by both the create and the update route. */
export const PostBody = z.object({
  title: z.string('Title is required').trim().min(1, 'Title is required').max(160),
  slug: z.string().trim().max(80).optional(),
  excerpt: z.string().trim().max(300).default(''),
  body: z.string().max(60000).default(''),
  authorName: z.string('Author name is required').trim().min(1, 'Author name is required').max(80),
  status: z.enum(['draft', 'published']).default('draft'),
});
