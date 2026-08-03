import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { matches } from '@/lib/db/schema';
import { and, eq, or } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { fetchRichCandidateProfile } from '@/lib/db/profileQueries';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: candidateId } = await params;

    const candidate = await fetchRichCandidateProfile(userId, candidateId);
    if (!candidate) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Unverified users can't view any (pre-match) profile — the mobile app
    // already prevents navigating here in that case, but this is the real
    // enforcement boundary since the endpoint itself is otherwise reachable
    // directly. Mutual matches are exempt: the app deliberately reveals full
    // profile data for confirmed matches regardless of the viewer's own
    // verification status (a separate, already-completed relationship
    // stage), so that flow must keep working here.
    if (!candidate.viewerIsVerified) {
      const isMutualMatch = await db.select({ id: matches.id }).from(matches).where(
        or(
          and(eq(matches.userA, userId), eq(matches.userB, candidateId)),
          and(eq(matches.userA, candidateId), eq(matches.userB, userId))
        )
      ).limit(1).then(res => res.length > 0);

      if (!isMutualMatch) {
        return NextResponse.json({
          error: 'NOT_VERIFIED',
          code: candidate.viewerVerificationStatus,
          message: 'Complete ITS verification to view profiles.',
        }, { status: 403 });
      }
    }

    return NextResponse.json(candidate);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
