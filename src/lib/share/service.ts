import crypto from 'crypto';
import { db, executeQuery } from '@/lib/db';
import { users, shareSettings, shareExtraDetails, shareLinks, shareLinkOpens } from '@/lib/db/schema';
import { and, asc, desc, eq, sql, count, isNull, gt, inArray } from 'drizzle-orm';
import { containsContactInfo } from './contactGuard';
import { sanitizeVisibleFields, type ShareFieldKey } from './fields';
import { DEFAULT_MAX_ACTIVE_LINKS, expiresAtFor, generateLinkToken, linkStatus, type ExpiryKind, type LinkStatus } from './links';

export class ShareError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = 'ShareError';
  }
}

export const MAX_EXTRA_DETAILS = 8;
export const LABEL_MAX = 40;
export const DETAIL_LABEL_MAX = 40;
export const DETAIL_VALUE_MAX = 200;

export interface ShareSettingsDto {
  sharingEnabled: boolean;
  nameMode: 'first' | 'full';
  photoMode: 'blurred' | 'own';
  visibleFields: ShareFieldKey[];
  maxActiveLinks: number;
}

export interface ShareLinkDto {
  id: string;
  label: string;
  token: string;
  path: string;
  expiryKind: ExpiryKind;
  status: LinkStatus;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  stoppedAt: string | null;
  opens: number;
  lastOpenedAt: string | null;
  joined: number;
}

function toSettingsDto(row: typeof shareSettings.$inferSelect): ShareSettingsDto {
  return {
    sharingEnabled: row.sharingEnabled,
    nameMode: row.nameMode === 'full' ? 'full' : 'first',
    photoMode: row.photoMode === 'own' ? 'own' : 'blurred',
    visibleFields: sanitizeVisibleFields(row.visibleFields),
    maxActiveLinks: row.maxActiveLinks,
  };
}

/** Settings row is created lazily the first time she touches Share. */
export async function ensureSettings(userId: string) {
  await db.insert(shareSettings).values({ userId }).onConflictDoNothing();
  const row = await db.select().from(shareSettings).where(eq(shareSettings.userId, userId)).limit(1).then((r) => r[0]);
  return row;
}

export async function listLinks(userId: string, sharingEnabled: boolean): Promise<ShareLinkDto[]> {
  const links = await db.select().from(shareLinks).where(eq(shareLinks.userId, userId)).orderBy(desc(shareLinks.createdAt));
  if (links.length === 0) return [];
  const ids = links.map((l) => l.id);

  const openRows = await db
    .select({ linkId: shareLinkOpens.linkId, opens: count(), last: sql<string | null>`max(${shareLinkOpens.openedAt})` })
    .from(shareLinkOpens)
    .where(inArray(shareLinkOpens.linkId, ids))
    .groupBy(shareLinkOpens.linkId);
  const opensBy = new Map(openRows.map((r) => [r.linkId, r]));

  const joinedRows = await db
    .select({ linkId: users.referredByLinkId, joined: count() })
    .from(users)
    .where(inArray(users.referredByLinkId, ids))
    .groupBy(users.referredByLinkId);
  const joinedBy = new Map(joinedRows.map((r) => [r.linkId as string, r.joined]));

  const now = new Date();
  return links.map((l) => ({
    id: l.id,
    label: l.label,
    token: l.token,
    path: `/s/${l.token}`,
    expiryKind: l.expiryKind as ExpiryKind,
    status: linkStatus(l, sharingEnabled, now),
    createdAt: (l.createdAt ?? now).toISOString(),
    expiresAt: l.expiresAt.toISOString(),
    usedAt: l.usedAt ? l.usedAt.toISOString() : null,
    stoppedAt: l.stoppedAt ? l.stoppedAt.toISOString() : null,
    opens: opensBy.get(l.id)?.opens ?? 0,
    lastOpenedAt: opensBy.get(l.id)?.last ? new Date(opensBy.get(l.id)!.last as string).toISOString() : null,
    joined: joinedBy.get(l.id) ?? 0,
  }));
}

