import { NextResponse } from 'next/server';
import { db, executeQuery } from '@/lib/db';
import { sql, eq } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { RequestPhotoViewSchema } from '@/lib/api/validators';
import { profiles } from '@/lib/db/schema';
import { sendPushNotification } from '@/lib/pushNotifications';

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = RequestPhotoViewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }
    const { profileId } = parsed.data;

    if (profileId === userId) {
      return NextResponse.json({ error: 'Cannot request your own photo' }, { status: 400 });
    }

    const target = await db.select({ photoPrivacyMode: profiles.photoPrivacyMode })
      .from(profiles)
      .where(eq(profiles.userId, profileId))
      .limit(1)
      .then(res => res[0]);
    if (!target) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    if (target.photoPrivacyMode === 'always' || target.photoPrivacyMode === 'blur_until_match') {
      return NextResponse.json({ error: 'This profile does not accept photo view requests' }, { status: 400 });
    }
    if (target.photoPrivacyMode === 'three_then_request') {
      const existing = await db.execute(sql`SELECT views_used as "viewsUsed" FROM photo_views WHERE viewer_id = ${userId} AND profile_id = ${profileId}`);
      const rows: any[] = Array.isArray(existing) ? existing : (existing as any).rows || [];
      const viewsUsed = rows[0]?.viewsUsed ?? 0;
      if (viewsUsed < 3) {
        return NextResponse.json({ error: 'Free views are still available for this profile' }, { status: 400 });
      }
    }

    // Reset extraViewApproved to null on a fresh request so a previously-denied
    // requester shows as pending again rather than stuck on "denied".
    const query = sql`
      INSERT INTO photo_views (viewer_id, profile_id, extra_view_requested)
      VALUES (${userId}, ${profileId}, true)
      ON CONFLICT (viewer_id, profile_id)
      DO UPDATE SET extra_view_requested = true, extra_view_approved = NULL, extra_view_approved_until = NULL
      RETURNING *
    `;
    await executeQuery(query);

    const requester = await db.select({ alias: profiles.alias }).from(profiles).where(eq(profiles.userId, userId)).limit(1).then(res => res[0]);
    sendPushNotification(
      profileId,
      'photo_requests',
      'New photo request',
      `${requester?.alias ?? 'Someone'} would like to view your photo.`,
      { relatedId: userId },
    ).catch(err => console.warn('[push] photo request notify failed:', err));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Request photo view error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
