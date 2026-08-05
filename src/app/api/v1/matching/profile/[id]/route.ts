import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { fetchRichCandidateProfile } from '@/lib/db/profileQueries';
import { requireVerifiedOrMatched } from '@/lib/api/verificationGate';

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
    // directly. Mutual matches are exempt via requireVerifiedOrMatched.
    const gate = await requireVerifiedOrMatched(userId, candidateId);
    if (gate.blocked) {
      return NextResponse.json(
        { ...gate.body, message: 'Complete ITS verification to view profiles.' },
        { status: gate.status }
      );
    }

    return NextResponse.json(candidate);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
