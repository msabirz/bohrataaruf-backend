import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifications, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ItsCardSchema } from '@/lib/api/validators';
import { keysToCamelCase } from '@/lib/api/serialize';
import { getAuthenticatedUserId, hashItsNumber } from '@/lib/api/auth';

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = ItsCardSchema.safeParse(body);
    
    if (!parsed.success) {
      console.error('[its-card] Zod validation failed:', JSON.stringify(parsed.error.format(), null, 2));
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const { cardImageKey, itsNumber } = parsed.data;

    // Process the cardImageKey, trigger OCR, etc. 
    // The cardImageKey is uploaded to S3/Cloudinary and we only persist a status row.
    // We strictly DO NOT store the image or base64 blob in Postgres.
    
    // Hash the ITS number and save it to the users table securely
    const itsNumberHash = hashItsNumber(itsNumber);
    try {
      await db.update(users).set({ itsNumberHash }).where(eq(users.id, userId));
    } catch (err: any) {
      const dbErrorCode = err?.code || err?.cause?.code;
      if (dbErrorCode === '23505') {
        return NextResponse.json({ 
          error: 'DUPLICATE_ITS_NUMBER', 
          message: 'This ITS number is already registered to another account. If you believe this is a mistake, please contact support.' 
        }, { status: 409 });
      }
      throw err;
    }
    
    let verificationRow = await db.select().from(verifications).where(eq(verifications.userId, userId)).limit(1).then(res => res[0]);

    if (verificationRow) {
      verificationRow = await db.update(verifications)
        .set({ status: 'pending', rejectionReason: null, cardImageKey })
        .where(eq(verifications.userId, userId))
        .returning()
        .then(res => res[0]);
    } else {
      verificationRow = await db.insert(verifications)
        .values({ userId, status: 'pending', cardImageKey })
        .returning()
        .then(res => res[0]);
    }

    // Grab itsNumberHash for the frontend response mapping
    const user = await db.select({ itsNumberHash: users.itsNumberHash }).from(users).where(eq(users.id, userId)).limit(1).then(res => res[0]);

    const verificationPayload = {
      status: verificationRow.status,
      submittedAt: verificationRow.createdAt,
      rejectionReason: verificationRow.rejectionReason,
      itsNumberHash: user?.itsNumberHash,
    };

    return NextResponse.json(keysToCamelCase(verificationPayload));
  } catch (error) {
    console.error('Upload ITS card error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
