import { NextResponse } from 'next/server';
import { getSiteMode } from '@/lib/modeGuard';

export async function GET() {
  return NextResponse.json({ mode: getSiteMode() });
}
