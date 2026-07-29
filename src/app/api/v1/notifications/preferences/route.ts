import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pushPreferences } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { z } from 'zod';

const UpdatePrefsSchema = z.object({
  matchesEnabled: z.boolean().optional(),
  receivedInterestsEnabled: z.boolean().optional(),
  verificationUpdatesEnabled: z.boolean().optional(),
  handoffUpdatesEnabled: z.boolean().optional(),
});

/** Get or create (with defaults) the user's push preferences */
async function getOrCreatePrefs(userId: string) {
  const existing = await db
    .select()
    .from(pushPreferences)
    .where(eq(pushPreferences.userId, userId))
    .limit(1)
    .then(r => r[0] ?? null);

  if (existing) return existing;

  const [created] = await db
    .insert(pushPreferences)
    .values({ userId })
    .returning();
  return created;
}

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const prefs = await getOrCreatePrefs(userId);
    return NextResponse.json({
      matchesEnabled: prefs.matchesEnabled,
      receivedInterestsEnabled: prefs.receivedInterestsEnabled,
      verificationUpdatesEnabled: prefs.verificationUpdatesEnabled,
      handoffUpdatesEnabled: prefs.handoffUpdatesEnabled,
    });
  } catch (error) {
    console.error('[notifications/preferences GET] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = UpdatePrefsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    // Ensure row exists before updating
    await getOrCreatePrefs(userId);

    const updates: Partial<typeof pushPreferences.$inferInsert> = {};
    if (parsed.data.matchesEnabled !== undefined) updates.matchesEnabled = parsed.data.matchesEnabled;
    if (parsed.data.receivedInterestsEnabled !== undefined) updates.receivedInterestsEnabled = parsed.data.receivedInterestsEnabled;
    if (parsed.data.verificationUpdatesEnabled !== undefined) updates.verificationUpdatesEnabled = parsed.data.verificationUpdatesEnabled;
    if (parsed.data.handoffUpdatesEnabled !== undefined) updates.handoffUpdatesEnabled = parsed.data.handoffUpdatesEnabled;

    const [updated] = await db
      .update(pushPreferences)
      .set(updates)
      .where(eq(pushPreferences.userId, userId))
      .returning();

    return NextResponse.json({
      matchesEnabled: updated.matchesEnabled,
      receivedInterestsEnabled: updated.receivedInterestsEnabled,
      verificationUpdatesEnabled: updated.verificationUpdatesEnabled,
      handoffUpdatesEnabled: updated.handoffUpdatesEnabled,
    });
  } catch (error) {
    console.error('[notifications/preferences PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
