import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { taarufPrograms } from '@/lib/db/schema';
import { desc, sql as sqlOp } from 'drizzle-orm';
import { getAdminSession } from '@/lib/adminAuth';

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const programs = await db.select().from(taarufPrograms).orderBy(desc(taarufPrograms.createdAt));
    return NextResponse.json({ programs });
  } catch (error) {
    console.error('[Admin Programs GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { title, description, city, venueName, startDate, endDate, ageMinMale, ageMaxMale, ageMinFemale, ageMaxFemale, feeAmount, capacity, registrationDeadline } = body;

    if (!title || !city || !startDate) {
      return NextResponse.json({ error: 'title, city, and startDate are required' }, { status: 400 });
    }

    const baseSlug = slugify(title);
    // Guard against a duplicate title producing a duplicate slug — append
    // a short suffix rather than fail the create outright.
    let slug = baseSlug;
    const existing = await db.select({ slug: taarufPrograms.slug }).from(taarufPrograms).where(sqlOp`${taarufPrograms.slug} = ${slug}`);
    if (existing.length > 0) {
      slug = `${baseSlug}-${Date.now().toString(36)}`;
    }

    const [program] = await db.insert(taarufPrograms).values({
      title,
      slug,
      description: description || null,
      city,
      venueName: venueName || null,
      startDate,
      endDate: endDate || null,
      ageMinMale: ageMinMale ?? null,
      ageMaxMale: ageMaxMale ?? null,
      ageMinFemale: ageMinFemale ?? null,
      ageMaxFemale: ageMaxFemale ?? null,
      feeAmount: feeAmount ?? 500,
      capacity: capacity ?? null,
      registrationDeadline: registrationDeadline || null,
      createdBy: session.volunteerId,
    }).returning();

    return NextResponse.json({ program });
  } catch (error) {
    console.error('[Admin Programs POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
