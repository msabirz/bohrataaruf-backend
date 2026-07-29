import sharp from 'sharp';
import { getViewUrl } from '@/lib/storage';

/**
 * Fetches the original photo from R2 using a presigned URL, then blurs it
 * server-side with sharp and returns a base64 data URI.
 *
 * The data URI is embedded directly in the HTML page so no separate image
 * request is needed (and the raw un-blurred photo key is never exposed).
 *
 * Returns null if no photoKey is provided.
 */
export async function fetchAndBlurPhoto(photoKey: string | null | undefined): Promise<string | null> {
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

    // Resize to 800px max dimension, then apply gaussian blur (sigma 20)
    // Blur decimates high-frequency detail → JPEG compresses very efficiently
    const blurred = await sharp(buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .blur(20)
      .jpeg({ quality: 70 })
      .toBuffer();

    return `data:image/jpeg;base64,${blurred.toString('base64')}`;
  } catch (e) {
    console.warn('[blurPhoto] Error blurring photo:', e);
    return null;
  }
}
