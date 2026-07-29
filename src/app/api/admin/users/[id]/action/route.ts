import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, adminActionLog } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAdminSession } from '@/lib/adminAuth';
import { deleteUserAccount } from '@/lib/api/userOps';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const params = await props.params;
    const targetUserId = params.id;
    const body = await request.json();
    const { action, reason } = body;

    if (!['suspended', 'reactivated', 'deleted'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const targetUser = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1).then(r => r[0]);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Process action
    if (action === 'suspended') {
      await db.update(users).set({ isActive: false }).where(eq(users.id, targetUserId));
    } else if (action === 'reactivated') {
      await db.update(users).set({ isActive: true }).where(eq(users.id, targetUserId));
    } else if (action === 'deleted') {
      await deleteUserAccount(targetUserId);
    }

    // Write audit log
    // Because targetUserId on adminActionLog does NOT have an FK, this is perfectly safe even if deleted.
    await db.insert(adminActionLog).values({
      volunteerId: session.volunteerId,
      targetUserId: targetUserId,
      action: action,
      reason: reason || null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Action Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
