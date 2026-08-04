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
      SELECT u.id as "viewerId", p.alias, p.photo_key_blurred as "photoUriBlurred", pv.extra_view_approved_until as "grantedUntil"
      FROM photo_views pv
      JOIN users u ON u.id = pv.viewer_id
      JOIN profiles p ON p.user_id = u.id
      WHERE pv.profile_id = ${userId}
        AND pv.extra_view_approved = true
        AND (pv.extra_view_approved_until IS NULL OR pv.extra_view_approved_until > now())
      ORDER BY pv.extra_view_approved_until ASC NULLS LAST
    `);

    const grants = await Promise.all(rows.map(async (row: any) => ({
      viewerId: row.viewerId,
      alias: row.alias,
      photoUri: await getViewUrl(row.photoUriBlurred),
      // Normalize the raw Postgres timestamptz text representation to a
      // strict ISO string — not guaranteed parseable as-is on every JS engine.
      grantedUntil: row.grantedUntil ? new Date(row.grantedUntil).toISOString() : null,
    })));

    return NextResponse.json(keysToCamelCase({ grants }));
  } catch (error) {
    console.error('Get photo view grants error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
