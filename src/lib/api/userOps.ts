import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Permanently deletes a user account.
 * Relies on PostgreSQL CASCADE rules to completely remove all associated
 * profiles, preferences, verifications, interactions, photos, and matches.
 */
export async function deleteUserAccount(userId: string) {
  await db.delete(users).where(eq(users.id, userId));
}
