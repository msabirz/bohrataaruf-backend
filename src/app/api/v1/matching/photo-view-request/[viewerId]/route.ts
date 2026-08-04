import { NextResponse } from 'next/server';
import { db, executeQuery } from '@/lib/db';
import { sql, eq } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { RespondPhotoViewRequestSchema } from '@/lib/api/validators';
import { profiles } from '@/lib/db/schema';
import { sendPushNotification } from '@/lib/pushNotifications';

function durationToUntil(duration: '24h' | '48h' | 'permanent'): string | null {
  if (duration === 'permanent') return null;
  const hours = duration === '24h' ? 24 : 48;
  // Explicit ISO string, not a raw Date object — the driver's default Date
  // serialization for a `timestamp` (no tz) column writes local wall-clock
  // digits as if they were UTC, shifting the stored instant by the server's
  // UTC offset (confirmed via direct DB round-trip test: IST server produced
  // a ~5.5h-later expiry than intended). A `.toISOString()` string round-trips
  // correctly since it's parsed as literal UTC digits, matching the intent.
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export async function PATCH(request: Request, { params }: { params: Promise<{ viewerId: string }> }) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { viewerId } = await params;

    const body = await request.json();
    const parsed = RespondPhotoViewRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const pending = await db.execute(sql`SELECT id FROM photo_views WHERE viewer_id = ${viewerId} AND profile_id = ${userId} AND extra_view_requested = true`);
    const pendingRows: any[] = Array.isArray(pending) ? pending : (pending as any).rows || [];
    if (pendingRows.length === 0) {
      return NextResponse.json({ error: 'No pending request from this viewer' }, { status: 404 });
    }

    let notifyBody: string;
    if (parsed.data.decision === 'approve') {
      const until = durationToUntil(parsed.data.duration);
      await executeQuery(sql`
        UPDATE photo_views
        SET extra_view_requested = false, extra_view_approved = true, extra_view_approved_until = ${until}
        WHERE viewer_id = ${viewerId} AND profile_id = ${userId}
      `);
      notifyBody = parsed.data.duration === 'permanent'
        ? 'Your photo request was approved — you now have permanent access.'
        : `Your photo request was approved for ${parsed.data.duration}.`;
    } else {
      await executeQuery(sql`
        UPDATE photo_views
        SET extra_view_requested = false, extra_view_approved = false, extra_view_approved_until = NULL
        WHERE viewer_id = ${viewerId} AND profile_id = ${userId}
      `);
      notifyBody = 'Your photo request was declined.';
    }

    const owner = await db.select({ alias: profiles.alias }).from(profiles).where(eq(profiles.userId, userId)).limit(1).then(res => res[0]);
    sendPushNotification(
      viewerId,
      'photo_requests',
      'Photo request update',
      `${owner?.alias ?? 'A profile'}: ${notifyBody}`,
      { relatedId: userId },
      'photo_view_response',
    ).catch(err => console.warn('[push] photo response notify failed:', err));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Respond to photo view request error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
