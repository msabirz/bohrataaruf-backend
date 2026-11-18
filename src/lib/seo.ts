import type { Metadata } from 'next';

// Central place for the site's canonical public URL and shared JSON-LD
// builders — used by sitemap.ts, robots.ts, the marketing layout's
// Organization/SiteNavigationElement schema, and per-page BreadcrumbList
// schema, so the domain and org identity are defined in exactly one place.
export const SITE_URL = 'https://bohrataaruf.com';

const APP_NAME = process.env.APP_DISPLAY_NAME ?? 'Bohra Taaruf';

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: APP_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo-light.svg`,
    description: 'A verified, private, and thoughtful matchmaking platform exclusively for the Dawoodi Bohra community.',
    sameAs: ['https://www.instagram.com/bohrataaruf'],
  };
}

// Lets Google understand the site's primary navigation for potential
// sitelinks — algorithmic, not directly controllable, but this is the
// standard signal a real site provides.
export function siteNavigationJsonLd() {
  const items = [
    { name: 'About Us', url: `${SITE_URL}/about` },
    { name: 'Taaruf Programs', url: `${SITE_URL}/events` },
    { name: 'Contact', url: `${SITE_URL}/contact` },
    { name: 'Sign up', url: `${SITE_URL}/signup` },
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'SiteNavigationElement',
    name: items.map((i) => i.name),
    url: items.map((i) => i.url),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

/**
 * Per-page metadata for public pages: a unique title and description, a canonical
 * address, and matching Open Graph tags. `title` must NOT include the brand name,
 * because the marketing layout's title template adds " | Bohra Taaruf" itself.
 */
export function pageMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} | ${APP_NAME}`, description, url: `${SITE_URL}${path}`, siteName: APP_NAME, type: 'website', locale: 'en_US' },
  };
}

/** FAQPage structured data: lets search engines show the answers as expandable results. */
export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: i.q,
      acceptedAnswer: { '@type': 'Answer', text: i.a },
    })),
  };
}
