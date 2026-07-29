import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import crypto from 'crypto';
import { getUploadUrl } from '@/lib/storage';

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Generate a unique object key for this upload
    const objectKey = `profile-photos/${userId}-${crypto.randomBytes(8).toString('hex')}.jpg`;

    const uploadUrl = await getUploadUrl(objectKey, 'image/jpeg');

    return NextResponse.json({
      uploadUrl,
      objectKey,
    });
  } catch (error) {
    console.error('Generate profile photo upload URL error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
