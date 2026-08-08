import { db } from '@/lib/db';
import { nudgeMessages, nudges } from '@/lib/db/schema';
import { inArray, lt } from 'drizzle-orm';

const RETENTION_DAYS = 30;

// Message history only — the nudges row itself is kept indefinitely
// (thread stays visible in the inbox as an inactive/no-content thread),
// matching the exact scope requested: purge chat content after 30 days,
// not the thread record itself.
export async function cleanupExpiredNudgeMessages() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const expiredNudgeIds = db.select({ id: nudges.id }).from(nudges).where(lt(nudges.createdAt, cutoff));

  const deleted = await db
    .delete(nudgeMessages)
    .where(inArray(nudgeMessages.nudgeId, expiredNudgeIds))
    .returning({ id: nudgeMessages.id });

  return { deletedMessageCount: deleted.length };
}
