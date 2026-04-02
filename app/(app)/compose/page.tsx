"use client";

import { useEffect } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useSession } from "next-auth/react";

import { ComposeForm } from "@/components/compose-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell, PageHeader } from "@/components/ui/page-shell";
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
      <PageShell>
        <PageHeader title="New Campaign" description="Write and send a personalised campaign" />
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          <div className="w-full md:w-64 shrink-0">
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
          <div className="flex-1 min-w-0 space-y-6">
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        </div>
      </PageShell>
    );
  }

  if (status === "unauthenticated") {
    return (
      <PageShell>
         <div className="flex items-center justify-center p-4">
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
      </PageShell>
    );
  }

  return (
    <PageShell className="!max-w-6xl">
      <PageHeader 
        title="Compose Campaign" 
        description="Set your recipients, write your copy, and send." 
      />
      <ComposeForm />
    </PageShell>
  );
}
