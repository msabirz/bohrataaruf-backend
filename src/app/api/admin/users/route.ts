import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
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
        u.id, u.name, u.city, u.phone, u.is_active as "isActive", u.created_at as "createdAt", u.abandoned_at as "abandonedAt",
        p.alias,
        v.status as "verificationStatus",
        (SELECT COUNT(*)::int FROM matches m WHERE m.user_a = u.id OR m.user_b = u.id) as "matchCount"
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN verifications v ON u.id = v.user_id
      WHERE ${baseFilter}
      ORDER BY u.created_at DESC
      LIMIT 100
    `);

    const usersData = Array.isArray(rawData) ? rawData : (rawData.rows || []);
    return NextResponse.json({ users: usersData });
  } catch (error) {
    console.error('[Admin Users API]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
