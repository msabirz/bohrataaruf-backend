import { db } from '@/lib/db';
import { verifications, matches } from '@/lib/db/schema';
import { and, eq, or } from 'drizzle-orm';

/**
 * The single enforcement boundary for "must be verified to act on another
 * profile" — used by anything that lets a user view or interact with
 * someone they haven't matched with yet. Mutual matches are exempt (a
 * separate, already-completed relationship stage), mirroring
 * matching/profile/[id]'s existing rule.
 *
 * Checks the CALLING user's (actorId) verification status, not the
 * target's — verification proves the actor is a real, legitimate person
 * before they can act on others, independent of the target's own status.
 */
export async function requireVerifiedOrMatched(
  actorId: string,
  targetId: string
): Promise<{ blocked: false } | { blocked: true; status: number; body: { error: string; code: string; message: string } }> {
  const myVerification = await db
    .select({ status: verifications.status })
    .from(verifications)
    .where(eq(verifications.userId, actorId))
    .limit(1)
    .then((res) => res[0]);

  const isVerified = myVerification?.status === 'verified';
  if (isVerified) return { blocked: false };

  const isMutualMatch = await db
    .select({ id: matches.id })
    .from(matches)
    .where(
      or(
        and(eq(matches.userA, actorId), eq(matches.userB, targetId)),
        and(eq(matches.userA, targetId), eq(matches.userB, actorId))
      )
    )
    .limit(1)
    .then((res) => res.length > 0);

  if (isMutualMatch) return { blocked: false };

  return {
    blocked: true,
    status: 403,
    body: {
      error: 'NOT_VERIFIED',
      code: myVerification?.status ?? 'unsubmitted',
      message: 'Complete ITS verification to interact with other profiles.',
    },
  };
}
