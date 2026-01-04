import GoogleProvider from "next-auth/providers/google";

import { authLogger } from "./logger";
import { validateToken, trackRefreshTokenUsage } from "./token-security";

import type { NextAuthOptions, User } from "next-auth";
import type { JWT } from "next-auth/jwt";

/** Response from Google OAuth token refresh endpoint */
interface RefreshedTokens {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
}

/**
 * Takes a token, and returns a new token with updated
 * `accessToken` and `accessTokenExpires`. If an error occurs,
 * returns the old token and an error property.
 *
 * Implements refresh token rotation detection to prevent token theft.
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const refreshToken = token.refreshToken as string | undefined;
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    // Check for refresh token reuse (potential token theft)
    // trackRefreshTokenUsage returns true if token was already used
    const wasReused = trackRefreshTokenUsage(refreshToken);
    if (wasReused) {
      authLogger.warn("Refresh token reuse detected - potential token theft", {
        userId: (token.user as User)?.email,
      });
      // Return error to force re-authentication
      return {
        ...token,
        error: "RefreshAccessTokenError",
      };
    }

    const url =
      "https://oauth2.googleapis.com/token?" +
      new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      });

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    const refreshedTokens: RefreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    const newRefreshToken = refreshedTokens.refresh_token ?? refreshToken;

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    authLogger.error(
      "Failed to refresh access token",
      undefined,
      error instanceof Error ? error : undefined,
    );

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/contacts.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        const expiresIn: number =
          typeof account.expires_in === "string"
            ? parseInt(account.expires_in, 10)
            : ((account.expires_in as number) ?? 3600);

        const now: number = Date.now();
        const expiresAt: number = now + expiresIn * 1000;

        return {
          accessToken: account.access_token,
          accessTokenExpires: expiresAt,
          refreshToken: account.refresh_token,
          user,
        };
      }

      // Use TokenSecurity to validate the token
      const validation = validateToken({
        accessToken: token.accessToken as string,
        accessTokenExpires: token.accessTokenExpires as number,
        refreshToken: token.refreshToken as string,
      });

      // Return previous token if it's still valid and doesn't need refresh
      if (!validation.needsRefresh) {
        return token;
      }

      // Access token has expired or is about to expire, try to update it
      authLogger.info("Token needs refresh", {
        reason: validation.error || "Expiring soon",
        expiresIn: validation.expiresIn,
      });

      return refreshAccessToken(token as JWT);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.error = token.error as string;
      session.user = token.user as User;
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false, // Disable debug to prevent verbose logging
};
