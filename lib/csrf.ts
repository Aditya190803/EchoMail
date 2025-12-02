/**
 * CSRF Protection Utilities
 * Implements token-based CSRF protection for form submissions
 */

import { cookies } from "next/headers";

const CSRF_TOKEN_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const TOKEN_LENGTH = 32;

/**
 * Generate a secure random CSRF token
 */
function generateToken(): string {
  const array = new Uint8Array(TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

/**
 * Get or create CSRF token from cookies
 * Call this in server components or API routes to get the current token
 */
export async function getCSRFToken(): Promise<string> {
  const cookieStore = await cookies();
  let token = cookieStore.get(CSRF_TOKEN_NAME)?.value;

  if (!token) {
    token = generateToken();
    // Token will be set via setCSRFCookie in the response
  }

  return token;
}

/**
 * Create CSRF cookie header value
 */
export function createCSRFCookie(token: string): string {
  // HttpOnly is NOT set so client-side JS can read it for forms
  // SameSite=Strict provides additional protection
  return `${CSRF_TOKEN_NAME}=${token}; Path=/; SameSite=Strict; Secure`;
}

/**
 * Validate CSRF token from request
 * Returns true if valid, false otherwise
 */
export async function validateCSRFToken(request: Request): Promise<boolean> {
  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  // Get token from cookie
  const cookieHeader = request.headers.get("cookie");
  const cookieToken = cookieHeader
    ?.split(";")
    .find((c) => c.trim().startsWith(`${CSRF_TOKEN_NAME}=`))
    ?.split("=")[1]
    ?.trim();

  // Both must exist and match
  if (!headerToken || !cookieToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(headerToken, cookieToken);
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * CSRF validation middleware for API routes
 * Returns error Response if invalid, null if valid
 */
export async function csrfProtection(
  request: Request,
): Promise<Response | null> {
  // Skip CSRF for GET, HEAD, OPTIONS (safe methods)
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return null;
  }

  // Skip CSRF for requests with Bearer token (API auth)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return null;
  }

  // Validate CSRF token
  const isValid = await validateCSRFToken(request);

  if (!isValid) {
    return new Response(
      JSON.stringify({
        error: "CSRF Validation Failed",
        message: "Invalid or missing CSRF token",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return null;
}

/**
 * Generate CSRF token for client-side use
 * Returns both the token and the cookie to set
 */
export function generateCSRFForClient(): { token: string; cookie: string } {
  const token = generateToken();
  return {
    token,
    cookie: createCSRFCookie(token),
  };
}
