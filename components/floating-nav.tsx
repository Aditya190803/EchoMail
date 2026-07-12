"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Mail, LayoutDashboard } from "lucide-react";
import { useSession } from "next-auth/react";

import { AuthButton } from "./auth-button";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";

export function FloatingNav() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
      <nav className="flex items-center gap-1 sm:gap-2 px-3 py-2 rounded-full border bg-background/80 backdrop-blur-md shadow-sm">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-muted/50 transition-colors"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
            <Mail className="h-3 w-3 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold hidden sm:inline-block">
            Flier
          </span>
        </Link>

        <div className="w-px h-4 bg-border mx-1" />

        <div className="flex items-center gap-1 sm:gap-2">
          {[
            { name: "Home", href: "/" },
            { name: "Privacy", href: "/privacy" },
            { name: "Terms", href: "/tos" },
          ].map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors hover:text-foreground/80 ${
                pathname === link.href
                  ? "bg-secondary text-secondary-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="w-px h-4 bg-border mx-1" />

        <div className="flex items-center gap-2 pl-1">
          <ThemeToggle />

          {status === "authenticated" && session ? (
            <Button
              size="sm"
              className="rounded-full rounded-l-md px-4"
              asChild
            >
              <Link href="/dashboard" className="flex items-center gap-2">
                <span className="hidden sm:inline-block">Dashboard</span>
                <span className="sm:hidden">App</span>
                <LayoutDashboard className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <div className="[&>button]:rounded-full [&>button]:rounded-l-md [&>button]:px-4">
              <AuthButton />
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
