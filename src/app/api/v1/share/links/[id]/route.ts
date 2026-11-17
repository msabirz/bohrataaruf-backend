import { NextResponse } from 'next/server';
import { withShareUser } from '@/lib/share/routeHelper';
import { getLinkDetail } from '@/lib/share/service';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withShareUser(request, async (userId) => NextResponse.json(await getLinkDetail(userId, id)));
}
