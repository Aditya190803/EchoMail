/**
 * Analytics Service
 * Handles fetching tracking events and aggregating analytics data
 */

import { apiRequest } from "@/lib/appwrite";
import type { TrackingEvent } from "@/types/analytics";

export const analyticsService = {
  /**
   * List tracking events for a user
   */
  async listEvents(options?: {
    campaignId?: string;
    eventType?: "open" | "click";
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; documents: TrackingEvent[] }> {
    const params = new URLSearchParams();
    if (options?.campaignId) {
      params.append("campaign_id", options.campaignId);
    }
    if (options?.eventType) {
      params.append("event_type", options.eventType);
    }
    if (options?.limit) {
      params.append("limit", options.limit.toString());
    }
    if (options?.offset) {
      params.append("offset", options.offset.toString());
    }

    return apiRequest(`/api/analytics/events?${params}`);
  },

  /**
   * Get aggregated stats for a campaign
   */
  async getCampaignStats(campaignId: string): Promise<{
    opens: number;
    uniqueOpens: number;
    clicks: number;
    uniqueClicks: number;
  }> {
    return apiRequest(
      `/api/analytics/campaign-stats?campaign_id=${campaignId}`,
    );
  },

  /**
   * Get overall stats for a user
   */
  async getUserStats(): Promise<{
    totalOpens: number;
    totalClicks: number;
    averageOpenRate: number;
    averageClickRate: number;
  }> {
    return apiRequest("/api/analytics/user-stats");
  },
};
