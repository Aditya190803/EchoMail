"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { useSession } from "next-auth/react";

import { GlobalBackButton } from "@/components/global-back-button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (
      status === "unauthenticated" ||
      (status === "authenticated" && session?.error)
    ) {
      if (typeof window !== "undefined") {
        router.push(
          `/auth/signin?callbackUrl=${encodeURIComponent(window.location.pathname)}`,
        );
      } else {
        router.push("/auth/signin");
      }
    }
  }, [status, session?.error, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background max-w-[100vw]">
      <GlobalBackButton />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
