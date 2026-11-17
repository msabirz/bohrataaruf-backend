import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { executeQuery } from '@/lib/db';
import { getAdminSession } from '@/lib/adminAuth';

/**
 * Totals-only analytics for the Share module. Never returns names, emails or
 * anything about an individual person: counts and groupings only.
 */
export async function GET(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const daysParam = Number(new URL(request.url).searchParams.get('days') ?? '30');
    const days = Math.min(Math.max(Math.floor(daysParam) || 30, 1), 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [totals] = await executeQuery(sql`
      SELECT
        (SELECT COUNT(*)::int FROM admin_action_log WHERE action = 'sent_share_invite_email') AS "emailsSent",
        (SELECT COUNT(DISTINCT target_user_id)::int FROM admin_action_log WHERE action = 'sent_share_invite_email') AS "usersEmailed",
        (SELECT COUNT(*)::int FROM share_links) AS "linksMade",
        (SELECT COUNT(DISTINCT user_id)::int FROM share_links) AS "usersWithLinks",
        (SELECT COUNT(*)::int FROM share_link_opens) AS "opens",
        (SELECT COUNT(DISTINCT l.user_id)::int FROM share_link_opens o JOIN share_links l ON l.id = o.link_id) AS "usersOpenedByOthers",
        (SELECT COUNT(*)::int FROM users WHERE referred_by_link_id IS NOT NULL) AS "signupsFromLinks",
        (SELECT COUNT(*)::int FROM share_settings WHERE sharing_enabled = false) AS "sharingOff"
    `);

    const outcomes = await executeQuery(sql`
      SELECT
        CASE
          WHEN l.stopped_at IS NOT NULL OR COALESCE(s.sharing_enabled, true) = false THEN 'stopped'
          WHEN l.used_at IS NOT NULL THEN 'used'
          WHEN l.expires_at <= now() THEN 'expired'
          ELSE 'active'
        END AS status,
        COUNT(*)::int AS n
      FROM share_links l
      LEFT JOIN share_settings s ON s.user_id = l.user_id
      GROUP BY 1
    `);

    const perDay = await executeQuery(sql`
      SELECT to_char(date_trunc('day', opened_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS opens
      FROM share_link_opens WHERE opened_at >= ${since}
      GROUP BY 1 ORDER BY 1
    `);

    const sources = await executeQuery(sql`
      SELECT source, COUNT(*)::int AS n FROM share_link_opens WHERE opened_at >= ${since} GROUP BY 1 ORDER BY 2 DESC
    `);

    const byDay = new Map<string, number>(perDay.map((r: { day: string; opens: number }) => [r.day, r.opens]));
    const series: { day: string; opens: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      series.push({ day: d, opens: byDay.get(d) ?? 0 });
    }

    return NextResponse.json({
      days,
      totals,
      outcomes: Object.fromEntries(outcomes.map((r: { status: string; n: number }) => [r.status, r.n])),
      series,
      sources,
    });
  } catch (error) {
    console.error('[Admin share stats]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
