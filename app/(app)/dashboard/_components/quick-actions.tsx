"use client";

import Link from "next/link";
import { PenSquare, Users, LayoutTemplate, BarChart3 } from "lucide-react";

const actions = [
  {
    href: "/compose",
    icon: PenSquare,
    label: "New Campaign",
    description: "Write and send a personalised campaign",
    colour: "bg-blue-500/10 text-blue-500",
    border: "hover:border-blue-500/40",
  },
  {
    href: "/contacts",
    icon: Users,
    label: "Contacts",
    description: "Manage your recipient lists",
    colour: "bg-violet-500/10 text-violet-500",
    border: "hover:border-violet-500/40",
  },
  {
    href: "/templates",
    icon: LayoutTemplate,
    label: "Templates",
    description: "Browse and reuse saved templates",
    colour: "bg-emerald-500/10 text-emerald-500",
    border: "hover:border-emerald-500/40",
  },
  {
    href: "/insights",
    icon: BarChart3,
    label: "Analytics",
    description: "View full campaign performance",
    colour: "bg-orange-500/10 text-orange-500",
    border: "hover:border-orange-500/40",
  },
];

export function QuickActions() {
  return (
    <div className="rounded-xl border bg-card p-6 h-full">
      <div className="mb-4">
        <h2 className="text-base font-semibold">Quick Actions</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Jump to frequently used sections</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className={`group flex flex-col gap-2.5 p-3.5 rounded-lg border bg-muted/20 transition-all duration-200 hover:bg-muted/40 hover:shadow-sm ${a.border}`}
            >
              <div className={`inline-flex p-2 rounded-lg w-fit ${a.colour}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium leading-tight">{a.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{a.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
