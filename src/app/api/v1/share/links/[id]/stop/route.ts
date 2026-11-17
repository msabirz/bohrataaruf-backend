import { NextResponse } from 'next/server';
import { withShareUser } from '@/lib/share/routeHelper';
import { stopLink } from '@/lib/share/service';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withShareUser(request, async (userId) => {
    await stopLink(userId, id);
    return NextResponse.json({ ok: true });
  });
}
