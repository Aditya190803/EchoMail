"use client";

import { Footer } from "@/components/footer";
import { PublicHeader } from "@/components/public-header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background flex flex-col">
      <PublicHeader />
      {/* pt-16 accounts for the fixed header height */}
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
    </div>
  );
}
