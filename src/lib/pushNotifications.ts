/**
 * Push notification helper.
 * 
 * All calls are fire-and-forget — callers use:
 *   sendPushNotification(...).catch(err => console.warn('[push] send failed:', err));
 * 
 * This function NEVER throws to its caller. Notification failures must never
 * cause the underlying business action to fail or roll back.
 */
import { db } from '@/lib/db';
import { pushTokens, pushPreferences, notificationsLog } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export type PushCategory =
  | 'matches'
  | 'received_interests'
  | 'verification_updates'
  | 'handoff_updates'
  | 'security_alerts'
  | 'support_alerts'
  | 'photo_requests'
  | 'nudges';

const CATEGORY_TO_PREF_FIELD: Record<PushCategory, keyof typeof pushPreferences.$inferSelect> = {
  matches: 'matchesEnabled',
  received_interests: 'receivedInterestsEnabled',
  verification_updates: 'verificationUpdatesEnabled',
  handoff_updates: 'handoffUpdatesEnabled',
  security_alerts: 'securityAlertsEnabled',
  support_alerts: 'supportAlertsEnabled',
  photo_requests: 'photoRequestsEnabled',
  nudges: 'nudgesEnabled',
};

const CATEGORY_TO_LOG_TYPE: Record<PushCategory, string> = {
  matches: 'match',
  received_interests: 'received_interest',
  verification_updates: 'verification_result',
  handoff_updates: 'handoff',
  security_alerts: 'security_alert',
  support_alerts: 'support_reply',
  photo_requests: 'photo_view_request',
  nudges: 'nudge',
};

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

export async function sendPushNotification(
  userId: string,
  category: PushCategory,
  title: string,
  body: string,
  data?: Record<string, unknown>,
  logTypeOverride?: string,
): Promise<void> {
  try {
    // 0. Insert in-app notification history record (irrespective of push preferences/tokens)
    const logType = logTypeOverride || CATEGORY_TO_LOG_TYPE[category] || 'security_alert';
    const relatedId = (data?.matchId || data?.profileId || data?.ticketId || data?.nudgeId || data?.relatedId) as string | undefined;

    await db.insert(notificationsLog).values({
      userId,
      type: logType,
      title,
      body,
      relatedId: relatedId || null,
      isRead: false,
    });
    console.log(`[push] In-app notification logged: ${logType} for user ${userId}`);

    // 1. Check preferences — if category is disabled, silently skip
    const prefs = await db
      .select()
      .from(pushPreferences)
      .where(eq(pushPreferences.userId, userId))
      .limit(1)
      .then(r => r[0] ?? null);

    if (prefs) {
      const prefField = CATEGORY_TO_PREF_FIELD[category];
      if (prefs[prefField] === false) {
        console.log(`[push] Skipping ${category} notification for user ${userId} — disabled in preferences.`);
        return;
      }
    }
    // If no prefs row yet, defaults are all-enabled — proceed.

    // 2. Fetch all tokens for this user
    const tokens = await db
      .select({ id: pushTokens.id, token: pushTokens.token })
      .from(pushTokens)
      .where(eq(pushTokens.userId, userId));

    if (tokens.length === 0) {
      console.log(`[push] No tokens registered for user ${userId}, skipping.`);
      return;
    }

    // 3. Send to each token via Expo push API
    const deadTokenIds: string[] = [];

    for (const { id: tokenRowId, token } of tokens) {
      try {
        const res = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ to: token, title, body, data: data ?? {} }),
        });

        if (!res.ok) {
          console.warn(`[push] Expo API returned ${res.status} for token ${token}`);
          continue;
        }

        const result = (await res.json()) as { data: ExpoTicket };
        const ticket = result.data;

        if (ticket.status === 'error') {
          console.warn(`[push] Expo ticket error for token ${token}:`, ticket.message, ticket.details);
          // If token is invalid/unregistered — mark for deletion
          if (ticket.details?.error === 'DeviceNotRegistered') {
            deadTokenIds.push(tokenRowId);
          }
        } else {
          console.log(`[push] Sent ${category} to user ${userId}, ticket: ${ticket.id}`);
        }
      } catch (sendErr) {
        console.warn(`[push] Failed to send to token ${token}:`, sendErr);
      }
    }

    // 4. Clean up dead tokens so we don't spam Expo with invalid devices
    for (const deadId of deadTokenIds) {
      db.delete(pushTokens)
        .where(eq(pushTokens.id, deadId))
        .catch(e => console.warn('[push] Failed to delete dead token:', e));
    }
  } catch (err) {
    // Top-level safety net — log and swallow so callers are never affected
    console.warn(`[push] Unexpected error in sendPushNotification (${category} → ${userId}):`, err);
  }
}
