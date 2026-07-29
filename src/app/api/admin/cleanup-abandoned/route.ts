import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAuth';
import { cleanupAbandonedAccounts, ABANDONED_THRESHOLD_DAYS } from '@/lib/abandoned';

async function authorize(request: Request) {
  // Check Vercel Cron Secret first
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }
  // Otherwise check Admin session cookie/token
  const session = await getAdminSession();
  if (session) {
    return true;
  }
  return false;
}

export async function POST(request: Request) {
  try {
    const isAuth = await authorize(request);
    if (!isAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let thresholdDays = ABANDONED_THRESHOLD_DAYS;
    try {
      const body = await request.json();
      if (typeof body.thresholdDays === 'number' && body.thresholdDays > 0) {
        thresholdDays = body.thresholdDays;
      }
    } catch {
      // Body might be empty or invalid JSON, use default threshold
    }

    const result = await cleanupAbandonedAccounts(thresholdDays);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[Admin Cleanup Abandoned API error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  // Support GET for Vercel Cron or simple manual browser trigger by admin
  try {
    const isAuth = await authorize(request);
    if (!isAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const daysParam = url.searchParams.get('days');
    const thresholdDays = daysParam ? parseInt(daysParam, 10) || ABANDONED_THRESHOLD_DAYS : ABANDONED_THRESHOLD_DAYS;

    const result = await cleanupAbandonedAccounts(thresholdDays);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[Admin Cleanup Abandoned API error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
