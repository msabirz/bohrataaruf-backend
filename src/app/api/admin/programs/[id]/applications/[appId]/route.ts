import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  taarufProgramApplications, taarufPrograms, users, adminActionLog,
} from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { getAdminSession } from '@/lib/adminAuth';
import { generatePassCode } from '@/lib/programPass';
import { sendProgramPassEmail } from '@/lib/email';

const VALID_STATUSES = ['submitted', 'selected', 'rejected', 'accepted', 'declined'];

function formatDateRange(start: string, end: string | null): string {
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  if (!end || end === start) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string; appId: string }> }) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, appId } = await props.params;
    const body = await request.json();
    const { status } = body;
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    }

    const existing = await db.select({ passCode: taarufProgramApplications.passCode })
      .from(taarufProgramApplications)
      .where(and(eq(taarufProgramApplications.id, appId), eq(taarufProgramApplications.programId, id)))
      .limit(1).then(r => r[0]);
    if (!existing) return NextResponse.json({ error: 'Application not found' }, { status: 404 });

    const updates: Record<string, unknown> = { status };
    if (status === 'selected') updates.selectedAt = new Date();

    // Issuing a pass is a one-time event tied to first becoming 'accepted' —
    // re-saving 'accepted' (or any other status change afterward) never
    // regenerates or overwrites an already-issued code.
    let program: typeof taarufPrograms.$inferSelect | null = null;
    let issuedPassCode: string | null = null;
    if (status === 'accepted') {
      updates.acceptedAt = new Date();
      if (!existing.passCode) {
        program = await db.select().from(taarufPrograms).where(eq(taarufPrograms.id, id)).limit(1).then(r => r[0]) ?? null;
        if (program) {
          // Collision odds are astronomically small at this volume, but a
          // short retry loop against the unique constraint costs nothing.
          for (let attempt = 0; attempt < 5 && !issuedPassCode; attempt++) {
            const candidate = generatePassCode(program.slug);
            const conflict = await db.select({ id: taarufProgramApplications.id })
              .from(taarufProgramApplications).where(eq(taarufProgramApplications.passCode, candidate)).limit(1).then(r => r[0]);
            if (!conflict) issuedPassCode = candidate;
          }
          if (issuedPassCode) {
            updates.passCode = issuedPassCode;
            updates.passIssuedAt = new Date();
          }
        }
      }
    }

    const [application] = await db.update(taarufProgramApplications)
      .set(updates)
      .where(and(eq(taarufProgramApplications.id, appId), eq(taarufProgramApplications.programId, id)))
      .returning();

    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 });

    if (issuedPassCode && program) {
      const applicant = await db.select({ name: users.name, email: users.email })
        .from(users).where(eq(users.id, application.userId)).limit(1).then(r => r[0]);
      if (applicant?.email) {
        sendProgramPassEmail(applicant.email, applicant.name, {
          title: program.title,
          city: program.city,
          venueName: program.venueName,
          dateRange: formatDateRange(program.startDate, program.endDate),
        }, issuedPassCode).catch((e) => console.warn('[admin] sendProgramPassEmail failed:', e));
      }
    }

    await db.insert(adminActionLog).values({
      volunteerId: session.volunteerId,
      targetUserId: application.userId,
      action: `program_application_${status}`,
      reason: `programId=${id} applicationId=${appId}${issuedPassCode ? ` passIssued=${issuedPassCode}` : ''}`,
    });

    return NextResponse.json({ application });
  } catch (error) {
    console.error('[Admin Program Application PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