export async function getOverview(userId: string) {
  const settingsRow = await ensureSettings(userId);
  const settings = toSettingsDto(settingsRow);
  const [links, details] = await Promise.all([
    listLinks(userId, settings.sharingEnabled),
    db.select({ id: shareExtraDetails.id, label: shareExtraDetails.label, value: shareExtraDetails.value })
      .from(shareExtraDetails).where(eq(shareExtraDetails.userId, userId))
      .orderBy(asc(shareExtraDetails.sortOrder), asc(shareExtraDetails.createdAt)),
  ]);
  return {
    settings,
    details,
    links,
    activeCount: links.filter((l) => l.status === 'active').length,
    totals: {
      links: links.length,
      opens: links.reduce((s, l) => s + l.opens, 0),
      joined: links.reduce((s, l) => s + l.joined, 0),
    },
  };
}

export async function updateSettings(
  userId: string,
  patch: { nameMode?: 'first' | 'full'; photoMode?: 'blurred' | 'own'; visibleFields?: unknown },
  opts: { password?: string } = {},
) {
  const current = await ensureSettings(userId);
  const set: Partial<typeof shareSettings.$inferInsert> = {};
  if (patch.nameMode) set.nameMode = patch.nameMode;
  if (patch.visibleFields !== undefined) set.visibleFields = sanitizeVisibleFields(patch.visibleFields);
  if (patch.photoMode) {
    if (patch.photoMode === 'own' && current.photoMode !== 'own') {
      // Step-up: showing her real photo to anyone with a link needs her password again.
      const ok = opts.password ? await verifyPassword(userId, opts.password) : false;
      if (!ok) throw new ShareError('Please confirm your password to show your own photo', 403);
    }
    set.photoMode = patch.photoMode;
  }
  if (Object.keys(set).length > 0) {
    await db.update(shareSettings).set(set).where(eq(shareSettings.userId, userId));
  }
  const row = await db.select().from(shareSettings).where(eq(shareSettings.userId, userId)).limit(1).then((r) => r[0]);
  return toSettingsDto(row);
}

