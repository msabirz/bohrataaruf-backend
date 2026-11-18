import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { isBot } from '@/lib/botDetection';
import { parseDevice, parseSource } from '@/lib/share/links';
import { openLink, peekLink } from '@/lib/share/resolve';
import { loadSharedProfile } from '@/lib/share/loadSharedProfile';
import { getSharePromo } from '@/lib/share/promo';
import { SharedPageView, EndedPageView, RateLimitedView } from '@/components/share/SharedPageView';
import { allowRequest } from '@/lib/rateLimit';
import { visitorKey } from '@/lib/share/visitor';

// Link state changes at any moment (stopped, used, switched off) — never cache.
export const dynamic = 'force-dynamic';

const BASE_META: Metadata = {
  title: 'Biodata · Bohra Taaruf',
  description: 'A biodata shared with you on Bohra Taaruf.',
  robots: { index: false, follow: false },
};

/**
 * Link-preview card (WhatsApp / Instagram / etc). Reads the link WITHOUT consuming
 * it, and only ever exposes first name, age and city (if she left those on) — a
 * chat card lives in the chat forever, so it stays minimal whatever the page shows.
 */
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const ctx = await peekLink(token);
  if (!ctx || ctx.status !== 'active') return BASE_META;
  const p = await loadSharedProfile(ctx.link.userId, { includePhoto: false });
  if (!p) return BASE_META;

  const bits = [p.showAge && p.age != null ? String(p.age) : null, p.showCity ? p.city : null].filter(Boolean);
  const title = bits.length ? `${p.firstName}, ${bits.join(' · ')}` : p.firstName;
  return {
    ...BASE_META,
    title: `${title} · Bohra Taaruf`,
    openGraph: { title, description: 'A biodata shared with you on Bohra Taaruf.', type: 'website', siteName: 'Bohra Taaruf' },
  };
}

export default async function SharedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const headerStore = await headers();
  const ua = headerStore.get('user-agent');
  const promo = await getSharePromo();

  // Link-preview crawlers get a neutral page and never spend a one-view link;
  // the preview card itself comes from generateMetadata + opengraph-image.
  if (isBot(ua)) return <EndedPageView promo={promo} />;

  // Rate limit real visitors before any database work: per visitor address, and per link
  // and visitor so reloading one link cannot inflate its opens. Fails open if Upstash is down.
  const visitor = visitorKey(headerStore);
  if (!(await allowRequest('sharePublicView', visitor)) || !(await allowRequest('sharePublicViewLink', `${token}:${visitor}`))) {
    return <RateLimitedView />;
  }

  const ctx = await openLink(token, {
    device: parseDevice(ua),
    source: parseSource(ua, headerStore.get('referer')),
  });
  if (!ctx) return <EndedPageView promo={promo} />;

  const profile = await loadSharedProfile(ctx.link.userId);
  if (!profile) return <EndedPageView promo={promo} />;

  return <SharedPageView profile={profile} promo={promo} joinHref={`/signup?ref=${ctx.link.id}`} />;
}
