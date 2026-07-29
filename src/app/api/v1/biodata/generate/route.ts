import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { biodataLinks, biodataLinkHistory } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { randomBytes, createHash } from 'crypto';

const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL ?? 'http://localhost:3000';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function attemptInsert(userId: string, token: string, expiresAt: Date): Promise<void> {
  // Delete any existing active link for this user first
  await db.delete(biodataLinks).where(eq(biodataLinks.userId, userId));
  // Insert the new link
  await db.insert(biodataLinks).values({ userId, token, expiresAt });
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // ── 1. Check for an existing active link ────────────────────────────────
    const existingRow = await db
      .select({ token: biodataLinks.token, expiresAt: biodataLinks.expiresAt })
      .from(biodataLinks)
      .where(
        and(
          eq(biodataLinks.userId, userId),
          gt(biodataLinks.expiresAt, new Date())
        )
      )
      .limit(1)
      .then((r) => r[0] ?? null);

    if (existingRow) {
      const url = `${PUBLIC_APP_URL}/biodata/${existingRow.token}`;
      return NextResponse.json({ url, expiresAt: existingRow.expiresAt.toISOString() });
    }

    // ── 2. Generate a new link ──────────────────────────────────────────────
    // Cryptographically random, URL-safe token (256 bits of entropy)
    const token = randomBytes(32).toString('base64url');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    try {
      await attemptInsert(userId, token, expiresAt);
    } catch (err: any) {
      // Postgres unique_violation (23505) — another concurrent insert snuck in.
      // Retry the delete+insert exactly once; fail hard on second error.
      if (err?.code === '23505') {
        console.warn('[biodata/generate] Unique violation on first attempt, retrying once...');
        try {
          await attemptInsert(userId, token, expiresAt);
        } catch (retryErr: any) {
          console.error('[biodata/generate] Second attempt also failed:', retryErr);
          return NextResponse.json(
            { error: 'Could not generate link — please try again' },
            { status: 503 }
          );
        }
      } else {
        throw err;
      }
    }

    // Write audit history row — fire-and-forget (never blocks or rolls back the live INSERT)
    db.insert(biodataLinkHistory)
      .values({ userId, tokenHash, expiresAt, outcome: 'pending' })
      .catch((e) => console.warn('[biodata/generate] History write failed (non-blocking):', e));

    const url = `${PUBLIC_APP_URL}/biodata/${token}`;
    return NextResponse.json({ url, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    console.error('[biodata/generate] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
