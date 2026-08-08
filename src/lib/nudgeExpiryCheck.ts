import { db } from '@/lib/db';
import { nudges, profiles } from '@/lib/db/schema';
import { and, eq, gte, isNull, lt, or } from 'drizzle-orm';
import { sendPushNotification } from '@/lib/pushNotifications';

const WARNING_WINDOW_START_DAYS = 28;
const RETENTION_DAYS = 30;

// Opportunistic, not cron-driven — called (fire-and-forget) from GET
// /nearby/users and GET /notifications for the requesting user. Checks
// their own nudges for ones entering the day-28-to-30 warning window that
// haven't been notified yet (nudgeExpiryNotifiedAt guards against a
// duplicate send from either participant's next request). Since this only
// fires when a participant happens to open the app in that window, timing
// isn't precise-to-the-day like a real cron would be — acceptable given
// the column is a single "already notified" guard, not a per-day tracker.
export async function checkAndNotifyExpiringNudges(userId: string): Promise<void> {
  const windowStart = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const windowEnd = new Date(Date.now() - WARNING_WINDOW_START_DAYS * 24 * 60 * 60 * 1000);

  const candidates = await db
    .select({
      id: nudges.id,
      fromUserId: nudges.fromUserId,
      toUserId: nudges.toUserId,
      createdAt: nudges.createdAt,
      handoffRequestedBy: nudges.handoffRequestedBy,
    })
    .from(nudges)
    .where(
      and(
        or(eq(nudges.fromUserId, userId), eq(nudges.toUserId, userId)),
        isNull(nudges.nudgeExpiryNotifiedAt),
        gte(nudges.createdAt, windowStart),
        lt(nudges.createdAt, windowEnd)
      )
    );

  for (const nudge of candidates) {
    // Skip pairs who already mutually shared contact details — they don't
    // need an "about to disappear" nudge back toward the same action.
    const alreadyHandedOff = (nudge.handoffRequestedBy ?? []).length >= 2;
    if (alreadyHandedOff) {
      await db.update(nudges).set({ nudgeExpiryNotifiedAt: new Date() }).where(eq(nudges.id, nudge.id));
      continue;
    }

    const [fromProfile, toProfile] = await Promise.all([
      db.select({ alias: profiles.alias }).from(profiles).where(eq(profiles.userId, nudge.fromUserId)).limit(1).then((r) => r[0]),
      db.select({ alias: profiles.alias }).from(profiles).where(eq(profiles.userId, nudge.toUserId)).limit(1).then((r) => r[0]),
    ]);

    const createdAt = nudge.createdAt ? new Date(nudge.createdAt) : new Date();
    const deletionTime = createdAt.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const daysLeft = Math.max(1, Math.ceil((deletionTime - Date.now()) / (24 * 60 * 60 * 1000)));

    sendPushNotification(
      nudge.fromUserId,
      'nudges',
      'Your gathering conversation is expiring soon',
      `Your conversation with ${toProfile?.alias ?? 'them'} will be deleted in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Share contact details to stay connected.`,
      { type: 'nudge_expiry', nudgeId: nudge.id }
    ).catch((e) => console.warn('[push] nudge expiry notify failed (from):', e));

    sendPushNotification(
      nudge.toUserId,
      'nudges',
      'Your gathering conversation is expiring soon',
      `Your conversation with ${fromProfile?.alias ?? 'them'} will be deleted in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Share contact details to stay connected.`,
      { type: 'nudge_expiry', nudgeId: nudge.id }
    ).catch((e) => console.warn('[push] nudge expiry notify failed (to):', e));

    await db.update(nudges).set({ nudgeExpiryNotifiedAt: new Date() }).where(eq(nudges.id, nudge.id));
  }
}
