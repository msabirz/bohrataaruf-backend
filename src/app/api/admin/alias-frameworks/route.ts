import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAuth';
import { db } from '@/lib/db';
import { aliasFrameworks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const adminId = session.volunteerId;

    const frameworks = await db.select().from(aliasFrameworks).orderBy(aliasFrameworks.createdAt);
    return NextResponse.json({ frameworks });
  } catch (error) {
    console.error('Fetch frameworks error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const adminId = session.volunteerId;

    const body = await request.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Expected an array of frameworks' }, { status: 400 });
    }

    if (body.length > 5) {
      return NextResponse.json({ error: 'Maximum 5 frameworks allowed per upload' }, { status: 400 });
    }

    const inserted = await db.transaction(async (tx) => {
      const results = [];
      for (const fw of body) {
        const [insertedRow] = await tx.insert(aliasFrameworks).values({
          frameworkName: fw.framework_name,
          genderRoute: fw.gender_route,
          prefixes: fw.prefixes,
          suffixes: fw.suffixes,
          active: true,
          uploadedBy: adminId,
        }).returning();
        results.push(insertedRow);
      }
      return results;
    });

    return NextResponse.json({ success: true, frameworks: inserted });
  } catch (error) {
    console.error('Upload frameworks error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const adminId = session.volunteerId;

    const body = await request.json();
    if (!body.id || typeof body.active !== 'boolean') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const [updated] = await db.update(aliasFrameworks)
      .set({ active: body.active })
      .where(eq(aliasFrameworks.id, body.id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Framework not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, framework: updated });
  } catch (error) {
    console.error('Update framework error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
