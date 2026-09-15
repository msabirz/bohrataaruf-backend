import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { taarufProgramApplications, taarufPrograms, users, adminActionLog } from '@/lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { getAdminSession } from '@/lib/adminAuth';
import { sendProgramSelectionEmail } from '@/lib/email';

function formatDateRange(start: string, end: string | null): string {
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  if (!end || end === start) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}

// Manual, admin-triggered step — deliberately not automatic on marking
// someone 'selected', so the admin can finish selecting everyone for a
// program before any email goes out. Safe to click more than once: only
// applications with selectionNotifiedAt still null get emailed.
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await props.params;
    const program = await db.select().from(taarufPrograms).where(eq(taarufPrograms.id, id)).limit(1).then(r => r[0]);
    if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

    const pending = await db.select({
      applicationId: taarufProgramApplications.id,
      userId: taarufProgramApplications.userId,
      name: users.name,
      email: users.email,
    }).from(taarufProgramApplications)
      .innerJoin(users, eq(taarufProgramApplications.userId, users.id))
      .where(and(
        eq(taarufProgramApplications.programId, id),
        eq(taarufProgramApplications.status, 'selected'),
        isNull(taarufProgramApplications.selectionNotifiedAt),
      ));

    let sent = 0;
    let skippedNoEmail = 0;
    const dateRange = formatDateRange(program.startDate, program.endDate);

    for (const applicant of pending) {
      if (!applicant.email) { skippedNoEmail++; continue; }
      await sendProgramSelectionEmail(applicant.email, applicant.name, {
        title: program.title,
        city: program.city,
        slug: program.slug,
        dateRange,
        feeAmount: program.feeAmount,
      }).catch((e) => console.warn('[admin] sendProgramSelectionEmail failed:', e));

      await db.update(taarufProgramApplications)
        .set({ selectionNotifiedAt: new Date() })
        .where(eq(taarufProgramApplications.id, applicant.applicationId));
      sent++;
    }

    if (sent > 0) {
      await db.insert(adminActionLog).values({
        volunteerId: session.volunteerId,
        targetUserId: null,
        action: 'program_notify_selected',
        reason: `programId=${id} notified=${sent}`,
      });
    }

    return NextResponse.json({ sent, skippedNoEmail });
  } catch (error) {
    console.error('[Admin Notify Selected POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
