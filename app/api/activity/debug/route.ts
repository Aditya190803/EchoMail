import { type NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { databases, config, Query } from "@/lib/appwrite-server";
import { authOptions } from "@/lib/auth";
import { apiLogger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Debug endpoint to check tracking configuration and recent events
 * Only accessible by authenticated users for their own data
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaign_id");

    // Check configuration
    const configInfo = {
      databaseId: config.databaseId,
      trackingEventsCollectionId: config.trackingEventsCollectionId,
      campaignsCollectionId: config.campaignsCollectionId,
      hasDatabase: !!config.databaseId,
      hasTrackingCollection: !!config.trackingEventsCollectionId,
    };

    // Try to list recent tracking events
    let recentEvents: any[] = [];
    let totalEvents = 0;
    let eventError: string | null = null;

    try {
      const queries = [
        Query.equal("user_email", session.user.email),
        Query.orderDesc("created_at"),
        Query.limit(20),
      ];

      if (campaignId) {
        queries.push(Query.equal("campaign_id", campaignId));
      }

      const response = await databases.listDocuments(
        config.databaseId,
        config.trackingEventsCollectionId,
        queries,
      );

      recentEvents = response.documents.map((doc: any) => ({
        id: doc.$id,
        campaign_id: doc.campaign_id,
        event_type: doc.event_type,
        email: doc.email,
        link_url: doc.link_url,
        created_at: doc.created_at,
      }));
      totalEvents = response.total;
    } catch (error) {
      eventError =
        error instanceof Error ? error.message : "Failed to fetch events";
      apiLogger.error("Debug: Error fetching events", error as Error, {
        collectionId: config.trackingEventsCollectionId,
      });
    }

    // Try to list recent campaigns
    let recentCampaigns: any[] = [];
    let campaignError: string | null = null;

    try {
      const campaignResponse = await databases.listDocuments(
        config.databaseId,
        config.campaignsCollectionId,
        [
          Query.equal("user_email", session.user.email),
          Query.orderDesc("created_at"),
          Query.limit(5),
        ],
      );

      recentCampaigns = campaignResponse.documents.map((doc: any) => ({
        id: doc.$id,
        subject: doc.subject,
        sent: doc.sent,
        created_at: doc.created_at,
      }));
    } catch (error) {
      campaignError =
        error instanceof Error ? error.message : "Failed to fetch campaigns";
    }

    // Get event counts by type for user
    const eventCounts = { opens: 0, clicks: 0, sent: 0, failed: 0 };
    try {
      const allEventsResponse = await databases.listDocuments(
        config.databaseId,
        config.trackingEventsCollectionId,
        [Query.equal("user_email", session.user.email), Query.limit(5000)],
      );

      for (const doc of allEventsResponse.documents) {
        const eventType = (doc as any).event_type;
        if (eventType === "open") {
          eventCounts.opens++;
        } else if (eventType === "click") {
          eventCounts.clicks++;
        } else if (eventType === "sent") {
          eventCounts.sent++;
        } else if (eventType === "failed") {
          eventCounts.failed++;
        }
      }
    } catch (_error) {
      // Ignore count errors
    }

    return NextResponse.json({
      status: "ok",
      userEmail: session.user.email,
      config: configInfo,
      eventCounts,
      totalEvents,
      recentEvents,
      recentCampaigns,
      errors: {
        events: eventError,
        campaigns: campaignError,
      },
      appUrl: process.env.NEXT_PUBLIC_APP_URL || "not set",
    });
  } catch (error) {
    apiLogger.error(
      "Debug endpoint error",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error: "Debug endpoint failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
