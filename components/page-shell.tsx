import React from "react";

import { cn } from "@/lib/utils";

export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn("w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8", className)}
    >
      {children}
    </main>
  );
}
