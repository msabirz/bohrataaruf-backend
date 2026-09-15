import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { taarufPrograms, taarufProgramApplications } from '@/lib/db/schema';
import { and, eq, ne, sql as sqlOp } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { isValidFormSchema } from '@/lib/programFormSchema';

// Protected by default — not in middleware.ts's publicRoutes, so the JWT
// cookie/header is required (see src/middleware.ts). Deliberately a separate
// path from /api/v1/programs so that prefix stays entirely public without
// accidentally exposing this write endpoint too.
export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const programId = typeof body.programId === 'string' ? body.programId : null;
    const formResponses = body.formResponses && typeof body.formResponses === 'object' ? body.formResponses : {};
    if (!programId) return NextResponse.json({ error: 'programId is required' }, { status: 400 });

    const program = await db.select().from(taarufPrograms).where(eq(taarufPrograms.id, programId)).limit(1).then(r => r[0]);
    if (!program || program.status !== 'published') {
      return NextResponse.json({ error: 'Program not found or not open for applications' }, { status: 404 });
    }

    if (program.registrationDeadline && new Date(program.registrationDeadline) < new Date()) {
      return NextResponse.json({ error: 'The registration deadline for this program has passed' }, { status: 400 });
    }

    if (program.capacity != null) {
      const countRow = await db.select({ count: sqlOp<number>`count(*)::int` })
        .from(taarufProgramApplications)
        .where(and(eq(taarufProgramApplications.programId, programId), ne(taarufProgramApplications.status, 'rejected')));
      if ((countRow[0]?.count ?? 0) >= program.capacity) {
        return NextResponse.json({ error: 'This program is full' }, { status: 400 });
      }
    }

    // Validate required fields from the admin-authored form schema — the
    // client-side form already does this, but the server never trusts it.
    const fields = isValidFormSchema(program.formSchema) ? program.formSchema : [];
    for (const field of fields) {
      if (!field.required) continue;
      const value = formResponses[field.id];
      if (value === undefined || value === null || (typeof value === 'string' && value.trim().length === 0)) {
        return NextResponse.json({ error: `"${field.label}" is required` }, { status: 400 });
      }
    }

    const [application] = await db.insert(taarufProgramApplications)
      .values({ programId, userId, formResponses })
      .onConflictDoNothing({ target: [taarufProgramApplications.programId, taarufProgramApplications.userId] })
      .returning();

    if (!application) {
      return NextResponse.json({ error: 'You have already applied to this program' }, { status: 409 });
    }

    return NextResponse.json({ application });
  } catch (error) {
    console.error('[Program Application POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
