import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { sharePromoSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAdminSession } from '@/lib/adminAuth';
import { getSharePromo } from '@/lib/share/promo';

const httpsUrl = z.string().trim().max(200).url().refine((u) => u.startsWith('https://'), 'Must start with https://');
const Schema = z.object({
  promoText: z.string().trim().min(1).max(200),
  joinLabel: z.string().trim().min(1).max(40),
  instagramUrl: httpsUrl,
  siteUrl: httpsUrl,
});

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await getSharePromo());
}

export async function PUT(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const parsed = Schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      return NextResponse.json({ error: msg || 'Invalid values' }, { status: 400 });
    }
    await db
      .insert(sharePromoSettings)
      .values({ id: 1, ...parsed.data, updatedAt: new Date() })
      .onConflictDoUpdate({ target: sharePromoSettings.id, set: { ...parsed.data, updatedAt: new Date() } });
    return NextResponse.json(await getSharePromo());
  } catch (error) {
    console.error('[Admin share promo]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
