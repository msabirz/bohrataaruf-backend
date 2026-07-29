import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { volunteers, adminActionLog } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAdminSession } from '@/lib/adminAuth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: targetVolunteerId } = await params;
    const { action } = await request.json();

    if (action !== 'deactivate' && action !== 'reactivate') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Safeguard against self-deactivation
    if (targetVolunteerId === session.volunteerId && action === 'deactivate') {
      return NextResponse.json(
        { error: 'You cannot deactivate your own account.' },
        { status: 400 }
      );
    }

    // Verify the target volunteer exists
    const targetVolunteer = await db.query.volunteers.findFirst({
      where: eq(volunteers.id, targetVolunteerId)
    });

    if (!targetVolunteer) {
      return NextResponse.json({ error: 'Volunteer not found' }, { status: 404 });
    }

    // Perform the action
    const newActiveState = action === 'reactivate';
    await db.update(volunteers)
      .set({ active: newActiveState })
      .where(eq(volunteers.id, targetVolunteerId));

    // Write audit log
    await db.insert(adminActionLog).values({
      volunteerId: session.volunteerId,
      targetVolunteerId: targetVolunteerId,
      action: action === 'deactivate' ? 'volunteer_deactivated' : 'volunteer_reactivated',
      reason: `Performed by ${session.name}`,
    });

    return NextResponse.json({ success: true, active: newActiveState });
  } catch (error) {
    console.error('[Admin Volunteer Action API]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
