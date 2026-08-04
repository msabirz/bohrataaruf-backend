import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAuth';
import { db } from '@/lib/db';
import { photoPrivacyGenderRules } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const ALL_MODES = ['always', 'three_then_request', 'request_only', 'blur_until_match'] as const;

const UpdateRuleSchema = z.object({
  gender: z.enum(['male', 'female']),
  allowedModes: z.array(z.enum(ALL_MODES)).min(1),
  defaultMode: z.enum(ALL_MODES),
}).refine(r => r.allowedModes.includes(r.defaultMode), {
  message: 'defaultMode must be one of allowedModes',
});

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rules = await db.select().from(photoPrivacyGenderRules).orderBy(photoPrivacyGenderRules.gender);
    return NextResponse.json({ rules });
  } catch (error) {
    console.error('Fetch photo privacy rules error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = UpdateRuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const { gender, allowedModes, defaultMode } = parsed.data;

    await db.insert(photoPrivacyGenderRules)
      .values({ gender, allowedModes, defaultMode })
      .onConflictDoUpdate({
        target: photoPrivacyGenderRules.gender,
        set: { allowedModes, defaultMode },
      });

    const rule = await db.select().from(photoPrivacyGenderRules).where(eq(photoPrivacyGenderRules.gender, gender)).limit(1).then(res => res[0]);
    return NextResponse.json({ rule });
  } catch (error) {
    console.error('Update photo privacy rule error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
