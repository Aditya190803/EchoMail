/**
 * Type definitions for authentication and JWT tokens
 */

import type { User } from "next-auth";

/**
 * JWT Token structure used in NextAuth callbacks
 */
export interface JWTToken {
  accessToken?: string;
  accessTokenExpires?: number;
  refreshToken?: string;
  user?: User;
  error?: "RefreshAccessTokenError" | string;
}

/**
 * Refreshed token response from Google OAuth
 */
export interface RefreshedTokens {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
}

/**
 * Token refresh result - same as JWTToken
 */
export type TokenRefreshResult = JWTToken;

/**
 * Token status check result
 */
export interface TokenStatus {
  valid: boolean;
  minutesRemaining: number;
  requiresReauth?: boolean;
  isExpiringSoon?: boolean;
}

/**
 * Extended session with custom properties
 */
export interface ExtendedSession {
  accessToken?: string;
  error?: string;
  user?: User;
}
