"use client";

import { Mail, Send, XCircle, Users, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { StatCard } from "@/components/ui/page-shell";
import type { EmailCampaign } from "@/lib/appwrite";

/* ── tiny inline sparkline (no extra dep) ───────────────── */
function Sparkline({ values, colour = "var(--color-primary)" }: { values: number[]; colour?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const w = 80, h = 28, pad = 2;
  const step = (w - pad * 2) / (values.length - 1);
  const points = values
    .map((v, i) => `${pad + i * step},${h - pad - ((v / max) * (h - pad * 2))}`)
    .join(" ");

  return (
    <svg width={w} height={h} className="overflow-visible opacity-70">
      <polyline
        points={points}
        fill="none"
        stroke={colour}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getRecipientsCount(c: EmailCampaign): number {
  const r = c.recipients as string[] | string | undefined;
  if (Array.isArray(r)) return r.length;
  if (typeof r === "string" && r) return r.split(",").length;
  return 0;
}

function buildSparkline(campaigns: EmailCampaign[], accessor: (c: EmailCampaign) => number): number[] {
  const sorted = [...campaigns].sort(
    (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  );
  return sorted.slice(-8).map(accessor);
}

interface Props { campaigns: EmailCampaign[] }

export function AnalyticsMetrics({ campaigns }: Props) {
  const totalSent       = campaigns.reduce((s, c) => s + (c.sent || 0), 0);
  const totalFailed     = campaigns.reduce((s, c) => s + (c.failed || 0), 0);
  const totalCampaigns  = campaigns.length;
  const totalRecipients = campaigns.reduce((s, c) => s + getRecipientsCount(c), 0);
  const successRate     = totalRecipients ? (totalSent / totalRecipients) * 100 : 0;

  // Week-over-week trend (last 7 days vs 7 before that)
  const now = Date.now();
  const ONE_WEEK = 7 * 24 * 3600 * 1000;
  const thisWeek = campaigns.filter(c => now - new Date(c.created_at || 0).getTime() < ONE_WEEK);
  const lastWeek = campaigns.filter(c => {
    const age = now - new Date(c.created_at || 0).getTime();
    return age >= ONE_WEEK && age < 2 * ONE_WEEK;
  });

  const thisSent = thisWeek.reduce((s, c) => s + (c.sent || 0), 0);
  const lastSent = lastWeek.reduce((s, c) => s + (c.sent || 0), 0);
  const sentDelta = lastSent === 0 ? null : ((thisSent - lastSent) / lastSent) * 100;

  const trend = (delta: number | null, inverse = false) => {
    if (delta === null) return undefined;
    const dir: "up" | "down" | "same" = Math.abs(delta) < 1 ? "same" : (delta > 0 ? "up" : "down");
    const effectiveDir = inverse ? (dir === "up" ? "down" : dir === "down" ? "up" : "same") : dir;
    return { direction: effectiveDir as "up" | "down" | "same", label: `${Math.abs(delta).toFixed(1)}% vs last week` };
  };

  const sentSparkline    = buildSparkline(campaigns, c => c.sent || 0);
  const failedSparkline  = buildSparkline(campaigns, c => c.failed || 0);
  const campSparkline    = buildSparkline(campaigns, () => 1).map((_, i, a) => i + 1);

  const metrics = [
    {
      label: "Emails Delivered",
      value: totalSent.toLocaleString(),
      sub: `${successRate.toFixed(1)}% success rate`,
      icon: <Send className="h-4 w-4 text-blue-500" />,
      accent: "border-blue-500",
      trend: trend(sentDelta),
      spark: <Sparkline values={sentSparkline} colour="#3b82f6" />,
    },
    {
      label: "Failed Deliveries",
      value: totalFailed.toLocaleString(),
      sub: totalRecipients ? `${((totalFailed / totalRecipients) * 100).toFixed(1)}% failure rate` : "0% failure rate",
      icon: <XCircle className="h-4 w-4 text-red-500" />,
      accent: "border-red-400",
      trend: trend(totalFailed > 0 ? 5 : -5, true), // indicative
      spark: <Sparkline values={failedSparkline} colour="#ef4444" />,
    },
    {
      label: "Total Campaigns",
      value: totalCampaigns.toLocaleString(),
      sub: `${thisWeek.length} this week`,
      icon: <Mail className="h-4 w-4 text-violet-500" />,
      accent: "border-violet-500",
      trend: trend(lastWeek.length === 0 ? null : ((thisWeek.length - lastWeek.length) / Math.max(lastWeek.length, 1)) * 100),
      spark: <Sparkline values={campSparkline} colour="#8b5cf6" />,
    },
    {
      label: "Audience Reached",
      value: totalRecipients.toLocaleString(),
      sub: `Avg ${totalCampaigns ? Math.round(totalRecipients / totalCampaigns) : 0} per campaign`,
      icon: <Users className="h-4 w-4 text-emerald-500" />,
      accent: "border-emerald-500",
      spark: <Sparkline values={buildSparkline(campaigns, getRecipientsCount)} colour="#10b981" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {metrics.map((m, i) => (
        <StatCard
          key={i}
          label={m.label}
          value={m.value}
          sub={m.sub}
          icon={m.icon}
          trend={m.trend}
          accentClass={m.accent}
        >
          {m.spark}
        </StatCard>
      ))}
    </div>
  );
}
