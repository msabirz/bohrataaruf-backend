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

  return null;
}
