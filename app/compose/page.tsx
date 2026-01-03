"use client";

import { useEffect } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useSession } from "next-auth/react";

import { ComposeForm } from "@/components/compose-form";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsClient } from "@/hooks/useIsClient";

export default function ComposePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isClient = useIsClient();

  useEffect(() => {
    // Redirect if unauthenticated OR if there's a session error (token refresh failed)
    if (
      isClient &&
      (status === "unauthenticated" ||
        (status === "authenticated" && session?.error))
    ) {
      router.push("/");
    }
  }, [status, session?.error, router, isClient]);

  if (!isClient || status === "loading") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 mx-auto max-w-4xl w-full py-6 px-4 sm:px-6 lg:px-8">
          {/* Draft Status Bar Skeleton */}
          <Skeleton className="h-12 w-full rounded-lg mb-6" />

          {/* Tabs Skeleton */}
          <Skeleton className="h-10 w-full max-w-sm rounded-lg mb-6" />

          {/* Compose Form Skeleton */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Subject Field Skeleton */}
              <div>
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>

              {/* Editor Skeleton */}
              <div>
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-48 w-full" />
              </div>

              {/* Attachments Skeleton */}
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-20 w-full" />
              </div>
            </CardContent>
          </Card>

          {/* Send Button Skeleton */}
          <div className="mt-6">
            <Skeleton className="h-12 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <p className="text-destructive mb-4">
                Please sign in to access the email composer
              </p>
              <Button asChild>
                <Link href="/">Return to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-4xl w-full py-6 px-4 sm:px-6 lg:px-8 pb-32">
        <ComposeForm />
      </main>
    </div>
  );
}
