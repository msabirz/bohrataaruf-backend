import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, adminActionLog } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAdminSession } from '@/lib/adminAuth';
import { sendShareInviteEmail } from '@/lib/email';

/**
 * Admin presses "Send share link" on one user's row: emails her the button to
 * her share settings. One user at a time; can be pressed again to resend.
 * Failure is reported (not swallowed) and is NOT logged as sent.
 */
export async function POST(_request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await props.params;
    const user = await db.select().from(users).where(eq(users.id, id)).limit(1).then((r) => r[0]);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (!user.email) return NextResponse.json({ error: 'This user has no email on file' }, { status: 400 });
    if (!user.isActive) return NextResponse.json({ error: 'This account is suspended' }, { status: 400 });

    try {
      await sendShareInviteEmail(user.email, user.name);
    } catch (e) {
      console.warn('[admin] sendShareInviteEmail failed:', e);
      return NextResponse.json({ error: 'The email could not be sent. Check the email provider and your monthly quota, then try again.' }, { status: 502 });
    }

    await db.insert(adminActionLog).values({
      volunteerId: session.volunteerId,
      targetUserId: id,
      action: 'sent_share_invite_email',
      reason: null,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin share-invite]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
