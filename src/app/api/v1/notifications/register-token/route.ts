import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pushTokens } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { z } from 'zod';

const RegisterTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android']),
});

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = RegisterTokenSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const { token, platform } = parsed.data;

    // Upsert: insert if this exact token is new, no-op if it already exists.
    // The unique constraint on token means we can safely use ON CONFLICT DO NOTHING.
    // We also want to ensure we're not registering someone else's token for this user,
    // so we first check if the token exists at all.
    const existing = await db
      .select({ id: pushTokens.id, userId: pushTokens.userId })
      .from(pushTokens)
      .where(eq(pushTokens.token, token))
      .limit(1)
      .then(r => r[0] ?? null);

    if (!existing) {
      await db.insert(pushTokens).values({ userId, token, platform });
      console.log(`[register-token] Registered new token for user ${userId} (${platform})`);
    } else if (existing.userId !== userId) {
      // Token belongs to a different user — this shouldn't happen in practice
      // but if a device was re-assigned, update the userId
      await db.update(pushTokens)
        .set({ userId, platform })
        .where(eq(pushTokens.id, existing.id));
      console.log(`[register-token] Re-assigned token to user ${userId}`);
    } else {
      console.log(`[register-token] Token already registered for user ${userId}, no-op.`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[register-token] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
