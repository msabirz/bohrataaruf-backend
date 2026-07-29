import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { db } from '@/lib/db';
import { verifications, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { keysToCamelCase } from '@/lib/api/serialize';

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Join with users to grab the ITS Number hash to simulate the status shape
    const verification = await db
      .select({
        status: verifications.status,
        submittedAt: verifications.createdAt,
        rejectionReason: verifications.rejectionReason,
        itsNumberHash: users.itsNumberHash,
      })
      .from(verifications)
      .innerJoin(users, eq(users.id, verifications.userId))
      .where(eq(verifications.userId, userId))
      .limit(1)
      .then(res => res[0]);

    if (!verification) {
      return NextResponse.json({ status: 'none' });
    }

    // Since the actual ITS number is never stored, the API might mock it or we omit it.
    // We map it properly using our serializer.
    return NextResponse.json(keysToCamelCase(verification));
  } catch (error) {
    console.error('Get verification status error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
