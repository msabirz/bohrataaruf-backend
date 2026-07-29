import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { db } from '@/lib/db';
import { users, profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateUniqueAlias } from '@/lib/alias-generator';

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [user] = await db.select({ gender: users.gender }).from(users).where(eq(users.id, userId));
    const [profile] = await db.select({ 
      lastRegen: profiles.lastAliasRegenerationAt,
      regenCount: profiles.aliasRegenerationCount,
    }).from(profiles).where(eq(profiles.userId, userId));

    let newCount = 1;
    let newRegenAt = new Date();

    if (profile?.lastRegen) {
      const hoursSince = (Date.now() - new Date(profile.lastRegen).getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        if ((profile.regenCount || 0) >= 3) {
          return NextResponse.json({ 
            error: "You've reached your daily alias limit (3/24h). Need help? Contact support.", 
            code: "ALIAS_LIMIT_REACHED" 
          }, { status: 429 });
        }
        newCount = (profile.regenCount || 0) + 1;
        newRegenAt = new Date(profile.lastRegen);
      } else {
        newCount = 1;
        newRegenAt = new Date();
      }
    }

    const userGender = (user?.gender || 'male') as 'male' | 'female';
    let finalAlias = undefined;

    for (let i = 0; i < 5; i++) {
      const candidate = await generateUniqueAlias(userGender);
      try {
        await db.update(profiles)
          .set({ alias: candidate, lastAliasRegenerationAt: newRegenAt, aliasRegenerationCount: newCount })
          .where(eq(profiles.userId, userId));
        finalAlias = candidate;
        break;
      } catch (e: any) {
        if (e.code === '23505' || (e.message && e.message.includes('unique constraint'))) {
          continue;
        }
        throw e;
      }
    }

    if (!finalAlias) {
      const candidate = await generateUniqueAlias(userGender);
      const suffix = Math.floor(100 + Math.random() * 900);
      finalAlias = `${candidate} ${suffix}`;
      await db.update(profiles)
        .set({ alias: finalAlias, lastAliasRegenerationAt: newRegenAt, aliasRegenerationCount: newCount })
        .where(eq(profiles.userId, userId));
    }

    return NextResponse.json({ alias: finalAlias });
  } catch (error) {
    console.error('Generate alias error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
