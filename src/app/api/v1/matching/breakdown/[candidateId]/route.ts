import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, profiles, preferences } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { computeMatchScore } from '@/lib/matching';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { candidateId } = await params;

    // Fetch viewer prefs
    const viewerPrefs = await db.select().from(preferences).where(eq(preferences.userId, userId)).limit(1).then(res => res[0]);

    // Fetch candidate data
    const candidateUser = await db.select().from(users).where(eq(users.id, candidateId)).limit(1).then(res => res[0]);
    if (!candidateUser) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const candidateProfile = await db.select().from(profiles).where(eq(profiles.userId, candidateId)).limit(1).then(res => res[0]);
    const candidatePrefs = await db.select().from(preferences).where(eq(preferences.userId, candidateId)).limit(1).then(res => res[0]);

    // Compute age
    const age = Math.abs(new Date(Date.now() - new Date(candidateUser.dateOfBirth).getTime()).getUTCFullYear() - 1970);
    const candidateUserWithAge = { ...candidateUser, age };

    const score = computeMatchScore(viewerPrefs, candidateUserWithAge, candidateProfile || {}, candidatePrefs);

    return NextResponse.json({ breakdown: score.breakdown });
  } catch (error) {
    console.error('Get match breakdown error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
