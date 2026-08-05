import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nearbySessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { NearbySessionSchema } from '@/lib/api/validators';

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = NearbySessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const { latitude, longitude, isVisible, familyMode } = parsed.data;

    const [session] = await db
      .insert(nearbySessions)
      .values({
        userId,
        latitude,
        longitude,
        isVisible: isVisible ?? false,
        familyMode: familyMode ?? false,
        lastSeen: new Date(),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      })
      .onConflictDoUpdate({
        target: nearbySessions.userId,
        set: {
          latitude,
          longitude,
          ...(isVisible !== undefined ? { isVisible } : {}),
          ...(familyMode !== undefined ? { familyMode } : {}),
          lastSeen: new Date(),
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        },
      })
      .returning();

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Upsert nearby session error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await db.delete(nearbySessions).where(eq(nearbySessions.userId, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete nearby session error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
