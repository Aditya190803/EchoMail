import { type NextRequest, NextResponse } from "next/server";

import { databases, config, Query } from "@/lib/appwrite-server";
import { env } from "@/lib/env";
import { apiLogger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Cron job for aggregating metrics and archiving old events
 * Should be called periodically (e.g. daily)
 */
export async function POST(request: NextRequest) {
  // Verify secret if configured
  const authHeader = request.headers.get("authorization");
  if (env.CRON_SECRET && authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Aggregate metrics for recent campaigns
    // We only process completed campaigns to update their final rates
    const campaigns = await databases.listDocuments(
      config.databaseId,
      config.campaignsCollectionId,
      [
        Query.equal("status", "completed"),
        Query.limit(50),
        Query.orderDesc("created_at"),
      ],
    );

    let aggregatedCount = 0;
    for (const campaign of campaigns.documents) {
      // Fetch events for this campaign
      const eventsResponse = await databases.listDocuments(
        config.databaseId,
        config.trackingEventsCollectionId,
        [Query.equal("campaign_id", campaign.$id), Query.limit(5000)],
      );

      const events = eventsResponse.documents;
      const opens = events.filter((e) => e.event_type === "open");
      const clicks = events.filter((e) => e.event_type === "click");

      const uniqueOpens = new Set(opens.map((e) => e.email)).size;
      const uniqueClicks = new Set(clicks.map((e) => e.email)).size;

      const sentCount = (campaign.sent_count as number) || 0;

      // Update campaign document with aggregated rates
      await databases.updateDocument(
        config.databaseId,
        config.campaignsCollectionId,
        campaign.$id,
        {
          open_rate: sentCount > 0 ? (uniqueOpens / sentCount) * 100 : 0,
          click_rate: sentCount > 0 ? (uniqueClicks / sentCount) * 100 : 0,
        },
      );
      aggregatedCount++;
    }

    // 2. Archive/Delete old events (older than 90 days)
    // This keeps the tracking_events collection performant
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const oldEvents = await databases.listDocuments(
      config.databaseId,
      config.trackingEventsCollectionId,
      [
        Query.lessThan("created_at", ninetyDaysAgo.toISOString()),
        Query.limit(100),
      ],
    );

    let archivedCount = 0;
    for (const event of oldEvents.documents) {
      await databases.deleteDocument(
        config.databaseId,
        config.trackingEventsCollectionId,
        event.$id,
      );
      archivedCount++;
    }

    return NextResponse.json({
      success: true,
      aggregatedCount,
      archivedCount,
      message: `Aggregated ${aggregatedCount} campaigns and archived ${archivedCount} old events.`,
    });
  } catch (error) {
    apiLogger.error("Cron job failed", error as Error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}

/**
 * GET request for manual triggering (if needed, but should be POST for security)
 */
export async function GET(request: NextRequest) {
  return POST(request);
}
