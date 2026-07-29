import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { getProfileCompletion } from '@/lib/profileCompletion';

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const completion = await getProfileCompletion(userId);
    if (!completion) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(completion);
  } catch (error) {
    console.error('Get profile completion error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
