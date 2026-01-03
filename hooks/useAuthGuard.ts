"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { useSession, signOut } from "next-auth/react";

interface UseAuthGuardOptions {
  redirectTo?: string;
  autoSignOut?: boolean;
}

/**
 * Hook to guard authenticated routes and handle session errors.
 *
 * This hook checks if the user is authenticated and if their session is valid.
 * If the session has an error (e.g., token refresh failed), it can either
 * redirect the user or automatically sign them out.
 *
 * @param options.redirectTo - URL to redirect to when unauthenticated (default: "/")
 * @param options.autoSignOut - Whether to auto sign out on session error (default: true)
 *
 * @returns Object with session data, authentication status, and router
 */
export function useAuthGuard(options: UseAuthGuardOptions = {}) {
  const { redirectTo = "/", autoSignOut = true } = options;
  const { data: session, status } = useSession();
  const router = useRouter();

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated" && !session?.error;
  const hasSessionError = session?.error === "RefreshAccessTokenError";

  useEffect(() => {
    // Handle unauthenticated users
    if (status === "unauthenticated") {
      router.push(redirectTo);
      return;
    }

    // Handle session errors (e.g., token refresh failed)
    if (status === "authenticated" && session?.error) {
      if (autoSignOut) {
        // Auto sign out to clear the invalid session
        signOut({ callbackUrl: redirectTo });
      } else {
        // Just redirect without signing out
        router.push(redirectTo);
      }
    }
  }, [status, session?.error, router, redirectTo, autoSignOut]);

  return {
    session,
    status,
    isLoading,
    isAuthenticated,
    hasSessionError,
    user: session?.user,
    accessToken: session?.accessToken,
    router, // Also export router for navigation needs
  };
}
