import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let redis: Redis | null = null;
let limiters: Record<string, Ratelimit> | null = null;

/**
 * Lazy load limiters so that the Upstash Redis client is only instantiated
 * if rate limiting is enabled and actually triggered.
 */
function getLimiters() {
  if (limiters) return limiters;

  // Initialize redis using UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from environment
  redis = Redis.fromEnv();

  limiters = {
    // 30 requests per 60 seconds per user
    interactions: new Ratelimit({
      redis,
      limiter: Ratelimit.tokenBucket(30, '60 s', 30),
      analytics: true,
      prefix: 'ratelimit:interactions',
    }),
    
    // 20 requests per 60 seconds per user
    photoView: new Ratelimit({
      redis,
      limiter: Ratelimit.tokenBucket(20, '60 s', 20),
      analytics: true,
      prefix: 'ratelimit:photoView',
    }),
    
    // 60 requests per 60 seconds per user
    discovery: new Ratelimit({
      redis,
      limiter: Ratelimit.tokenBucket(60, '60 s', 60),
      analytics: true,
      prefix: 'ratelimit:discovery',
    }),
    
    // 10 reports per 24 hours per user
    reports: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '24 h'),
      analytics: true,
      prefix: 'ratelimit:reports',
    }),

    // Share your biodata: signed-in endpoints, per user.
    // 60 requests per minute across all /api/v1/share routes.
    share: new Ratelimit({
      redis,
      limiter: Ratelimit.tokenBucket(60, '60 s', 60),
      analytics: true,
      prefix: 'ratelimit:share',
    }),

    // 20 new links per hour per user (stops link spam).
    shareLinkCreate: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '1 h'),
      analytics: true,
      prefix: 'ratelimit:shareLinkCreate',
    }),

    // 5 password confirmations per 10 minutes per user: the "show my own photo" step is
    // a password check, so it must not work as a password-guessing tool.
    sharePasswordCheck: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '10 m'),
      analytics: true,
      prefix: 'ratelimit:sharePasswordCheck',
    }),

    // Public shared page, per visitor address: 60 views per minute.
    sharePublicView: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      analytics: true,
      prefix: 'ratelimit:sharePublicView',
    }),

    // Public shared page, per link and visitor: 30 views per minute, so reloading one
    // link over and over cannot inflate its open count or hammer the database.
    sharePublicViewLink: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '1 m'),
      analytics: true,
      prefix: 'ratelimit:sharePublicViewLink',
    }),

    // 5 password resets per 60 minutes per IP/User
    passwordReset: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '60 m'),
      analytics: true,
      prefix: 'ratelimit:passwordReset',
    }),
  };

  return limiters;
}

/**
 * Routes a request path to the appropriate rate limiter.
 * Returns null if the path is not protected by rate limiting.
 */
export function getLimiterForPath(pathname: string): Ratelimit | null {
  // Normalize path to make matching easier (assuming prefix /api/v1 is already matched)
  if (pathname.includes('/interactions/interested') || pathname.includes('/interactions/skip')) {
    return getLimiters().interactions;
  }
  
  if (pathname.includes('/matching/photo-view')) {
    return getLimiters().photoView;
  }
  
  if (
    pathname.includes('/matching/next') || 
    pathname.includes('/matching/batch') || 
    pathname.includes('/matching/search')
  ) {
    return getLimiters().discovery;
  }
  
  if (pathname.includes('/reports')) {
    return getLimiters().reports;
  }

  if (pathname.includes('/auth/password/reset-request')) {
    return getLimiters().passwordReset;
  }

  if (pathname.includes('/api/v1/share')) {
    return getLimiters().share;
  }

  return null;
}

export type NamedLimiter = 'shareLinkCreate' | 'sharePasswordCheck' | 'sharePublicView' | 'sharePublicViewLink';

/**
 * For limits that the path-based middleware cannot express (they depend on the request
 * body, or the route is a page rather than an API). Same safety rules as the middleware:
 * does nothing unless RATE_LIMITING_ENABLED is 'true', and FAILS OPEN if Upstash is
 * unreachable, so a Redis outage can never lock people out. Returns true if allowed.
 */
export async function allowRequest(name: NamedLimiter, identifier: string): Promise<boolean> {
  if (process.env.RATE_LIMITING_ENABLED !== 'true') return true;
  try {
    const { success } = await getLimiters()[name].limit(identifier);
    return success;
  } catch (error) {
    console.warn('[rateLimit] error, failing open:', error instanceof Error ? error.message : error);
    return true;
  }
}
