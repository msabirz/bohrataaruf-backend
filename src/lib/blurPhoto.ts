import sharp from 'sharp';
import { getViewUrl } from '@/lib/storage';

/**
 * Fetches the original photo from R2 using a presigned URL, then blurs it
 * server-side with sharp, returning the raw JPEG buffer (not a data URI).
 *
 * Resize to 800px max dimension, then gaussian blur (sigma 20) — strong enough
 * to be genuinely non-identifying, and blur decimates high-frequency detail so
 * JPEG compresses very efficiently.
 *
 * Returns null if no photoKey is provided or the fetch/blur fails.
 */
export async function generateBlurredPhotoBuffer(photoKey: string | null | undefined): Promise<Buffer | null> {
  if (!photoKey) return null;

  try {
    const presignedUrl = await getViewUrl(photoKey);
    if (!presignedUrl) return null;

    const res = await fetch(presignedUrl);
    if (!res.ok) {
      console.warn('[blurPhoto] Failed to fetch from R2:', res.status, res.statusText);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return await sharp(buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .blur(20)
      .jpeg({ quality: 70 })
      .toBuffer();
  } catch (e) {
    console.warn('[blurPhoto] Error blurring photo:', e);
    return null;
  }
}

/**
 * Same as generateBlurredPhotoBuffer, but returns a base64 data URI — useful for
 * embedding directly in an HTML response with no separate image request.
 */
export async function fetchAndBlurPhoto(photoKey: string | null | undefined): Promise<string | null> {
  const buffer = await generateBlurredPhotoBuffer(photoKey);
  if (!buffer) return null;
  return `data:image/jpeg;base64,${buffer.toString('base64')}`;
}

/** Derives the blurred derivative's R2 key from the real photo's key. */
export function blurredKeyFor(photoKey: string): string {
  return photoKey.replace(/(\.[^./]+)$/, '-blurred$1');
}
