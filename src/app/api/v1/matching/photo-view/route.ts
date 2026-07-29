import { NextResponse } from 'next/server';
import { db, executeQuery } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { RecordPhotoViewSchema } from '@/lib/api/validators';
import { keysToCamelCase } from '@/lib/api/serialize';

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = RecordPhotoViewSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const { profileId } = parsed.data;

    // Atomic increment up to 3 views.
    const query = sql`
      INSERT INTO photo_views (viewer_id, profile_id, views_used)
      VALUES (${userId}, ${profileId}, 1)
      ON CONFLICT (viewer_id, profile_id) 
      DO UPDATE SET views_used = photo_views.views_used + 1 
      WHERE photo_views.views_used < 3
      RETURNING *
    `;
    
    const result = await executeQuery(query).then(res => res[0] as any);

    if (!result) {
      // If no row was returned, it means the WHERE clause prevented the update,
      // indicating the cap (3) was already hit.
      return NextResponse.json({ 
        message: 'Photo view limit reached', 
        viewsRemaining: 0 
      }, { status: 403 });
    }

    const viewsRemaining = Math.max(0, 3 - result.views_used);

    return NextResponse.json(keysToCamelCase({
      viewsRemaining,
      extraViewRequested: result.extra_view_requested,
      extraViewApproved: result.extra_view_approved
    }));
  } catch (error) {
    console.error('Record photo view error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
