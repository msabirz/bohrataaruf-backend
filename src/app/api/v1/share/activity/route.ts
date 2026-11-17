import { NextResponse } from 'next/server';
import { withShareUser } from '@/lib/share/routeHelper';
import { getActivity } from '@/lib/share/service';

export async function GET(request: Request) {
  return withShareUser(request, async (userId) => {
    const days = Number(new URL(request.url).searchParams.get('days') ?? '30');
    return NextResponse.json(await getActivity(userId, days));
  });
}
