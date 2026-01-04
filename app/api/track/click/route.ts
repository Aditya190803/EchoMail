import { type NextRequest, NextResponse } from "next/server";

import { databases, config, ID } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * Link click tracking endpoint
 * Records the click and redirects to the target URL
 */

export async function GET(request: NextRequest) {
  // Apply rate limiting to prevent abuse
  const rateLimitResponse = rateLimit(request, RATE_LIMITS.public);
  if (rateLimitResponse) {
    // Still redirect even if rate limited, just don't track
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get("url");
    if (targetUrl) {
      return NextResponse.redirect(decodeURIComponent(targetUrl));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("c");
    const email = searchParams.get("e");
    const userEmail = searchParams.get("u");
    const targetUrl = searchParams.get("url");
    const recipientId = searchParams.get("r");
    const linkId = searchParams.get("l");

    if (!targetUrl) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Record the click event if we have the required parameters
    if (campaignId && email && userEmail) {
      apiLogger.info("Processing click tracking", {
        campaignId,
        email: decodeURIComponent(email),
        targetUrl: decodeURIComponent(targetUrl),
        collectionId: config.trackingEventsCollectionId,
      });
      try {
        const doc = await databases.createDocument(
          config.databaseId,
          config.trackingEventsCollectionId,
          ID.unique(),
          {
            campaign_id: campaignId,
            recipient_id: recipientId || undefined,
            link_id: linkId || undefined,
            email: decodeURIComponent(email),
            event_type: "click",
            link_url: decodeURIComponent(targetUrl),
            user_agent: request.headers.get("user-agent") || undefined,
            ip_address:
              request.headers.get("x-forwarded-for")?.split(",")[0] ||
              request.headers.get("x-real-ip") ||
              undefined,
            user_email: decodeURIComponent(userEmail),
            created_at: new Date().toISOString(),
          },
        );
        apiLogger.info("Link click tracked successfully", {
          email: decodeURIComponent(email),
          targetUrl: decodeURIComponent(targetUrl),
          campaignId,
          docId: doc.$id,
        });
      } catch (error) {
        apiLogger.error(
          "Error recording click event",
          error instanceof Error ? error : undefined,
          {
            campaignId,
            email: decodeURIComponent(email),
            errorMessage:
              error instanceof Error ? error.message : String(error),
            collectionId: config.trackingEventsCollectionId,
          },
        );
        // Don't fail the redirect
      }
    } else {
      apiLogger.warn("Click tracking missing required params", {
        hasCampaignId: !!campaignId,
        hasEmail: !!email,
        hasUserEmail: !!userEmail,
      });
    }

    // Redirect to the target URL
    return NextResponse.redirect(decodeURIComponent(targetUrl));
  } catch (error) {
    apiLogger.error(
      "Link tracking error",
      error instanceof Error ? error : undefined,
    );
    // Redirect to home on error
    return NextResponse.redirect(new URL("/", request.url));
  }
}
