import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getViewUrl } from '@/lib/storage';

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    
    let photoUri = null;
    const profile = await db.select({ photoKey: profiles.photoKey }).from(profiles).where(eq(profiles.userId, userId)).limit(1).then(res => res[0]);
    if (profile?.photoKey) {
      photoUri = await getViewUrl(profile.photoKey);
    }
    
    return NextResponse.json({ authenticated: true, userId, photoUri });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
