import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getLimiterForPath } from '@/lib/rateLimit';

console.log('[middleware] JWT_SECRET loaded:', process.env.JWT_SECRET ? `yes, length ${process.env.JWT_SECRET.length}` : 'NO - USING FALLBACK');

// Define explicitly public routes that DO NOT require a JWT.
// Everything else under /api/v1 is protected by default.
const publicRoutes = [
  '/api/v1/auth/otp/request',
  '/api/v1/auth/otp/verify',
  '/api/v1/auth/login',
  '/api/v1/auth/signup',
  '/api/v1/auth/logout',
  '/api/v1/auth/password/reset-request',
  '/api/v1/auth/password/reset-confirm',
  '/api/v1/app/mode', // SITE_MODE bridge — must be readable before login to gate the marketing page
  '/api/v1/stats/registered', // Public registered-count stat for the pre-launch page
  '/api/admin', // Admin routes use their own admin_session cookie auth
  '/api/marketing', // Marketing website routes are strictly public
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Page routes (not /api/*) are NOT auth-gated here — middleware's matcher below only
  // covers the new authenticated app pages for the sole purpose of stamping x-pathname,
  // so their Server Component layout (src/app/(app)/layout.tsx) can build a
  // ?redirect=<path> target. The actual auth check for those pages happens independently
  // and server-side in that layout, not here.
  if (!pathname.startsWith('/api/')) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-pathname', pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Check if the route is explicitly public
  const isPublic = publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (isPublic) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');
  const authCookie = request.cookies.get('auth_token')?.value;
  
  console.log('[middleware] Path:', request.nextUrl.pathname);
  console.log('[middleware] Auth header present:', !!authHeader, '| Cookie present:', !!authCookie);

  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (authCookie) {
    token = authCookie;
  }

  if (!token) {
    console.log('[middleware] Missing or malformed header and no cookie');
    return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
  }

  try {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is missing');
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    
    // Verify the JWT
    const { payload } = await jwtVerify(token, secret);
    
    console.log('[middleware] JWT verified for user:', payload.userId);

    if (!payload.userId || typeof payload.userId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized: Invalid token payload' }, { status: 401 });
    }

    // --- RATE LIMITING (KILL-SWITCH & FAIL-OPEN) ---
    if (process.env.RATE_LIMITING_ENABLED === 'true') {
      try {
        const limiter = getLimiterForPath(pathname);
        if (limiter) {
          const { success } = await limiter.limit(payload.userId);
          if (!success) {
            console.log(`[middleware] RATE LIMITED: ${payload.userId} on ${pathname}`);
            return NextResponse.json(
              { error: 'RATE_LIMITED', message: 'Please slow down and try again in a moment.' },
              { status: 429, headers: { 'Retry-After': '60' } }
            );
          }
        }
      } catch (error: any) {
        // Fail Open: Let the request through if Upstash is unreachable or misconfigured
        console.warn('[middleware] Rate Limiter Error (Failing Open):', error?.message || error);
      }
    }
    // -----------------------------------------------

    // Clone the request headers and inject the strictly verified userId
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error: any) {
    console.error('[middleware] JWT Verification Failed:', error?.name, error?.message, error?.code);
    return NextResponse.json({ error: 'Unauthorized: Token verification failed' }, { status: 401 });
  }
}

// Runs on API routes (auth-gated there) plus the new authenticated app pages
// (pathname-stamping only for those — see the branch above).
export const config = {
  matcher: ['/api/:path*', '/discover/:path*', '/interests/:path*', '/profile/:path*', '/settings/:path*', '/matches/:path*'],
};
