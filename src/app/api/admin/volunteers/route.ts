import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getAdminSession } from '@/lib/adminAuth';

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rawData: any = await db.execute(sql`
      SELECT 
        v.id,
        v.name,
        v.active,
        v.created_at as "createdAt",
        COUNT(ver.id) FILTER (WHERE ver.status = 'verified')::int as "verifiedCount",
        COUNT(ver.id) FILTER (WHERE ver.status = 'rejected')::int as "rejectedCount",
        MAX(ver.reviewed_at) as "lastActive"
      FROM volunteers v
      LEFT JOIN verifications ver ON v.id = ver.reviewed_by
      GROUP BY v.id
      ORDER BY v.created_at DESC
    `);

    const volunteersData = Array.isArray(rawData) ? rawData : (rawData.rows || []);
    return NextResponse.json({ volunteers: volunteersData });
  } catch (error) {
    console.error('[Admin Volunteers API]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
