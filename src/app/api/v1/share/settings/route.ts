import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withShareUser, readJson } from '@/lib/share/routeHelper';
import { getOverview, setSharingEnabled, ShareError, updateSettings } from '@/lib/share/service';
import { allowRequest } from '@/lib/rateLimit';

const Schema = z.object({
  sharingEnabled: z.boolean().optional(),
  nameMode: z.enum(['first', 'full']).optional(),
  photoMode: z.enum(['blurred', 'own']).optional(),
  visibleFields: z.array(z.string()).max(40).optional(),
  // Only needed when switching the photo to "own".
  password: z.string().max(200).optional(),
});

export async function PATCH(request: Request) {
  return withShareUser(request, async (userId) => {
    const body = Schema.parse(await readJson(request));
    // A password in the request means this is the "show my own photo" confirmation.
    if (body.password !== undefined && !(await allowRequest('sharePasswordCheck', userId))) {
      throw new ShareError('Too many password attempts. Please wait a few minutes and try again.', 429);
    }
    await updateSettings(userId, body, { password: body.password });
    if (body.sharingEnabled !== undefined) await setSharingEnabled(userId, body.sharingEnabled);
    return NextResponse.json(await getOverview(userId));
  });
}
