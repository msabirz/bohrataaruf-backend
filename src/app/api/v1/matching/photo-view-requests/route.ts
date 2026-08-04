import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { getViewUrl } from '@/lib/storage';
import { keysToCamelCase } from '@/lib/api/serialize';

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await executeQuery(sql`
      SELECT u.id as "viewerId", p.alias, p.photo_key_blurred as "photoUriBlurred", pv.last_viewed_at as "lastViewedAt"
      FROM photo_views pv
      JOIN users u ON u.id = pv.viewer_id
      JOIN profiles p ON p.user_id = u.id
      WHERE pv.profile_id = ${userId} AND pv.extra_view_requested = true
      ORDER BY pv.last_viewed_at DESC NULLS LAST
    `);

    const requests = await Promise.all(rows.map(async (row: any) => ({
      viewerId: row.viewerId,
      alias: row.alias,
      photoUri: await getViewUrl(row.photoUriBlurred),
    })));

    return NextResponse.json(keysToCamelCase({ requests }));
  } catch (error) {
    console.error('Get photo view requests error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
