import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getAuthenticatedUserId } from '@/lib/api/auth';
import { ShareError } from './service';

/** Auth + uniform error handling for the account-side share endpoints. */
export async function withShareUser(
  request: Request,
  handler: (userId: string) => Promise<Response>,
): Promise<Response> {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return await handler(userId);
  } catch (error) {
    if (error instanceof ShareError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof ZodError) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    console.error('[share api]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function readJson(request: Request): Promise<unknown> {
  try { return await request.json(); } catch { return {}; }
}
