import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reports, adminActionLog } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdminAuth } from '@/lib/adminAuth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const session = await requireAdminAuth();
    const { id } = await params;
    const { action, status, reason } = await request.json();

    const report = await db.select().from(reports).where(eq(reports.id, id)).limit(1).then(res => res[0]);
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (action === 'update_status') {
      if (!['pending', 'reviewed', 'actioned', 'dismissed'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }

      await db.update(reports)
        .set({ 
          status, 
          reviewedBy: session.volunteerId,
          reviewedAt: new Date()
        })
        .where(eq(reports.id, id));

      await db.insert(adminActionLog).values({
        volunteerId: session.volunteerId,
        targetUserId: report.reportedUserId,
        action: `report_${status}`,
        reason: reason || `Report ${id} marked as ${status}`
      });

      return NextResponse.json({ success: true, status });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Report action error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
