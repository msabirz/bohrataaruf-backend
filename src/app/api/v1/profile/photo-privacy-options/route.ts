import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, photoPrivacyGenderRules } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const me = await db.select({ gender: users.gender }).from(users).where(eq(users.id, userId)).limit(1).then(res => res[0]);
    if (!me?.gender) {
      return NextResponse.json({ error: 'Gender not set' }, { status: 400 });
    }

    const rule = await db.select().from(photoPrivacyGenderRules).where(eq(photoPrivacyGenderRules.gender, me.gender)).limit(1).then(res => res[0]);
    if (!rule) {
      return NextResponse.json({ error: 'No photo privacy rule configured for your gender' }, { status: 500 });
    }

    return NextResponse.json({ allowedModes: rule.allowedModes, defaultMode: rule.defaultMode });
  } catch (error) {
    console.error('Get photo privacy options error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
