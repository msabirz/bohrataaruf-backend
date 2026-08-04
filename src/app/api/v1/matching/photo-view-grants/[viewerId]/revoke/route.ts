import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';

// Deliberately silent: no push notification and no notificationsLog row for a
// revoke, whether the owner revokes early or a timed grant simply expires.
// The viewer just finds the photo blurred again next time they look.
export async function POST(request: Request, { params }: { params: Promise<{ viewerId: string }> }) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { viewerId } = await params;

    const result = await executeQuery(sql`
      UPDATE photo_views
      SET extra_view_approved = false, extra_view_approved_until = NULL
      WHERE viewer_id = ${viewerId} AND profile_id = ${userId} AND extra_view_approved = true
      RETURNING id
    `);

    if (result.length === 0) {
      return NextResponse.json({ error: 'No active grant found for this viewer' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Revoke photo view grant error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
