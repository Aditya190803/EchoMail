"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

export function GlobalBackButton() {
  const pathname = usePathname();

  if (pathname === "/dashboard" || pathname?.startsWith("/dashboard/")) {
    return null;
  }

  return (
    <div className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="flex h-14 items-center px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-1 -ml-3 text-muted-foreground hover:text-foreground"
        >
          <Link href="/dashboard">
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
