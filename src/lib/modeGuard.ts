import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { siteSettings } from '@/lib/db/schema';

/**
 * Site mode: 'B' = pre-launch (default), 'A' = full experience (launch).
 *
 * An admin changes it in Admin > Settings; it is stored in the site_settings table.
 * If nothing has been saved there yet, or the database cannot be read, the SITE_MODE
 * environment variable is used instead, so the site behaves exactly as before until
 * someone changes the setting. Anything other than 'A' means 'B'.
 */
export type SiteMode = 'A' | 'B';

export const SITE_MODE_KEY = 'site_mode';

// Short in-memory cache so the routes that check the mode on every request do not
// each hit the database. A change made in the admin shows up everywhere within this
// long (plus the page cache, which the admin save clears at once).
const CACHE_MS = 15_000;
let cached: { mode: SiteMode; at: number } | null = null;

/** The environment variable's value: the default, and the fallback if the database fails. */
export function envSiteMode(): SiteMode {
  return process.env.SITE_MODE === 'A' ? 'A' : 'B';
}

/**
 * `fresh: true` skips the memory cache. The homepage uses it: it is rendered rarely (and
 * cached by Next), and when it is re-rendered right after an admin change it must not
 * pick up a copy of the old value from this instance's memory.
 */
export async function getSiteMode(options: { fresh?: boolean } = {}): Promise<SiteMode> {
  const now = Date.now();
  if (!options.fresh && cached && now - cached.at < CACHE_MS) return cached.mode;
  try {
    const row = await db.select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, SITE_MODE_KEY)).limit(1).then((r) => r[0]);
    const mode: SiteMode = row ? (row.value === 'A' ? 'A' : 'B') : envSiteMode();
    cached = { mode, at: now };
    return mode;
  } catch (error) {
    console.warn('[modeGuard] could not read the site mode, using the last known value or the environment:', error instanceof Error ? error.message : error);
    // Prefer the last value we knew over suddenly changing behaviour because of a blip.
    return cached ? cached.mode : envSiteMode();
  }
}

export async function isModeB(): Promise<boolean> {
  return (await getSiteMode()) === 'B';
}

/** Called right after an admin saves, so this server instance sees the change at once. */
export function clearSiteModeCache(): void {
  cached = null;
}
