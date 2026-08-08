import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAuth';
import { cleanupExpiredNudgeMessages } from '@/lib/nearbyRetention';

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

export async function GET(request: Request) {
  // Support GET for Vercel Cron or simple manual browser trigger by admin
  try {
    const isAuth = await authorize(request);
    if (!isAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await cleanupExpiredNudgeMessages();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[Admin Cleanup Expired Nudges API error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const isAuth = await authorize(request);
    if (!isAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await cleanupExpiredNudgeMessages();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[Admin Cleanup Expired Nudges API error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
