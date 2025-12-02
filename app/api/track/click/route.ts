import { type NextRequest, NextResponse } from "next/server";
import { databases, config, ID } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";

/**
 * Link click tracking endpoint
 * Records the click and redirects to the target URL
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("c");
    const email = searchParams.get("e");
    const userEmail = searchParams.get("u");
    const targetUrl = searchParams.get("url");

    if (!targetUrl) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Record the click event if we have the required parameters
    if (campaignId && email && userEmail) {
      try {
        await databases.createDocument(
          config.databaseId,
          config.trackingEventsCollectionId,
          ID.unique(),
          {
            campaign_id: campaignId,
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
        apiLogger.debug("Link click tracked", {
          email,
          targetUrl: decodeURIComponent(targetUrl),
          campaignId,
        });
      } catch (error) {
        apiLogger.error(
          "Error recording click event",
          error instanceof Error ? error : undefined,
        );
        // Don't fail the redirect
      }
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
