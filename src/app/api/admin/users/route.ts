import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql, inArray } from 'drizzle-orm';
import { users, profiles, preferences, verifications } from '@/lib/db/schema';
import { computeProfileCompletion } from '@/lib/profileCompletion';
import { getAdminSession } from '@/lib/adminAuth';

export async function GET(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const search = url.searchParams.get('q') || '';
    const statusFilter = url.searchParams.get('status') || ''; 
    const activeFilter = url.searchParams.get('active') || ''; 
    const abandonedFilter = url.searchParams.get('abandoned') || '';
    // Profile-completion filters and sorting. Completion is computed by the one shared
    // computeProfileCompletion() (never re-implemented in SQL), so these are applied in
    // code after the base query, then the result is paged.
    const completionFilter = url.searchParams.get('completion') || ''; // 'lt50' | 'lt100'
    const noPhoto = url.searchParams.get('noPhoto') === 'true';
    const noEmail = url.searchParams.get('noEmail') === 'true';
    const itsNotSubmitted = url.searchParams.get('itsNotSubmitted') === 'true';
    const sort = url.searchParams.get('sort') || 'joined'; // 'joined' | 'completion_asc' | 'completion_desc'
    const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit')) || 100));

    let baseFilter = sql`1=1`;

    if (search) {
      const q = `%${search}%`;
      // Never search by its_number_hash, physically impossible to search raw ITS here.
      baseFilter = sql`${baseFilter} AND (
        u.name ILIKE ${q} OR 
        p.alias ILIKE ${q} OR 
        u.city ILIKE ${q} OR 
        u.phone ILIKE ${q}
      )`;
    }

    if (statusFilter) {
      baseFilter = sql`${baseFilter} AND v.status = ${statusFilter}`;
    }

    if (abandonedFilter === 'true') {
      baseFilter = sql`${baseFilter} AND u.abandoned_at IS NOT NULL`;
    } else if (activeFilter === 'true') {
      baseFilter = sql`${baseFilter} AND u.is_active = true AND u.abandoned_at IS NULL`;
    } else if (activeFilter === 'false') {
      baseFilter = sql`${baseFilter} AND u.is_active = false`;
    }

    const rawData: any = await db.execute(sql`
      SELECT
        u.id, u.name, u.city, u.phone, u.email, u.is_active as "isActive", u.created_at as "createdAt", u.abandoned_at as "abandonedAt",
        p.alias,
        v.status as "verificationStatus",
        v.rejection_reason as "rejectionReason",
        (SELECT COUNT(*)::int FROM matches m WHERE m.user_a = u.id OR m.user_b = u.id) as "matchCount",
        (SELECT MAX(created_at) FROM admin_action_log WHERE target_user_id = u.id AND action = 'sent_prelaunch_ack_email') as "prelaunchAckSentAt",
        (SELECT MAX(created_at) FROM admin_action_log WHERE target_user_id = u.id AND action = 'sent_share_invite_email') as "shareInviteSentAt",
        (SELECT ss.sharing_enabled FROM share_settings ss WHERE ss.user_id = u.id) as "sharingEnabled",
        (SELECT COUNT(*)::int FROM share_links sl WHERE sl.user_id = u.id) as "shareLinkCount",
        (SELECT COUNT(*)::int FROM share_links sl WHERE sl.user_id = u.id AND sl.stopped_at IS NULL AND sl.used_at IS NULL AND sl.expires_at > now()) as "shareActiveLinks",
        (SELECT COUNT(*)::int FROM share_link_opens o JOIN share_links sl ON sl.id = o.link_id WHERE sl.user_id = u.id) as "shareOpens"
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN verifications v ON u.id = v.user_id
      WHERE ${baseFilter}
      ORDER BY u.created_at DESC
      LIMIT 5000
    `);

    type BaseRow = { id: string; email: string | null } & Record<string, unknown>;
    const baseRows = (Array.isArray(rawData) ? rawData : (rawData.rows || [])) as BaseRow[];

    // Enrich every matching user with profile completion.
    const ids: string[] = baseRows.map((r) => r.id);
    const [userRows, profileRows, prefRows, verRows] = ids.length === 0 ? [[], [], [], []] : await Promise.all([
      db.select().from(users).where(inArray(users.id, ids)),
      db.select().from(profiles).where(inArray(profiles.userId, ids)),
      db.select().from(preferences).where(inArray(preferences.userId, ids)),
      db.select().from(verifications).where(inArray(verifications.userId, ids)),
    ]);
    const byUser = <T extends { id?: string; userId?: string }>(rows: T[]) => new Map(rows.map((r) => [(r.userId ?? r.id) as string, r]));
    const userMap = byUser(userRows), profileMap = byUser(profileRows), prefMap = byUser(prefRows), verMap = byUser(verRows);

    let enriched = baseRows.map((r) => {
      const c = computeProfileCompletion(userMap.get(r.id), profileMap.get(r.id), prefMap.get(r.id), verMap.get(r.id));
      const prefItems = c.breakdown.filter((b) => b.tier === 2);
      const hasPhoto = c.breakdown.find((b) => b.field === 'photoUri')?.completed ?? false;
      const itsSubmitted = c.breakdown.find((b) => b.field === 'itsVerification')?.completed ?? false;
      return {
        ...r,
        completion: {
          percentage: c.percentage,
          missing: c.missingFields.map((m) => m.label),
          prefsFilled: prefItems.filter((b) => b.completed).length,
          prefsTotal: prefItems.length,
          hasPhoto,
          itsSubmitted,
        },
      };
    });

    if (completionFilter === 'lt50') enriched = enriched.filter((u) => u.completion.percentage < 50);
    else if (completionFilter === 'lt100') enriched = enriched.filter((u) => u.completion.percentage < 100);
    if (noPhoto) enriched = enriched.filter((u) => !u.completion.hasPhoto);
    if (noEmail) enriched = enriched.filter((u) => !u.email);
    if (itsNotSubmitted) enriched = enriched.filter((u) => !u.completion.itsSubmitted);

    if (sort === 'completion_asc') enriched.sort((a, b) => a.completion.percentage - b.completion.percentage);
    else if (sort === 'completion_desc') enriched.sort((a, b) => b.completion.percentage - a.completion.percentage);
    // 'joined' keeps the SQL order (newest first)

    const total = enriched.length;
    return NextResponse.json({ users: enriched.slice(offset, offset + limit), total, offset, limit });
  } catch (error) {
    console.error('[Admin Users API]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
