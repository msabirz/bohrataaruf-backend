import { NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/pushNotifications';

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const profileOwnerIds = body.profileOwnerIds;

    if (!Array.isArray(profileOwnerIds) || profileOwnerIds.length === 0) {
      return NextResponse.json({ error: 'Bad Request: profileOwnerIds must be a non-empty array' }, { status: 400 });
    }

    const appName = process.env.APP_DISPLAY_NAME || 'Bohra Taaruf';

    // Dispatch notifications non-blocking
    for (const ownerId of profileOwnerIds) {
      if (ownerId === userId) continue; // Don't notify them if they screenshot their own profile

      sendPushNotification(
        ownerId,
        'security_alerts',
        "You're protected",
        `Someone took a screenshot of your profile. We've noted it to help keep ${appName} safe.`,
        { type: 'screenshot_detected' }
      ).catch(e => console.warn(`[push] Failed to send screenshot alert to ${ownerId}`, e));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[screenshot-detected] Error processing request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