async function verifyPassword(userId: string, password: string): Promise<boolean> {
  const row = await db.select({ h: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1).then((r) => r[0]);
  if (!row?.h) return false;
  return row.h === crypto.createHash('sha256').update(password).digest('hex');
}

/** Switching OFF kills every link for good — turning it back on does not revive them. */
export async function setSharingEnabled(userId: string, enabled: boolean) {
  await ensureSettings(userId);
  if (!enabled) {
    await db.update(shareLinks).set({ stoppedAt: new Date() }).where(and(eq(shareLinks.userId, userId), isNull(shareLinks.stoppedAt)));
  }
  await db.update(shareSettings).set({ sharingEnabled: enabled }).where(eq(shareSettings.userId, userId));
}

export async function createLink(userId: string, labelRaw: string, kind: ExpiryKind) {
  const label = labelRaw.trim();
  if (!label) throw new ShareError('Give the link a name so you remember who has it');
  if (label.length > LABEL_MAX) throw new ShareError(`Name is too long (max ${LABEL_MAX} characters)`);
  if (containsContactInfo(label)) throw new ShareError('Please do not put a phone number or email in the link name');

  const settings = await ensureSettings(userId);
  if (!settings.sharingEnabled) throw new ShareError('Sharing is switched off. Switch it on to make a link', 409);

  const [{ active }] = await db
    .select({ active: count() })
    .from(shareLinks)
    .where(and(eq(shareLinks.userId, userId), isNull(shareLinks.stoppedAt), isNull(shareLinks.usedAt), gt(shareLinks.expiresAt, new Date())));
  const max = settings.maxActiveLinks ?? DEFAULT_MAX_ACTIVE_LINKS;
  if (active >= max) {
    throw new ShareError(`You can have ${max} active links at a time. Stop one, or email support@bohrataaruf.com to raise the limit`, 409);
  }

  const [row] = await db
    .insert(shareLinks)
    .values({ userId, label, token: generateLinkToken(), expiryKind: kind, expiresAt: expiresAtFor(kind) })
    .returning();
  return { id: row.id, token: row.token, path: `/s/${row.token}` };
}

export async function stopLink(userId: string, linkId: string) {
  const res = await executeQuery(sql`
    UPDATE share_links SET stopped_at = now()
    WHERE id = ${linkId} AND user_id = ${userId} AND stopped_at IS NULL
    RETURNING id
  `);
  if (res.length === 0) {
    const exists = await db.select({ id: shareLinks.id }).from(shareLinks).where(and(eq(shareLinks.id, linkId), eq(shareLinks.userId, userId))).limit(1);
    if (exists.length === 0) throw new ShareError('Link not found', 404);
  }
}

export async function getLinkDetail(userId: string, linkId: string) {
  const settings = await ensureSettings(userId);
  const all = await listLinks(userId, settings.sharingEnabled);
  const link = all.find((l) => l.id === linkId);
  if (!link) throw new ShareError('Link not found', 404);
  const opens = await db
    .select({ openedAt: shareLinkOpens.openedAt, device: shareLinkOpens.device, source: shareLinkOpens.source })
    .from(shareLinkOpens)
    .where(eq(shareLinkOpens.linkId, linkId))
    .orderBy(desc(shareLinkOpens.openedAt))
    .limit(50);
  return { link, opens: opens.map((o) => ({ openedAt: o.openedAt.toISOString(), device: o.device, source: o.source })) };
}

export async function getActivity(userId: string, days: number) {
  const d = Math.min(Math.max(Math.floor(days) || 30, 1), 90);
  const since = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
  const rows = await executeQuery(sql`
    SELECT to_char(date_trunc('day', o.opened_at), 'YYYY-MM-DD') AS day, count(*)::int AS opens
    FROM share_link_opens o
    JOIN share_links l ON l.id = o.link_id
    WHERE l.user_id = ${userId} AND o.opened_at >= ${since.toISOString()}
    GROUP BY 1 ORDER BY 1
  `);
  const byDay = new Map<string, number>(rows.map((r: { day: string; opens: number }) => [r.day, r.opens]));
  const series: { day: string; opens: number }[] = [];
  for (let i = d - 1; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    series.push({ day: dt, opens: byDay.get(dt) ?? 0 });
  }
  return { days: d, series, totalOpens: series.reduce((s, r) => s + r.opens, 0) };
}

// ── Her own extra details ─────────────────────────────────────────────────────

function validateDetail(labelRaw: string, valueRaw: string) {
  const label = labelRaw.trim();
  const value = valueRaw.trim();
  if (!label || !value) throw new ShareError('Please fill both the title and the detail');
  if (label.length > DETAIL_LABEL_MAX) throw new ShareError(`Title is too long (max ${DETAIL_LABEL_MAX} characters)`);
  if (value.length > DETAIL_VALUE_MAX) throw new ShareError(`Detail is too long (max ${DETAIL_VALUE_MAX} characters)`);
  if (containsContactInfo(label) || containsContactInfo(value)) {
    throw new ShareError('Please do not put a phone number, email or social handle here. Anyone with your link can read it');
  }
  return { label, value };
}

export async function addDetail(userId: string, labelRaw: string, valueRaw: string) {
  const { label, value } = validateDetail(labelRaw, valueRaw);
  const [{ n }] = await db.select({ n: count() }).from(shareExtraDetails).where(eq(shareExtraDetails.userId, userId));
  if (n >= MAX_EXTRA_DETAILS) throw new ShareError(`You can add up to ${MAX_EXTRA_DETAILS} details`, 409);
  const [row] = await db.insert(shareExtraDetails).values({ userId, label, value, sortOrder: n }).returning({ id: shareExtraDetails.id, label: shareExtraDetails.label, value: shareExtraDetails.value });
  return row;
}

export async function updateDetail(userId: string, id: string, labelRaw: string, valueRaw: string) {
  const { label, value } = validateDetail(labelRaw, valueRaw);
  const rows = await db.update(shareExtraDetails).set({ label, value }).where(and(eq(shareExtraDetails.id, id), eq(shareExtraDetails.userId, userId))).returning({ id: shareExtraDetails.id, label: shareExtraDetails.label, value: shareExtraDetails.value });
  if (rows.length === 0) throw new ShareError('Detail not found', 404);
  return rows[0];
}

export async function deleteDetail(userId: string, id: string) {
  const rows = await db.delete(shareExtraDetails).where(and(eq(shareExtraDetails.id, id), eq(shareExtraDetails.userId, userId))).returning({ id: shareExtraDetails.id });
  if (rows.length === 0) throw new ShareError('Detail not found', 404);
}
