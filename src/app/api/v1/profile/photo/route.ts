import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { UploadPhotoSchema } from '@/lib/api/validators';
import { getViewUrl, objectExists, uploadObject } from '@/lib/storage';
import { generateBlurredPhotoBuffer, blurredKeyFor } from '@/lib/blurPhoto';

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const parsed = UploadPhotoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const { photoKey } = parsed.data;

    // photoKey must be the server-issued key from /profile/photo/upload-url — reject
    // anything else (raw local device URIs, arbitrary strings, keys for other users).
    const expectedPrefix = `profile-photos/${userId}-`;
    if (!photoKey.startsWith(expectedPrefix) || !photoKey.endsWith('.jpg')) {
      return NextResponse.json({ error: 'Invalid photoKey: must be issued by /profile/photo/upload-url' }, { status: 400 });
    }

    // The upload itself happens client-side directly to R2; confirm it actually landed
    // before persisting the reference, so a failed/skipped upload can't leave a dead key.
    if (!(await objectExists(photoKey))) {
      return NextResponse.json({ error: 'Photo not found in storage — upload may have failed. Please retry the upload.' }, { status: 400 });
    }

    // Generate the blurred derivative ONCE, here, at upload time — never live/on-demand
    // per request, which would reintroduce the batch-latency problem. A failure here must
    // not fail the upload; it just leaves photoKeyBlurred null (falls back to the existing
    // safe "no photo shown until unlock" behavior) until a retry or backfill fixes it.
    let photoKeyBlurred: string | null = null;
    try {
      const blurredBuffer = await generateBlurredPhotoBuffer(photoKey);
      if (blurredBuffer) {
        photoKeyBlurred = blurredKeyFor(photoKey);
        await uploadObject(photoKeyBlurred, blurredBuffer, 'image/jpeg');
      }
    } catch (e) {
      console.warn('[profile/photo] Failed to generate blurred derivative:', e);
    }

    await db.update(profiles).set({ photoKey, photoKeyBlurred }).where(eq(profiles.userId, userId));

    return NextResponse.json({ photoUri: await getViewUrl(photoKey) });
  } catch (error) {
    console.error('Upload photo error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
