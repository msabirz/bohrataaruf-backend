import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { taarufPrograms } from '@/lib/db/schema';
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

  return [...staticRoutes, ...programRoutes];
}
