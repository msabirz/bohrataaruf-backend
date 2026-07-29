import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reports } from '@/lib/db/schema';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { z } from 'zod';

const ReportSchema = z.object({
  reportedUserId: z.string().uuid(),
  reason: z.enum(['fake_profile', 'inappropriate_photo', 'inappropriate_content', 'harassment', 'not_genuine', 'other']),
  details: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = ReportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const { reportedUserId, reason, details } = parsed.data;

    if (reason === 'other' && (!details || details.trim().length === 0)) {
      return NextResponse.json({ error: 'Details are required when reason is "other"' }, { status: 400 });
    }

    if (userId === reportedUserId) {
      return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 });
    }

    await db.insert(reports).values({
      reporterId: userId,
      reportedUserId,
      reason,
      details: details?.trim() || null,
      status: 'pending'
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Report submission error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
