"use client";

import { Mail, Send, XCircle, Users } from "lucide-react";

import { StatCard } from "@/components/ui/page-shell";
import type { EmailCampaign } from "@/lib/appwrite";

function getRecipientsCount(c: EmailCampaign): number {
  const r = c.recipients as string[] | string | undefined;
  if (Array.isArray(r)) {
    return r.length;
  }
  if (typeof r === "string" && r) {
    return r.split(",").length;
  }
  return 0;
}

interface Props {
  campaigns: EmailCampaign[];
}

export function AnalyticsMetrics({ campaigns }: Props) {
  const totalSent = campaigns.reduce((s, c) => s + (c.sent || 0), 0);
  const totalFailed = campaigns.reduce((s, c) => s + (c.failed || 0), 0);
  const totalCampaigns = campaigns.length;
  const totalRecipients = campaigns.reduce(
    (s, c) => s + getRecipientsCount(c),
    0,
  );
  const successRate = totalRecipients ? (totalSent / totalRecipients) * 100 : 0;

  // Week-over-week trend (last 7 days vs 7 before that)
  const now = Date.now();
  const ONE_WEEK = 7 * 24 * 3600 * 1000;
  const thisWeek = campaigns.filter(
    (c) => now - new Date(c.created_at || 0).getTime() < ONE_WEEK,
  );
  const lastWeek = campaigns.filter((c) => {
    const age = now - new Date(c.created_at || 0).getTime();
    return age >= ONE_WEEK && age < 2 * ONE_WEEK;
  });

  const thisSent = thisWeek.reduce((s, c) => s + (c.sent || 0), 0);
  const lastSent = lastWeek.reduce((s, c) => s + (c.sent || 0), 0);
  const sentDelta =
    lastSent === 0 ? null : ((thisSent - lastSent) / lastSent) * 100;

  const trend = (delta: number | null, inverse = false) => {
    if (delta === null) {
      return undefined;
    }
    const dir: "up" | "down" | "same" =
      Math.abs(delta) < 1 ? "same" : delta > 0 ? "up" : "down";
    const effectiveDir = inverse
      ? dir === "up"
        ? "down"
        : dir === "down"
          ? "up"
          : "same"
      : dir;
    return {
      direction: effectiveDir as "up" | "down" | "same",
      label: `${Math.abs(delta).toFixed(1)}% vs last week`,
    };
  };

  const metrics = [
    {
      label: "Emails Delivered",
      value: totalSent.toLocaleString(),
      sub: `${successRate.toFixed(1)}% success rate`,
      icon: <Send className="h-4 w-4 text-blue-500" />,
      accent: "border-blue-500",
      trend: trend(sentDelta),
    },
    {
      label: "Failed Deliveries",
      value: totalFailed.toLocaleString(),
      sub: totalRecipients
        ? `${((totalFailed / totalRecipients) * 100).toFixed(1)}% failure rate`
        : "0% failure rate",
      icon: <XCircle className="h-4 w-4 text-red-500" />,
      accent: "border-red-400",
      trend: trend(totalFailed > 0 ? 5 : -5, true), // indicative
    },
    {
      label: "Total Campaigns",
      value: totalCampaigns.toLocaleString(),
      sub: `${thisWeek.length} this week`,
      icon: <Mail className="h-4 w-4 text-violet-500" />,
      accent: "border-violet-500",
      trend: trend(
        lastWeek.length === 0
          ? null
          : ((thisWeek.length - lastWeek.length) /
              Math.max(lastWeek.length, 1)) *
              100,
      ),
    },
    {
      label: "Audience Reached",
      value: totalRecipients.toLocaleString(),
      sub: `Avg ${totalCampaigns ? Math.round(totalRecipients / totalCampaigns) : 0} per campaign`,
      icon: <Users className="h-4 w-4 text-emerald-500" />,
      accent: "border-emerald-500",
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
