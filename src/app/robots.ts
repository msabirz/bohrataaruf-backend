import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/api',
        // Authenticated app routes — nothing behind login is meant to be
        // indexed; each of these already redirects an anonymous crawler
        // straight to '/' anyway (see (app)/layout.tsx).
        '/discover',
        '/interests',
        '/matches',
        '/photo-requests',
        '/profile',
        '/settings',
        '/verification',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
