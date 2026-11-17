import { db, executeQuery } from '@/lib/db';
import { shareLinks, shareSettings, shareLinkOpens } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { linkStatus, type LinkStatus, type OpenDevice, type OpenSource } from './links';

export type ShareLinkRow = typeof shareLinks.$inferSelect;

export interface LinkContext {
  link: ShareLinkRow;
  sharingEnabled: boolean;
  status: LinkStatus;
}

/** Looks a link up WITHOUT consuming or recording anything. Safe for bots / metadata. */
export async function peekLink(token: string): Promise<LinkContext | null> {
  if (!token || token.length > 64) return null;
  const rows = await db
    .select({ link: shareLinks, sharingEnabled: shareSettings.sharingEnabled })
    .from(shareLinks)
    .leftJoin(shareSettings, eq(shareSettings.userId, shareLinks.userId))
    .where(eq(shareLinks.token, token))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  // A user who never opened her settings has no share_settings row yet: defaults to enabled.
  const sharingEnabled = row.sharingEnabled ?? true;
  return { link: row.link, sharingEnabled, status: linkStatus(row.link, sharingEnabled) };
}

/**
 * A REAL person opens the link. Returns the context if the page may be shown,
 * or null if the link is missing / ended. For one-view links the claim is a
 * single atomic UPDATE, so two simultaneous openers can never both get in.
 * Records one open event (time, device, source — never an IP address).
 */
export async function openLink(
  token: string,
  meta: { device: OpenDevice; source: OpenSource },
): Promise<LinkContext | null> {
  const ctx = await peekLink(token);
  if (!ctx || ctx.status !== 'active') return null;

  if (ctx.link.expiryKind === 'one_view') {
    const claimed = await executeQuery(sql`
      UPDATE share_links
      SET used_at = now()
      WHERE id = ${ctx.link.id}
        AND used_at IS NULL
        AND stopped_at IS NULL
        AND expires_at > now()
      RETURNING id
    `);
    if (claimed.length === 0) return null;
  }

  await db.insert(shareLinkOpens).values({ linkId: ctx.link.id, device: meta.device, source: meta.source });
  return ctx;
}
