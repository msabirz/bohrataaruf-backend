import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contactMessages } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { z } from 'zod';

const TicketSchema = z.object({
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  // name + email are pre-filled by the server from the user record
});

/**
 * GET /api/v1/support/tickets
 * Returns the authenticated user's own tickets only.
 * userId is ALWAYS taken from the verified session — never from client params.
 */
export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tickets = await db
      .select({
        id: contactMessages.id,
        subject: contactMessages.subject,
        message: contactMessages.message,
        status: contactMessages.status,
        adminReplyText: contactMessages.adminReplyText,
        repliedAt: contactMessages.repliedAt,
        createdAt: contactMessages.createdAt,
      })
      .from(contactMessages)
      .where(eq(contactMessages.userId, userId))
      .orderBy(desc(contactMessages.createdAt))
      .limit(50);

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('[Support Tickets GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/v1/support/tickets
 * Submit a new support ticket linked to the authenticated user.
 */
export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = TicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const { subject, message } = parsed.data;

    // Pull user's name and phone from DB so the ticket is pre-populated for admin
    const { db: dbClient } = await import('@/lib/db');
    const { users } = await import('@/lib/db/schema');
    const { eq: eqFn } = await import('drizzle-orm');
    const user = await dbClient
      .select({ name: users.name, phone: users.phone, email: users.email })
      .from(users)
      .where(eqFn(users.id, userId))
      .limit(1)
      .then(r => r[0]);

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const inserted = await db.insert(contactMessages).values({
      userId,
      name: user.name,
      // Phone/email are both optional pre-onboarding now (new ITS-first
      // signup flow) — prefer phone as the contact identifier, fall back to
      // email, then a placeholder rather than writing null into a NOT NULL column.
      email: user.phone ?? user.email ?? 'Not provided',
      subject,
      message,
    }).returning({ id: contactMessages.id });

    return NextResponse.json({ success: true, ticketId: inserted[0]?.id });
  } catch (error) {
    console.error('[Support Tickets POST]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
