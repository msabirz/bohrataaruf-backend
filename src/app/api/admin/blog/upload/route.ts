import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { getAdminSession } from '@/lib/adminAuth';
import { allowRequest } from '@/lib/rateLimit';
import { uploadObject } from '@/lib/storage';
import { BLOG_IMAGE_PREFIX } from '@/lib/blogDoc';

const MAX_BYTES = 8 * 1024 * 1024; // what the browser may send
const ALLOWED_FORMATS = ['jpeg', 'png', 'webp', 'gif']; // read by looking at the bytes, not the file name or type

/**
 * Admin only. Takes one picture, checks it really is a picture, shrinks it, converts it to
 * WebP (which also removes any hidden location or camera data), and stores it under a random
 * name. The browser never chooses the storage name.
 */
export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!(await allowRequest('blogImageUpload', session.volunteerId))) {
      return NextResponse.json({ error: 'Too many uploads. Please wait a few minutes.' }, { status: 429 });
    }

    const declared = Number(request.headers.get('content-length') ?? 0);
    if (declared > MAX_BYTES + 64 * 1024) return NextResponse.json({ error: 'The picture is too large (8 MB at most)' }, { status: 413 });

    const form = await request.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'No picture was sent' }, { status: 400 });
    if (file.size === 0 || file.size > MAX_BYTES) return NextResponse.json({ error: 'The picture is too large (8 MB at most)' }, { status: 413 });

    const input = Buffer.from(await file.arrayBuffer());
    let output: Buffer;
    try {
      const probe = sharp(input, { limitInputPixels: 40_000_000 });
      const meta = await probe.metadata();
      if (!meta.format || !ALLOWED_FORMATS.includes(meta.format)) {
        return NextResponse.json({ error: 'Please use a JPEG, PNG, WebP or GIF picture' }, { status: 415 });
      }
      output = await sharp(input, { limitInputPixels: 40_000_000 })
        .rotate() // honour the phone's orientation before the hidden data is dropped
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      return NextResponse.json({ error: 'That file is not a usable picture' }, { status: 415 });
    }

    const name = `${randomUUID()}.webp`;
    await uploadObject(`blog/${name}`, output, 'image/webp');
    return NextResponse.json({ url: `${BLOG_IMAGE_PREFIX}${name}` }, { status: 201 });
  } catch (error) {
    console.error('[Admin blog upload]', error);
    return NextResponse.json({ error: 'Could not upload the picture' }, { status: 500 });
  }
}
