import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { taarufProgramApplications, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getAdminSession } from '@/lib/adminAuth';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await props.params;
    const rows = await db.select({
      id: taarufProgramApplications.id,
      userId: taarufProgramApplications.userId,
      formResponses: taarufProgramApplications.formResponses,
      status: taarufProgramApplications.status,
      paymentStatus: taarufProgramApplications.paymentStatus,
      passCode: taarufProgramApplications.passCode,
      selectionNotifiedAt: taarufProgramApplications.selectionNotifiedAt,
      createdAt: taarufProgramApplications.createdAt,
      name: users.name,
      email: users.email,
      city: users.city,
      gender: users.gender,
      dateOfBirth: users.dateOfBirth,
    }).from(taarufProgramApplications)
      .innerJoin(users, eq(taarufProgramApplications.userId, users.id))
      .where(eq(taarufProgramApplications.programId, id))
      .orderBy(desc(taarufProgramApplications.createdAt));

    return NextResponse.json({ applications: rows });
  } catch (error) {
    console.error('[Admin Program Applications GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
