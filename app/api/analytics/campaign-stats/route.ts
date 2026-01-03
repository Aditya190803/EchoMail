import { type NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { databases, config, Query } from "@/lib/appwrite-server";
import { authOptions } from "@/lib/auth";
import { apiLogger } from "@/lib/logger";

/**
 * Get aggregated stats for a specific campaign
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaign_id");

    if (!campaignId) {
      return NextResponse.json(
        { error: "Campaign ID is required" },
        { status: 400 },
      );
    }

    // Verify campaign belongs to user
    const campaign = await databases.getDocument(
      config.databaseId,
      config.campaignsCollectionId,
      campaignId,
    );

    if ((campaign as any).user_email !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch all events for this campaign (up to 5000 for aggregation)
    const response = await databases.listDocuments(
      config.databaseId,
      config.trackingEventsCollectionId,
      [Query.equal("campaign_id", campaignId), Query.limit(5000)],
    );

    const events = response.documents as any[];

    const opens = events.filter((e) => e.event_type === "open");
    const clicks = events.filter((e) => e.event_type === "click");

    const uniqueOpens = new Set(opens.map((e) => e.email)).size;
    const uniqueClicks = new Set(clicks.map((e) => e.email)).size;

    return NextResponse.json({
      opens: opens.length,
      uniqueOpens,
      clicks: clicks.length,
      uniqueClicks,
    });
  } catch (error) {
    apiLogger.error(
      "Error fetching campaign stats",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch campaign stats" },
      { status: 500 },
    );
  }
}
