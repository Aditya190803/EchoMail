"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { QueryProvider } from "@/lib/query-client";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <QueryProvider>
        <SessionProvider
          refetchInterval={5 * 60} // Refetch session every 5 minutes
          refetchOnWindowFocus={true} // Refetch when window gains focus
        >
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              className:
                "border border-border bg-card text-card-foreground shadow-lg",
              duration: 4000,
            }}
            richColors
            closeButton
          />
        </SessionProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
