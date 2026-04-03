"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { Plus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-shell";

interface DashboardHeaderProps {
  userName: string;
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) {
      setGreeting("Good morning");
    } else if (h < 18) {
      setGreeting("Good afternoon");
    } else {
      setGreeting("Good evening");
    }
  }, []);

  return (
    <PageHeader
      title={
        <>
          {greeting}, {userName}! 👋
        </>
      }
      description="Here's an overview of your campaign activity."
      actions={
        <>
          <Button variant="outline" asChild>
            <Link href="/contacts" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Contacts</span>
            </Link>
          </Button>
          <Button asChild>
            <Link href="/compose" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Campaign</span>
            </Link>
          </Button>
        </>
      }
    />
  );
}
