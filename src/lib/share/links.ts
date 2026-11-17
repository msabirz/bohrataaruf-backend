import crypto from 'crypto';

export const EXPIRY_KINDS = ['one_view', '24h', '3d', '7d', '30d'] as const;
export type ExpiryKind = (typeof EXPIRY_KINDS)[number];

export const DEFAULT_MAX_ACTIVE_LINKS = 5;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** A one-view link also gets an outer lifetime so an unopened link doesn't live forever. */
const EXPIRY_MS: Record<ExpiryKind, number> = {
  one_view: 30 * DAY,
  '24h': 24 * HOUR,
  '3d': 3 * DAY,
  '7d': 7 * DAY,
  '30d': 30 * DAY,
};

export function expiresAtFor(kind: ExpiryKind, now = new Date()): Date {
  return new Date(now.getTime() + EXPIRY_MS[kind]);
}

/** 128 bits of randomness, URL-safe (22 chars). */
export function generateLinkToken(): string {
  return crypto.randomBytes(16).toString('base64url');
}

export type LinkStatus = 'active' | 'used' | 'expired' | 'stopped';

export function linkStatus(
  link: { usedAt: Date | null; stoppedAt: Date | null; expiresAt: Date },
  sharingEnabled: boolean,
  now = new Date(),
): LinkStatus {
  if (link.stoppedAt || !sharingEnabled) return 'stopped';
  if (link.usedAt) return 'used';
  if (link.expiresAt.getTime() <= now.getTime()) return 'expired';
  return 'active';
}

export type OpenDevice = 'iphone' | 'android' | 'desktop' | 'other';
export type OpenSource = 'whatsapp' | 'instagram' | 'facebook' | 'direct' | 'other';

export function parseDevice(ua: string | null | undefined): OpenDevice {
  if (!ua) return 'other';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iphone';
  if (/Android/i.test(ua)) return 'android';
  if (/Windows|Macintosh|X11|CrOS|Linux/i.test(ua)) return 'desktop';
  return 'other';
}

/** Best-effort: where the visitor came from. Never stores the referrer itself. */
export function parseSource(ua: string | null | undefined, referer: string | null | undefined): OpenSource {
  if (ua && /Instagram/i.test(ua)) return 'instagram';
  if (ua && /FBAN|FBAV|FB_IAB/i.test(ua)) return 'facebook';
  if (ua && /WhatsApp/i.test(ua)) return 'whatsapp';
  if (referer) {
    let host = '';
    try { host = new URL(referer).hostname; } catch { /* ignore */ }
    if (/whatsapp|wa\.me/i.test(host)) return 'whatsapp';
    if (/instagram/i.test(host)) return 'instagram';
    if (/facebook|fb\.com/i.test(host)) return 'facebook';
    return 'other';
  }
  return 'direct';
}
