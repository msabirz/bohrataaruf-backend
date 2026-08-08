import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { getViewUrl } from '@/lib/storage';

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rawResult: any = await db.execute(sql`
      SELECT
        n.id as "nudgeId",
        n.status as "rawStatus",
        n.expires_at as "expiresAt",
        n.created_at as "createdAt",
        CASE WHEN n.from_user_id = ${userId} THEN n.to_user_id ELSE n.from_user_id END as "otherUserId",
        p.alias as "otherAlias",
        p.photo_key_blurred as "otherPhotoKeyBlurred",
        lm.message as "lastMessage",
        lm.created_at as "lastMessageAt",
        CASE
          WHEN lm.from_user_id IS NOT NULL AND lm.from_user_id != ${userId}
            AND lm.created_at > COALESCE(
              CASE WHEN n.from_user_id = ${userId} THEN n.last_read_by_from ELSE n.last_read_by_to END,
              '1970-01-01'::timestamptz
            )
          THEN true ELSE false
        END as "hasUnread"
      FROM nudges n
      JOIN profiles p ON p.user_id = (CASE WHEN n.from_user_id = ${userId} THEN n.to_user_id ELSE n.from_user_id END)
      LEFT JOIN LATERAL (
        SELECT message, from_user_id, created_at
        FROM nudge_messages nm
        WHERE nm.nudge_id = n.id
        ORDER BY nm.created_at DESC
        LIMIT 1
      ) lm ON true
      WHERE n.from_user_id = ${userId} OR n.to_user_id = ${userId}
      ORDER BY COALESCE(lm.created_at, n.created_at) DESC
    `);
    const rows = Array.isArray(rawResult) ? rawResult : rawResult.rows || [];

    const threads = await Promise.all(
      rows.map(async (row: any) => {
        // rawStatus 'active' but past expiry means nobody explicitly ended
        // it yet (no endpoint flips status on time passing) — computed
        // here rather than stored, same distinction the chat screen itself
        // makes client-side against expiresAt.
        let status: 'active' | 'ended' | 'expired';
        if (row.rawStatus === 'active') {
          status = new Date(row.expiresAt) > new Date() ? 'active' : 'expired';
        } else {
          status = 'ended';
        }

        return {
          nudgeId: row.nudgeId,
          otherUserId: row.otherUserId,
          alias: row.otherAlias,
          photoUri: await getViewUrl(row.otherPhotoKeyBlurred),
          lastMessage: row.lastMessage,
          // raw db.execute() returns Postgres timestamps as non-ISO strings
          // ("2026-08-05 13:17:03+00") — Hermes (React Native's JS engine)
          // is much stricter than Node/V8 about parsing those and can
          // return Invalid Date, so these are normalized to ISO 8601 here
          // rather than relying on the client to parse the raw format.
          lastMessageAt: row.lastMessageAt ? new Date(row.lastMessageAt).toISOString() : null,
          hasUnread: row.hasUnread,
          status,
          expiresAt: new Date(row.expiresAt).toISOString(),
          createdAt: new Date(row.createdAt).toISOString(),
        };
      })
    );

    return NextResponse.json({ threads });
  } catch (error) {
    console.error('Get nearby nudges error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
