import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { volunteers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createAdminSession } from '@/lib/adminAuth';
import { headers } from 'next/headers';

// Simple in-memory rate limiter to prevent brute force
const attemptsMap = new Map<string, { count: number; expiresAt: number }>();
const MAX_ATTEMPTS = 10;
const LOCKOUT_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const record = attemptsMap.get(ip);
  const now = Date.now();
  
  if (!record) {
    attemptsMap.set(ip, { count: 1, expiresAt: now + LOCKOUT_MS });
    return true; // allowed
  }

  if (now > record.expiresAt) {
    // Reset if time has passed
    attemptsMap.set(ip, { count: 1, expiresAt: now + LOCKOUT_MS });
    return true; // allowed
  }

  if (record.count >= MAX_ATTEMPTS) {
    return false; // blocked
  }

  record.count += 1;
  return true; // allowed
}

export async function POST(request: Request) {
  try {
    const headerStore = await headers();
    const ip = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               headerStore.get('x-real-ip') || 
               'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many failed attempts. Try again later.' }, { status: 429 });
    }

    const { name, password } = await request.json();

    if (!name || !password) {
      return NextResponse.json({ error: 'Name and password required' }, { status: 400 });
    }

    let correctPassword = process.env.ADMIN_PANEL_PASSWORD;
    if (!correctPassword) {
      console.error('ADMIN_PANEL_PASSWORD env var is missing!');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    // Strip surrounding quotes if dotenvx accidentally preserved them
    correctPassword = correctPassword.replace(/^"|"$/g, '');

    if (password.trim() !== correctPassword.trim()) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Password is correct, find or create the volunteer
    let volunteer = await db.select().from(volunteers).where(eq(volunteers.name, name)).limit(1).then(r => r[0]);

    if (!volunteer) {
      const inserted = await db.insert(volunteers).values({ name }).returning();
      volunteer = inserted[0];
    }

    if (!volunteer.active) {
      return NextResponse.json({ error: 'This volunteer account has been deactivated' }, { status: 403 });
    }

    // Success! Clear rate limit for this IP
    attemptsMap.delete(ip);

    // Create session cookie
    await createAdminSession({ volunteerId: volunteer.id, name: volunteer.name });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/login] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
