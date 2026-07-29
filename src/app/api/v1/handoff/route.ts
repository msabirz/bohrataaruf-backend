import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { matches } from '@/lib/db/schema';
import { sql, eq, or, and } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { z } from 'zod';
import { sendPushNotification } from '@/lib/pushNotifications';

const ShareHandleSchema = z.object({
  matchId: z.string().uuid(),
  platform: z.string(),
  handle: z.string(),
});

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = ShareHandleSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const { matchId, platform, handle } = parsed.data;

    const matchRow = await db.select().from(matches)
      .where(and(eq(matches.id, matchId), or(eq(matches.userA, userId), eq(matches.userB, userId))))
      .limit(1)
      .then(res => res[0]);

    if (!matchRow) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const amUserA = matchRow.userA === userId;
    const wasPending = amUserA ? matchRow.handoffAStatus === 'pending' : matchRow.handoffBStatus === 'pending';
    
    const existingHandles = amUserA ? (matchRow.handoffAHandles as Record<string, string> || {}) : (matchRow.handoffBHandles as Record<string, string> || {});
    existingHandles[platform] = handle;

    if (amUserA) {
      await db.update(matches).set({ 
        handoffAHandles: existingHandles,
        handoffAStatus: 'shared'
      }).where(eq(matches.id, matchId));
    } else {
      await db.update(matches).set({ 
        handoffBHandles: existingHandles,
        handoffBStatus: 'shared'
      }).where(eq(matches.id, matchId));
    }

    // Re-read the updated match to check if both sides have now shared
    const updatedMatch = await db.select({
      userA: matches.userA,
      userB: matches.userB,
      handoffAStatus: matches.handoffAStatus,
      handoffBStatus: matches.handoffBStatus,
    })
      .from(matches)
      .where(eq(matches.id, matchId))
      .limit(1)
      .then(r => r[0] ?? null);

    if (updatedMatch?.handoffAStatus === 'shared' && updatedMatch?.handoffBStatus === 'shared') {
      // Only fire the complete notification if this exact request caused the mutual completion
      if (wasPending) {
        // Both sides have shared — notify both users (fire-and-forget)
        sendPushNotification(
          updatedMatch.userA,
          'handoff_updates',
          "You can now connect!",
          "You've both shared your details. Check your matches to continue the conversation.",
          { matchId }
        ).catch(e => console.warn('[push] handoff notify failed (userA):', e));

        sendPushNotification(
          updatedMatch.userB,
          'handoff_updates',
          "You can now connect!",
          "You've both shared your details. Check your matches to continue the conversation.",
          { matchId }
        ).catch(e => console.warn('[push] handoff notify failed (userB):', e));
      }
    } else if (updatedMatch && wasPending) {
      // One-sided share: we just flipped from pending to shared, and the other side is still pending.
      // Nudge the OTHER person.
      const otherUser = amUserA ? updatedMatch.userB : updatedMatch.userA;
      
      sendPushNotification(
        otherUser,
        'handoff_updates',
        "One step closer",
        "Your match has shared their contact info. Share yours to see each other's details.",
        { matchId }
      ).catch(e => console.warn('[push] handoff nudge notify failed:', e));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Share handle error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
