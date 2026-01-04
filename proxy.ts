import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { CSRF_TOKEN_NAME } from "./lib/constants";
import { validateCSRFToken, setCSRFToken } from "./lib/csrf";
import { apiLogger } from "./lib/logger";
import { rateLimit, RATE_LIMITS } from "./lib/rate-limit";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // 1. Ensure CSRF token exists for all non-static requests
  const csrfToken = request.cookies.get(CSRF_TOKEN_NAME)?.value;
  if (!csrfToken) {
    await setCSRFToken(response);
  }

  // Only apply to API routes
  if (pathname.startsWith("/api")) {
    // 2. CSRF Protection for POST/PUT/DELETE
    if (["POST", "PUT", "DELETE"].includes(request.method)) {
      // Skip CSRF for public tracking/unsubscribe endpoints if they exist
      // Also skip for NextAuth endpoints - NextAuth has its own CSRF protection
      const isPublicApi =
        pathname.startsWith("/api/public") ||
        pathname.startsWith("/api/tracking") ||
        pathname.startsWith("/api/unsubscribe") ||
        pathname.startsWith("/api/appwrite/webhooks") ||
        pathname.startsWith("/api/auth");

      if (!isPublicApi) {
        const isValidCSRF = await validateCSRFToken(request);
        if (!isValidCSRF) {
          return NextResponse.json(
            { error: "Invalid CSRF token" },
            { status: 403 },
          );
        }
      }
    }

    // 3. Global Rate Limiting for API
    const rateLimitResponse = rateLimit(request, RATE_LIMITS.api);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // 4. Specific logic for email sending routes
    if (pathname.startsWith("/api/send-email")) {
      // Add custom headers for large request handling
      response.headers.set("x-middleware-cache", "no-cache");

      // Log request size for debugging large payloads
      const contentLength = request.headers.get("content-length");
      if (contentLength) {
        const sizeInMB = (parseInt(contentLength) / 1024 / 1024).toFixed(2);
        apiLogger.debug(`Email API request`, {
          sizeMB: sizeInMB,
          path: pathname,
        });
      }
    }
  }

  return response;
}

// Export matcher to cover all routes except static assets
export const matcher = [
  "/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)",
];
