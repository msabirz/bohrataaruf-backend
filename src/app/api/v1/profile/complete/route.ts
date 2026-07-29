import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/api/auth';

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Onboarding completion is usually a logical state derived from
    // the presence of all required fields (photo, bio, preferences, etc.)
    // But since the API explicitly has completeOnboarding() returning success,
    // we just return success. If there was an "onboardingCompletedAt" timestamp,
    // we would set it here.

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Complete onboarding error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
