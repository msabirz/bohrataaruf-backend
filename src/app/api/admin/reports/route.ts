import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reports, users, profiles, volunteers } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { requireAdminAuth } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAdminAuth();

    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    let query = db
      .select({
        id: reports.id,
        reason: reports.reason,
        details: reports.details,
        status: reports.status,
        createdAt: reports.createdAt,
        reviewedAt: reports.reviewedAt,
        reporter: {
          id: users.id,
          phone: users.phone,
          alias: profiles.alias
        },
        reportedUser: {
          id: sql<string>`reported_users.id`,
          phone: sql<string>`reported_users.phone`,
          alias: sql<string>`reported_profiles.alias`
        },
        reviewedBy: {
          name: volunteers.name
        },
        totalReportsForUser: sql<number>`(SELECT count(*) FROM ${reports} r2 WHERE r2.reported_user_id = ${reports.reportedUserId})`.as('total_reports')
      })
      .from(reports)
      .innerJoin(users, eq(reports.reporterId, users.id))
      .innerJoin(profiles, eq(users.id, profiles.userId))
      .innerJoin(sql`${users} as reported_users`, sql`reported_users.id = ${reports.reportedUserId}`)
      .leftJoin(sql`${profiles} as reported_profiles`, sql`reported_profiles.user_id = reported_users.id`)
      .leftJoin(volunteers, eq(reports.reviewedBy, volunteers.id));

    if (status) {
      query = query.where(eq(reports.status, status as any)) as any;
    }

    const rows = await query.orderBy(desc(reports.createdAt));

    return NextResponse.json({ reports: rows });
  } catch (error) {
    console.error('Fetch reports error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
