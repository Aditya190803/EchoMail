import { type NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { databases, config, Query } from "@/lib/appwrite-server";
import { authOptions } from "@/lib/auth";
import { apiLogger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * List tracking events for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaign_id");
    const eventType = searchParams.get("event_type");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    const queries = [
      Query.equal("user_email", session.user.email),
      Query.orderDesc("created_at"),
      Query.limit(limit),
      Query.offset(offset),
    ];

    if (campaignId) {
      queries.push(Query.equal("campaign_id", campaignId));
    }

    if (eventType) {
      queries.push(Query.equal("event_type", eventType));
    }

    const response = await databases.listDocuments(
      config.databaseId,
      config.trackingEventsCollectionId,
      queries,
    );

    return NextResponse.json(response);
  } catch (error) {
    apiLogger.error(
      "Error fetching tracking events",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch tracking events" },
      { status: 500 },
    );
  }
}
