import { db } from '@/lib/db';
import { sharePromoSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface SharePromo {
  promoText: string;
  joinLabel: string;
  instagramUrl: string;
  siteUrl: string;
}

const FALLBACK: SharePromo = {
  promoText: 'Find more such profiles on Bohra Taaruf. Join, and follow us on Instagram for updates.',
  joinLabel: 'Join Bohra Taaruf',
  instagramUrl: 'https://www.instagram.com/bohrataaruf',
  siteUrl: 'https://bohrataaruf.com',
};

/** The admin-editable promo block shown under every shared page. Never throws. */
export async function getSharePromo(): Promise<SharePromo> {
  try {
    const row = await db.select().from(sharePromoSettings).where(eq(sharePromoSettings.id, 1)).limit(1).then((r) => r[0]);
    if (!row) return FALLBACK;
    return { promoText: row.promoText, joinLabel: row.joinLabel, instagramUrl: row.instagramUrl, siteUrl: row.siteUrl };
  } catch {
    return FALLBACK;
  }
}
