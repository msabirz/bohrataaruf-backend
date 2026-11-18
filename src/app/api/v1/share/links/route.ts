import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withShareUser, readJson } from '@/lib/share/routeHelper';
import { createLink, ShareError } from '@/lib/share/service';
import { allowRequest } from '@/lib/rateLimit';
import { EXPIRY_KINDS } from '@/lib/share/links';

const Schema = z.object({ label: z.string().max(200), expiryKind: z.enum(EXPIRY_KINDS) });

export async function POST(request: Request) {
  return withShareUser(request, async (userId) => {
    if (!(await allowRequest('shareLinkCreate', userId))) {
      throw new ShareError('You have made a lot of links in a short time. Please try again later.', 429);
    }
    const body = Schema.parse(await readJson(request));
    const link = await createLink(userId, body.label, body.expiryKind);
    return NextResponse.json(link, { status: 201 });
  });
}
