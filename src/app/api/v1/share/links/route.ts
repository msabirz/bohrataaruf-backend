import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withShareUser, readJson } from '@/lib/share/routeHelper';
import { createLink } from '@/lib/share/service';
import { EXPIRY_KINDS } from '@/lib/share/links';

const Schema = z.object({ label: z.string().max(200), expiryKind: z.enum(EXPIRY_KINDS) });

export async function POST(request: Request) {
  return withShareUser(request, async (userId) => {
    const body = Schema.parse(await readJson(request));
    const link = await createLink(userId, body.label, body.expiryKind);
    return NextResponse.json(link, { status: 201 });
  });
}
