import type React from "react";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import { ErrorBoundary } from "@/components/error-boundary";

// System font stack - no external network dependency
const fontClassName = "font-sans";
const fontVariable = "";

export const metadata: Metadata = {
  title: "EchoMail - Professional Email Campaigns",
  description:
    "Send personalized emails with ease using Gmail API. Upload CSV data, compose rich text emails, and send bulk personalized messages with EchoMail.",
  generator: "Next.js",
  keywords: [
    "email",
    "gmail",
    "bulk email",
    "personalization",
    "csv",
    "marketing",
    "echomail",
    "email campaigns",
  ],
  authors: [{ name: "EchoMail" }],
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.ico" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
      </head>
      <body
        className={`${fontClassName} min-h-screen flex flex-col antialiased`}
        suppressHydrationWarning
      >
        <ErrorBoundary>
          <Providers>
            <main className="flex-1">{children}</main>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
