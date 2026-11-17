import { db } from '@/lib/db';
import { shareLinks, shareSettings, users, notificationsLog } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { tidyName } from './text';

export const REFERRAL_NOTIFICATION_TYPE = 'share_referral_joined';
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ReferralLink { id: string; ownerId: string; label: string }

/**
 * A new signup may be mapped to a share link only while that link is not stopped
 * and its owner still has sharing on. Used and expired links still count: the
 * visitor opened it legitimately before tapping Join. Never throws.
 */
export async function resolveReferralLink(linkId: string | null | undefined): Promise<ReferralLink | null> {
  if (!linkId || !UUID_RE.test(linkId)) return null;
  try {
    const row = await db
      .select({ id: shareLinks.id, ownerId: shareLinks.userId, label: shareLinks.label, stoppedAt: shareLinks.stoppedAt, sharingEnabled: shareSettings.sharingEnabled })
      .from(shareLinks)
      .leftJoin(shareSettings, eq(shareSettings.userId, shareLinks.userId))
      .where(eq(shareLinks.id, linkId))
      .limit(1)
      .then((r) => r[0]);
    if (!row || row.stoppedAt || row.sharingEnabled === false) return null;
    return { id: row.id, ownerId: row.ownerId, label: row.label };
  } catch (e) {
    console.warn('[referral] resolve failed:', e);
    return null;
  }
}

/**
 * Tells the person who shared (via the bell) that someone joined from her link.
 * By default only the link's label is shown. A first name is included only when
 * the new person agreed to it. The notification never carries the new user's id.
 * Never throws: a failed notification must not break signup or onboarding.
 */
export async function notifyReferralJoined(link: ReferralLink, firstName?: string): Promise<void> {
  try {
    const name = firstName ? tidyName(firstName).split(' ')[0] : '';
    const title = name ? `${name} joined from your “${link.label}” link` : `Someone you shared “${link.label}” with has joined`;
    const body = name
      ? 'They chose to let you know. Only their first name is shown.'
      : 'A person joined Bohra Taaruf from your link.';
    await db.insert(notificationsLog).values({ userId: link.ownerId, type: REFERRAL_NOTIFICATION_TYPE, title, body, relatedId: null });
  } catch (e) {
    console.warn('[referral] notify failed:', e);
  }
}

/** Maps a brand-new user to the link they came from. Returns the link, or null if it did not qualify. */
export async function attachReferral(newUserId: string, linkId: string | null | undefined, consent: boolean): Promise<ReferralLink | null> {
  const link = await resolveReferralLink(linkId);
  if (!link || link.ownerId === newUserId) return null;
  try {
    await db.update(users).set({ referredByLinkId: link.id, referralNameConsent: consent }).where(and(eq(users.id, newUserId)));
    return link;
  } catch (e) {
    console.warn('[referral] attach failed:', e);
    return null;
  }
}
