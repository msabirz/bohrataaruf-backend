import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { db } from '@/lib/db';
import { preferences } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { PreferencesSchema } from '@/lib/api/validators';

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const parsed = PreferencesSchema.safeParse(body);
    
    if (!parsed.success) {
      console.log('[Preferences] Validation failed:', JSON.stringify(parsed.error.format(), null, 2));
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;
    const prefUpdates: any = {};
    
    if (data.ageRange !== undefined) {
      prefUpdates.ageMin = data.ageRange.min;
      prefUpdates.ageMax = data.ageRange.max;
    }
    if (data.cities !== undefined) prefUpdates.preferredCities = data.cities;
    if (data.education !== undefined) prefUpdates.preferredEducation = data.education;
    if (data.professions !== undefined) prefUpdates.preferredProfessions = data.professions;
    if (data.practiceLevel !== undefined) prefUpdates.practiceLevel = data.practiceLevel;
    if (data.familyExpectation !== undefined) prefUpdates.familyExpectation = data.familyExpectation;
    if (data.partnerQualityTags !== undefined) prefUpdates.partnerQualityTags = data.partnerQualityTags;
    if (data.childrenAcceptance !== undefined) prefUpdates.childrenAcceptance = data.childrenAcceptance;

    if (Object.keys(prefUpdates).length > 0) {
      const existing = await db.select({ userId: preferences.userId }).from(preferences).where(eq(preferences.userId, userId)).limit(1).then(res => res[0]);
      if (!existing) {
        await db.insert(preferences).values({ userId, ...prefUpdates });
      } else {
        await db.update(preferences).set(prefUpdates).where(eq(preferences.userId, userId));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save preferences error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
