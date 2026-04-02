"use client";

import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import type { EmailCampaign } from "@/lib/appwrite";

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return ""; }
}

interface Props { campaigns: EmailCampaign[] }

export function ActivityChart({ campaigns }: Props) {
  // Aggregate by day (last 14 days)
  const sorted = [...campaigns].sort(
    (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  );

  const map: Record<string, { sent: number; failed: number }> = {};
  sorted.slice(-30).forEach((c) => {
    const day = formatDate(c.created_at || "");
    if (!map[day]) map[day] = { sent: 0, failed: 0 };
    map[day].sent += c.sent || 0;
    map[day].failed += c.failed || 0;
  });

  const data = Object.entries(map).map(([name, vals]) => ({ name, ...vals }));

  if (data.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 flex flex-col items-center justify-center h-60 text-muted-foreground text-sm">
        <TrendingUp className="h-8 w-8 mb-2 opacity-30" />
        No campaign data yet
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold">Campaign Activity</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Emails sent over time</p>
        </div>
        <Button variant="outline" size="sm" asChild className="gap-1.5">
          <Link href="/insights">
            Full analytics <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.15} />
              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              fontSize: 12,
              color: "var(--color-foreground)",
            }}
            cursor={{ stroke: "var(--color-border)" }}
          />
          <Area type="monotone" dataKey="sent" stroke="var(--color-primary)" strokeWidth={2} fill="url(#sentGrad)" name="Sent" />
          <Area type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={1.5} fill="url(#failGrad)" name="Failed" />
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary inline-block" />
          Sent
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-400 inline-block" />
          Failed
        </span>
      </div>
    </div>
  );
}
