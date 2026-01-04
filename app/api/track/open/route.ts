import { type NextRequest, NextResponse } from "next/server";

import { databases, config, ID } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * Tracking pixel endpoint for email open tracking
 * Returns a 1x1 transparent GIF
 */

// 1x1 transparent GIF
const TRACKING_PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export async function GET(request: NextRequest) {
  // Apply rate limiting to prevent abuse
  const rateLimitResponse = rateLimit(request, RATE_LIMITS.public);
  if (rateLimitResponse) {
    // Return pixel anyway but don't process tracking
    return new NextResponse(TRACKING_PIXEL, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
      },
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("c");
    const email = searchParams.get("e");
    const userEmail = searchParams.get("u");
    const recipientId = searchParams.get("r");

    // Record the open event if we have the required parameters
    if (campaignId && email && userEmail) {
      try {
        await databases.createDocument(
          config.databaseId,
          config.trackingEventsCollectionId,
          ID.unique(),
          {
            campaign_id: campaignId,
            recipient_id: recipientId || undefined,
            email: decodeURIComponent(email),
            event_type: "open",
            user_agent: request.headers.get("user-agent") || undefined,
            ip_address:
              request.headers.get("x-forwarded-for")?.split(",")[0] ||
              request.headers.get("x-real-ip") ||
              undefined,
            user_email: decodeURIComponent(userEmail),
            created_at: new Date().toISOString(),
          },
        );
        apiLogger.debug("Email open tracked", { email, campaignId });
      } catch (error) {
        apiLogger.error(
          "Error recording open event",
          error instanceof Error ? error : undefined,
        );
        // Don't fail the request, still return the pixel
      }
    }

    // Return the tracking pixel
    return new NextResponse(TRACKING_PIXEL, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    apiLogger.error(
      "Tracking pixel error",
      error instanceof Error ? error : undefined,
    );
    // Still return the pixel even on error
    return new NextResponse(TRACKING_PIXEL, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
      },
    });
  }
}
