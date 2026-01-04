import { type NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { databases, config, ID, Query } from "@/lib/appwrite-server";
import { authOptions } from "@/lib/auth";
import { apiLogger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Test endpoint to manually create a tracking event
 * This helps verify the database connection and collection permissions
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { campaignId, eventType = "open" } = body;

    if (!campaignId) {
      return NextResponse.json(
        { error: "campaignId is required" },
        { status: 400 },
      );
    }

    apiLogger.info("Creating test tracking event", {
      campaignId,
      eventType,
      userEmail: session.user.email,
      collectionId: config.trackingEventsCollectionId,
      databaseId: config.databaseId,
    });

    // Try to create a test tracking event
    const doc = await databases.createDocument(
      config.databaseId,
      config.trackingEventsCollectionId,
      ID.unique(),
      {
        campaign_id: campaignId,
        recipient_id: "test-recipient-id",
        email: "test@example.com",
        event_type: eventType,
        user_agent: "Test Agent",
        ip_address: "127.0.0.1",
        user_email: session.user.email,
        created_at: new Date().toISOString(),
      },
    );

    apiLogger.info("Test tracking event created successfully", {
      docId: doc.$id,
    });

    // Verify we can read it back
    const readBack = await databases.getDocument(
      config.databaseId,
      config.trackingEventsCollectionId,
      doc.$id,
    );

    // Count total events for this user
    const countResponse = await databases.listDocuments(
      config.databaseId,
      config.trackingEventsCollectionId,
      [Query.equal("user_email", session.user.email), Query.limit(1)],
    );

    return NextResponse.json({
      success: true,
      message: "Test tracking event created and verified",
      createdDoc: {
        id: doc.$id,
        campaign_id: (readBack as any).campaign_id,
        event_type: (readBack as any).event_type,
        created_at: (readBack as any).created_at,
      },
      totalUserEvents: countResponse.total,
      config: {
        databaseId: config.databaseId,
        collectionId: config.trackingEventsCollectionId,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
      },
    });
  } catch (error) {
    apiLogger.error(
      "Test tracking failed",
      error instanceof Error ? error : undefined,
      {
        message: error instanceof Error ? error.message : String(error),
        collectionId: config.trackingEventsCollectionId,
        databaseId: config.databaseId,
      },
    );

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        config: {
          databaseId: config.databaseId,
          collectionId: config.trackingEventsCollectionId,
          hasApiKey: !!process.env.APPWRITE_API_KEY,
        },
      },
      { status: 500 },
    );
  }
}
