import { db } from '@/lib/db';
import { users, profiles } from '@/lib/db/schema';
import { eq, sql, and, isNull, lt } from 'drizzle-orm';

// Config constant as requested by user (can be tuned later)
export const ABANDONED_THRESHOLD_DAYS = 7;

export async function cleanupAbandonedAccounts(thresholdDays = ABANDONED_THRESHOLD_DAYS) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);

  // Find users created before cutoffDate that are not already abandoned and have incomplete profile basics
  const abandonedRows = await db
    .select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      createdAt: users.createdAt,
      city: users.city,
      gender: users.gender,
      maritalStatus: profiles.maritalStatus,
    })
    .from(users)
    .leftJoin(profiles, eq(users.id, profiles.userId))
    .where(
      and(
        isNull(users.abandonedAt),
        lt(users.createdAt, cutoffDate),
        sql`(${users.name} = 'New User' OR ${users.city} = '' OR ${users.gender} IS NULL OR ${profiles.maritalStatus} IS NULL)`
      )
    );

  const ids = abandonedRows.map(r => r.id);
  if (ids.length > 0) {
    // Soft-delete by setting abandoned_at timestamp (preserving is_active)
    await db
      .update(users)
      .set({ abandonedAt: new Date() })
      .where(sql`${users.id} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`);
  }

  return {
    thresholdDays,
    cleanedCount: ids.length,
    accounts: abandonedRows,
  };
}
