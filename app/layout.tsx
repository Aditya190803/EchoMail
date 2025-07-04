import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Providers } from "./providers"
import { Footer } from "@/components/footer"
import { ErrorBoundary } from "@/components/error-boundary"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "EchoMail - Gmail API Integration",
  description:
    "Send personalized emails with ease using Gmail API. Upload CSV data, compose rich text emails, and send bulk personalized messages with EchoMail.",
  generator: "v0.dev",
  keywords: ["email", "gmail", "bulk email", "personalization", "csv", "marketing", "echomail"],
  authors: [{ name: "EchoMail" }],
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
}

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1.0,
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.ico" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
        <Footer />
      </body>
    </html>
  )
}
