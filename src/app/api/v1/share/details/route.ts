import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withShareUser, readJson } from '@/lib/share/routeHelper';
import { addDetail } from '@/lib/share/service';

const Schema = z.object({ label: z.string().max(200), value: z.string().max(1000) });

export async function POST(request: Request) {
  return withShareUser(request, async (userId) => {
    const body = Schema.parse(await readJson(request));
    return NextResponse.json(await addDetail(userId, body.label, body.value), { status: 201 });
  });
}
