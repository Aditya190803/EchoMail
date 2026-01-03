/**
 * Rate limiting utility for API routes
 * Implements a simple in-memory rate limiter with sliding window
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
  // Strict limit for email sending
  sendEmail: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
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
