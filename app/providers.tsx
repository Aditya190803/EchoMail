"use client"

import { SessionProvider } from "next-auth/react"
import type { ReactNode } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
        {children}
        <Toaster 
          position="top-right"
          toastOptions={{
            className: 'border border-border bg-card text-card-foreground shadow-lg',
            duration: 4000,
          }}
          richColors
          closeButton
        />
      </SessionProvider>
    </ThemeProvider>
  )
}
