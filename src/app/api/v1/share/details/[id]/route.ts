import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withShareUser, readJson } from '@/lib/share/routeHelper';
import { deleteDetail, updateDetail } from '@/lib/share/service';

const Schema = z.object({ label: z.string().max(200), value: z.string().max(1000) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withShareUser(request, async (userId) => {
    const body = Schema.parse(await readJson(request));
    return NextResponse.json(await updateDetail(userId, id, body.label, body.value));
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withShareUser(request, async (userId) => {
    await deleteDetail(userId, id);
    return NextResponse.json({ ok: true });
  });
}
