import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAuth';
import { db } from '@/lib/db';
import { lifestyleTraitPairs } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { z } from 'zod';

const SLUG_REGEX = /^[a-z0-9_]+$/;

const CreatePairSchema = z.object({
  slug: z.string().min(1).max(60).regex(SLUG_REGEX, 'Slug must be lowercase letters, numbers, and underscores only'),
  questionLabel: z.string().min(1).max(120),
  leftOptionKey: z.string().min(1).max(60),
  leftOptionLabel: z.string().min(1).max(60),
  leftIconMobile: z.string().min(1).max(60),
  leftIconWeb: z.string().min(1).max(60),
  rightOptionKey: z.string().min(1).max(60),
  rightOptionLabel: z.string().min(1).max(60),
  rightIconMobile: z.string().min(1).max(60),
  rightIconWeb: z.string().min(1).max(60),
  sortOrder: z.number().int().optional(),
});

const UpdatePairSchema = z.object({
  id: z.string().uuid(),
  questionLabel: z.string().min(1).max(120).optional(),
  leftOptionKey: z.string().min(1).max(60).optional(),
  leftOptionLabel: z.string().min(1).max(60).optional(),
  leftIconMobile: z.string().min(1).max(60).optional(),
  leftIconWeb: z.string().min(1).max(60).optional(),
  rightOptionKey: z.string().min(1).max(60).optional(),
  rightOptionLabel: z.string().min(1).max(60).optional(),
  rightIconMobile: z.string().min(1).max(60).optional(),
  rightIconWeb: z.string().min(1).max(60).optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const pairs = await db.select().from(lifestyleTraitPairs).orderBy(asc(lifestyleTraitPairs.sortOrder));
    return NextResponse.json({ pairs });
  } catch (error) {
    console.error('Fetch lifestyle trait pairs error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = CreatePairSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const existing = await db.select({ id: lifestyleTraitPairs.id }).from(lifestyleTraitPairs).where(eq(lifestyleTraitPairs.slug, parsed.data.slug)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: `A trait pair with slug "${parsed.data.slug}" already exists` }, { status: 400 });
    }

    const [inserted] = await db.insert(lifestyleTraitPairs).values({
      ...parsed.data,
      sortOrder: parsed.data.sortOrder ?? 0,
      active: true,
    }).returning();

    return NextResponse.json({ success: true, pair: inserted });
  } catch (error) {
    console.error('Create lifestyle trait pair error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = UpdatePairSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const { id, ...updates } = parsed.data;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const [updated] = await db.update(lifestyleTraitPairs).set(updates).where(eq(lifestyleTraitPairs.id, id)).returning();
    if (!updated) {
      return NextResponse.json({ error: 'Trait pair not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, pair: updated });
  } catch (error) {
    console.error('Update lifestyle trait pair error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
