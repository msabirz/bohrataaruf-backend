import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { taarufPrograms, taarufProgramApplications } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { getAuthenticatedUserFromCookie } from '@/lib/api/pageAuth';

// Public — no login required. Only 'published' programs are visible here;
// draft/closed/completed programs 404 for everyone but admins (who use the
// separate /api/admin/programs/[id] route instead).
export async function GET(request: Request, props: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await props.params;
    const program = await db.select().from(taarufPrograms).where(eq(taarufPrograms.slug, slug)).limit(1).then(r => r[0]);
    if (!program || program.status !== 'published') {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    // If the visitor is logged in and already applied, let the page show
    // their application status instead of the registration form.
    let myApplication: { status: string; passCode: string | null } | null = null;
    const user = await getAuthenticatedUserFromCookie();
    if (user) {
      const existing = await db.select({ status: taarufProgramApplications.status, passCode: taarufProgramApplications.passCode })
        .from(taarufProgramApplications)
        .where(and(eq(taarufProgramApplications.programId, program.id), eq(taarufProgramApplications.userId, user.id)))
        .limit(1)
        .then(r => r[0]);
      myApplication = existing ?? null;
    }

    return NextResponse.json({ program, isAuthenticated: !!user, myApplication });
  } catch (error) {
    console.error('[Public Program GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
