import { NextResponse } from 'next/server';
import { withShareUser } from '@/lib/share/routeHelper';
import { getOverview } from '@/lib/share/service';

export async function GET(request: Request) {
  return withShareUser(request, async (userId) => NextResponse.json(await getOverview(userId)));
}
