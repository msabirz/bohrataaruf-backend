import { NextResponse } from 'next/server';
import { downloadObject } from '@/lib/storage';

const NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

/**
 * Public. Serves a picture used in a blog post. Only names that look exactly like the ones the
 * upload route creates are accepted, and they are always read from the "blog/" folder, so this
 * cannot be used to fetch anything else from storage (such as members' photos).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!NAME.test(name)) return new NextResponse('Not found', { status: 404 });

  const object = await downloadObject(`blog/${name}`);
  if (!object) return new NextResponse('Not found', { status: 404 });

  return new NextResponse(new Uint8Array(object.body), {
    status: 200,
    headers: {
      'Content-Type': 'image/webp', // always ours, whatever storage says
      'Cache-Control': 'public, max-age=31536000, immutable', // the name never changes its picture
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  });
}
