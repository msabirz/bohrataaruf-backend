'use server';

import { db } from '@/lib/db';
import { verifications } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdminAuth } from '@/lib/adminAuth';
import { revalidatePath } from 'next/cache';
import { sendPushNotification } from '@/lib/pushNotifications';

export async function approveVerification(id: string) {
  const session = await requireAdminAuth();
  
  const [updated] = await db.update(verifications)
    .set({
      status: 'verified',
      reviewedBy: session.volunteerId,
      reviewedAt: new Date(),
    })
    .where(eq(verifications.id, id))
    .returning({ userId: verifications.userId });
    
  // Notify the user their verification was approved (fire-and-forget)
  if (updated?.userId) {
    sendPushNotification(
      updated.userId,
      'verification_updates',
      "You're verified!",
      "Your ITS verification was approved. You can now browse and connect with others.",
    ).catch(e => console.warn('[push] approveVerification notify failed:', e));
  }

  revalidatePath('/admin/verifications');
}

export async function rejectVerification(id: string, reason: string) {
  const session = await requireAdminAuth();
  
  if (!reason || reason.trim() === '') {
    throw new Error('Rejection reason is required');
  }

  const [updated] = await db.update(verifications)
    .set({
      status: 'rejected',
      rejectionReason: reason.trim(),
      reviewedBy: session.volunteerId,
      reviewedAt: new Date(),
    })
    .where(eq(verifications.id, id))
    .returning({ userId: verifications.userId });

  // Notify the user they need to resubmit — no reason in the notification (shown in-app)
  if (updated?.userId) {
    sendPushNotification(
      updated.userId,
      'verification_updates',
      "Update needed on your verification",
      "We need another look at your submission. Open the app for details.",
    ).catch(e => console.warn('[push] rejectVerification notify failed:', e));
  }
    
  revalidatePath('/admin/verifications');
}
