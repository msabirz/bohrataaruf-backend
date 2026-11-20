import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { siteSettings, volunteers, adminActionLog } from '@/lib/db/schema';
import { getAdminSession } from '@/lib/adminAuth';
import { SITE_MODE_KEY, clearSiteModeCache, envSiteMode, getSiteMode } from '@/lib/modeGuard';

/** What the Settings page shows: the live mode, where it comes from, and who changed it. */
async function describe() {
  const row = await db
    .select({ value: siteSettings.value, updatedAt: siteSettings.updatedAt, updatedByName: volunteers.name })
    .from(siteSettings)
    .leftJoin(volunteers, eq(volunteers.id, siteSettings.updatedBy))
    .where(eq(siteSettings.key, SITE_MODE_KEY))
    .limit(1)
    .then((r) => r[0]);
  return {
    mode: await getSiteMode(),
    source: row ? 'admin' : 'environment',
    environmentMode: envSiteMode(),
    updatedAt: row?.updatedAt ?? null,
    updatedByName: row?.updatedByName ?? null,
  };
}

const Body = z.object({
  mode: z.enum(['A', 'B']),
  // Switching to launch needs the word LAUNCH typed out, so it cannot happen by accident.
  confirm: z.string().optional(),
});

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  clearSiteModeCache();
  return NextResponse.json(await describe());
}

export async function PUT(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = Body.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: 'Mode must be A or B' }, { status: 400 });
    const { mode, confirm } = parsed.data;

    clearSiteModeCache();
    const before = await getSiteMode();
    if (before === mode) return NextResponse.json(await describe());

    if (mode === 'A' && confirm !== 'LAUNCH') {
      return NextResponse.json({ error: 'Type LAUNCH to confirm switching to launch mode' }, { status: 400 });
    }

    await db
      .insert(siteSettings)
      .values({ key: SITE_MODE_KEY, value: mode, updatedAt: new Date(), updatedBy: session.volunteerId })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value: mode, updatedAt: new Date(), updatedBy: session.volunteerId } });

    await db.insert(adminActionLog).values({
      volunteerId: session.volunteerId,
      targetUserId: null,
      action: 'site_mode_changed',
      reason: `${before} -> ${mode}`,
    });

    // This server instance sees it at once; the homepage's cached copy is cleared so
    // visitors get the new page straight away (others catch up within the cache time).
    clearSiteModeCache();
    revalidatePath('/');

    return NextResponse.json(await describe());
  } catch (error) {
    console.error('[Admin site mode]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
