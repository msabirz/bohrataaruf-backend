import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nearbySessions } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { getViewUrl } from '@/lib/storage';
import { computeAgeSafe } from '@/lib/api/serialize';
import { checkAndNotifyExpiringNudges } from '@/lib/nudgeExpiryCheck';
import { isModeB } from '@/lib/modeGuard';

const NEARBY_RADIUS_M = 500;

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (isModeB()) return NextResponse.json({ error: 'MODE_B', message: 'Coming soon' }, { status: 200 });

    // Fire-and-forget — opportunistic day-28/29 retention warning check,
    // not on the response's critical path.
    checkAndNotifyExpiringNudges(userId).catch((e) => console.warn('[nudge-expiry] check failed:', e));

    const mySession = await db
      .select()
      .from(nearbySessions)
      .where(eq(nearbySessions.userId, userId))
      .limit(1)
      .then((res) => res[0]);

    if (!mySession) {
      return NextResponse.json({ error: 'No active nearby session — call POST /nearby/session first' }, { status: 400 });
    }

    const rawResult: any = await db.execute(sql`
      SELECT
        u.id, u.date_of_birth as "dob",
        p.alias, p.profession, p.photo_key_blurred as "photoUriBlurred",
        ns.family_mode as "familyMode", ns.last_seen as "lastSeen",
        ST_Distance(
          geography(ST_MakePoint(ns.longitude::float8, ns.latitude::float8)),
          geography(ST_MakePoint(${mySession.longitude}::float8, ${mySession.latitude}::float8))
        )::int as "distanceM",
        EXISTS (
          SELECT 1 FROM interactions ni
          WHERE ((ni.user_id = ${userId} AND ni.target_id = u.id)
              OR (ni.user_id = u.id AND ni.target_id = ${userId}))
            AND ni.action = 'interested'
        ) as "alreadyInterested"
      FROM nearby_sessions ns
      JOIN users u ON u.id = ns.user_id
      JOIN profiles p ON p.user_id = u.id
      WHERE ns.user_id != ${userId}
        AND ns.is_visible = true
        AND ns.expires_at > now()
        AND u.is_active = true
        AND u.abandoned_at IS NULL
        AND u.is_test_account = false
        AND ST_DWithin(
          geography(ST_MakePoint(ns.longitude::float8, ns.latitude::float8)),
          geography(ST_MakePoint(${mySession.longitude}::float8, ${mySession.latitude}::float8)),
          ${NEARBY_RADIUS_M}
        )
      ORDER BY "distanceM" ASC
    `);
    const rows = Array.isArray(rawResult) ? rawResult : rawResult.rows || [];

    const users = await Promise.all(
      rows.map(async (row: any) => ({
        profileId: row.id,
        alias: row.alias,
        age: computeAgeSafe(row.dob),
        profession: row.profession,
        distanceM: row.distanceM,
        familyMode: row.familyMode,
        // Blurred derivative only — nudges never reveal the real photo,
        // same rule as pre-match discovery elsewhere in the app.
        photoUri: await getViewUrl(row.photoUriBlurred),
        alreadyInterested: row.alreadyInterested,
      }))
    );

    // Any active community event within ITS OWN radius of the viewer's
    // current location.
    const eventResult: any = await db.execute(sql`
      SELECT id, name, location_name as "locationName", starts_at as "startsAt", ends_at as "endsAt"
      FROM community_events
      WHERE is_active = true
        AND ends_at > now()
        AND latitude IS NOT NULL AND longitude IS NOT NULL
        AND ST_DWithin(
          geography(ST_MakePoint(longitude::float8, latitude::float8)),
          geography(ST_MakePoint(${mySession.longitude}::float8, ${mySession.latitude}::float8)),
          radius_km * 1000
        )
      LIMIT 1
    `);
    const eventRows = Array.isArray(eventResult) ? eventResult : eventResult.rows || [];

    return NextResponse.json({ users, event: eventRows[0] ?? null });
  } catch (error) {
    console.error('Get nearby users error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
