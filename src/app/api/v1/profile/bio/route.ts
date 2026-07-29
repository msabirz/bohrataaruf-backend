import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { SaveBioSchema } from '@/lib/api/validators';

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const parsed = SaveBioSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const { bio, introLine } = parsed.data;

    const updates: Partial<typeof profiles.$inferInsert> = {};
    if (bio !== undefined) updates.bioText = bio;
    if (introLine !== undefined) updates.introLine = introLine;

    if (Object.keys(updates).length > 0) {
      const existing = await db.select({ userId: profiles.userId }).from(profiles).where(eq(profiles.userId, userId)).limit(1).then(res => res[0]);
      if (!existing) {
        await db.insert(profiles).values({ userId, alias: `New ${Math.floor(100000 + Math.random() * 900000)}`, ...updates });
      } else {
        await db.update(profiles).set(updates).where(eq(profiles.userId, userId));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save bio error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
