/**
 * Rate limiting utility for API routes
 * Implements a simple in-memory rate limiter with sliding window
 * Supports both IP-based and user-based rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
}

// In-memory store for rate limiting (use Redis in production for multi-instance)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupInterval) {
    return;
  }

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 60000); // Clean up every minute
}

/**
 * Default rate limit configurations for different endpoint types
 */
export const RATE_LIMITS = {
  // Strict limit for email sending (per IP)
  sendEmail: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  },
  // Per-user burst limit (plan daily/monthly caps live in lib/billing)
  sendEmailPerUser: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 emails per minute per user
  },
  // Moderate limit for auth endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  },
  // Standard limit for API endpoints
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
  },
  // Relaxed limit for read operations
  read: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 120,
  },
  // Strict limit for tracking/unsubscribe (public endpoints)
  public: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
  },
} as const;

/**
 * Extract client IP from request headers
 */
function getClientIP(request: Request): string {
  // Check common proxy headers
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Take the first IP if there are multiple
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Fallback to a default (in development)
  return "unknown-ip";
}

/**
 * Rate limiter result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Check if a request is within rate limits
 */
export function checkRateLimit(
  request: Request,
  config: RateLimitConfig,
  customKey?: string,
): RateLimitResult {
  startCleanup();

  const now = Date.now();
  const key =
    customKey || config.keyGenerator?.(request) || getClientIP(request);
  const windowKey = `${key}:${Math.floor(now / config.windowMs)}`;

  const entry = rateLimitStore.get(windowKey);

  if (!entry) {
    // First request in this window
    rateLimitStore.set(windowKey, {
      count: 1,
      resetTime: now + config.windowMs,
    });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }

  // Increment count
  entry.count++;

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Create a rate limit response with proper headers
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: "Too Many Requests",
      message: "Rate limit exceeded. Please try again later.",
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfter || 60),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.resetTime),
      },
    },
  );
}

/**
 * Rate limit middleware for API routes
 * Returns null if allowed, Response if rate limited
 */
export function rateLimit(
  request: Request,
  config: RateLimitConfig = RATE_LIMITS.api,
): Response | null {
  const result = checkRateLimit(request, config);

  if (!result.allowed) {
    return rateLimitResponse(result);
  }

  return null;
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult,
): Response {
  const headers = new Headers(response.headers);
  headers.set("X-RateLimit-Remaining", String(result.remaining));
  headers.set("X-RateLimit-Reset", String(result.resetTime));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Per-user rate limiting result (burst only; plan quotas in lib/billing)
 */
export interface UserRateLimitResult extends RateLimitResult {}

/**
 * Check per-user rate limit for email sending (per-minute burst).
 * Daily/monthly plan caps: assertEmailQuota in lib/billing.
 */
export function checkUserEmailRateLimit(
  userEmail: string,
  emailCount: number = 1,
): UserRateLimitResult {
  startCleanup();

  const now = Date.now();
  const config = RATE_LIMITS.sendEmailPerUser;

  // Check per-minute limit
  const minuteKey = `user:${userEmail}:minute:${Math.floor(now / config.windowMs)}`;
  const minuteEntry = rateLimitStore.get(minuteKey);

  if (minuteEntry && minuteEntry.count + emailCount > config.maxRequests) {
    const retryAfter = Math.ceil((minuteEntry.resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: Math.max(0, config.maxRequests - minuteEntry.count),
      resetTime: minuteEntry.resetTime,
      retryAfter,
    };
  }

  // Update per-minute counts only (daily/monthly: lib/billing)
  if (minuteEntry) {
    minuteEntry.count += emailCount;
  } else {
    rateLimitStore.set(minuteKey, {
      count: emailCount,
      resetTime: now + config.windowMs,
    });
  }

  return {
    allowed: true,
    remaining: config.maxRequests - (minuteEntry?.count || emailCount),
    resetTime: now + config.windowMs,
  };
}

/**
 * Per-user rate limit middleware for email sending
 * Returns null if allowed, Response if rate limited
 */
export function rateLimitUserEmail(
  userEmail: string,
  emailCount: number = 1,
): Response | null {
  const result = checkUserEmailRateLimit(userEmail, emailCount);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: "Too Many Emails",
        message: "Email rate limit exceeded. Please slow down and try again.",
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(result.retryAfter || 60),
          "X-RateLimit-Remaining": String(result.remaining),
        },
      },
    );
  }

  return null;
}
