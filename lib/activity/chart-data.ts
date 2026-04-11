import { formatDate } from "@/lib/utils";
import type { CampaignAnalytics } from "@/types/activity";

export function buildCampaignChartData(campaigns: CampaignAnalytics[]) {
  if (!campaigns.length) {
    return [];
  }

  const sorted = [...campaigns].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const aggregated = sorted.reduce((acc: Record<string, number>, campaign) => {
    const date = formatDate(campaign.createdAt);
    acc[date] = (acc[date] || 0) + campaign.sent;
    return acc;
  }, {});

  return Object.entries(aggregated)
    .map(([name, value]) => ({
      name,
      value,
      date: new Date(name),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(({ name, value }) => ({ name, value }))
    .slice(-10);
}
