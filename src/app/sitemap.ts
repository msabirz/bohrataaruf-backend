import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { taarufPrograms, blogPosts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

// Only the genuinely public, indexable pages — every authenticated app
// route (/discover, /profile, /matches, etc.) and /admin is deliberately
// excluded (see robots.ts, which also disallows them for crawlers).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/signup`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/events`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/smart-taaruf-card`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/how-it-works`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/faq`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/glossary`, changeFrequency: 'monthly', priority: 0.7 },
  ];

  const programs = await db.select({ slug: taarufPrograms.slug, updatedAt: taarufPrograms.updatedAt })
    .from(taarufPrograms)
    .where(eq(taarufPrograms.status, 'published'));

  const programRoutes: MetadataRoute.Sitemap = programs.map((p) => ({
    url: `${SITE_URL}/events/${p.slug}`,
    lastModified: p.updatedAt ?? undefined,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // The blog index is listed only once there is something to read.
  const posts = await db.select({ slug: blogPosts.slug, updatedAt: blogPosts.updatedAt })
    .from(blogPosts)
    .where(eq(blogPosts.status, 'published'));
  const blogRoutes: MetadataRoute.Sitemap = posts.length
    ? [
        { url: `${SITE_URL}/blog`, changeFrequency: 'weekly', priority: 0.7 },
        ...posts.map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: p.updatedAt, changeFrequency: 'monthly' as const, priority: 0.6 })),
      ]
    : [];

  return [...staticRoutes, ...programRoutes, ...blogRoutes];
}
