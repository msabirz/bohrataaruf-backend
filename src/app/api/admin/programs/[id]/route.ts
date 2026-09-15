import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { taarufPrograms, taarufProgramApplications } from '@/lib/db/schema';
import { eq, sql as sqlOp } from 'drizzle-orm';
import { getAdminSession } from '@/lib/adminAuth';
import { isValidFormSchema } from '@/lib/programFormSchema';

const VALID_STATUSES = ['draft', 'published', 'closed', 'completed'];

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await props.params;
    const program = await db.select().from(taarufPrograms).where(eq(taarufPrograms.id, id)).limit(1).then(r => r[0]);
    if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

    const applicationCountRow = await db.select({ count: sqlOp<number>`count(*)::int` })
      .from(taarufProgramApplications).where(eq(taarufProgramApplications.programId, id));

    return NextResponse.json({ program, applicationCount: applicationCountRow[0]?.count ?? 0 });
  } catch (error) {
    console.error('[Admin Program GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await props.params;
    const body = await request.json();

    if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    }
    if (body.formSchema !== undefined && body.formSchema !== null && !isValidFormSchema(body.formSchema)) {
      return NextResponse.json({ error: 'formSchema is malformed — each field needs id, label, a valid type, required, and options for select fields' }, { status: 400 });
    }

    // Whitelist exactly what's editable — never spread the raw body into
    // the update, same discipline as the rest of the admin API surface.
    const updates: Record<string, unknown> = {};
    const editable = [
      'title', 'description', 'city', 'venueName', 'startDate', 'endDate',
      'ageMinMale', 'ageMaxMale', 'ageMinFemale', 'ageMaxFemale',
      'feeAmount', 'capacity', 'registrationDeadline', 'status',
      'featureOnHomepage', 'featureUntil', 'formSchema',
    ] as const;
    for (const key of editable) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 });
    }

    const [program] = await db.update(taarufPrograms).set(updates).where(eq(taarufPrograms.id, id)).returning();
    if (!program) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

    return NextResponse.json({ program });
  } catch (error) {
    console.error('[Admin Program PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
