import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { databases, config, Query } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";

// Client-side progress is primary; this endpoint only reports if a
// same-instance global Map was populated (legacy / single-instance).
declare global {
  // eslint-disable-next-line no-var
  var emailProgress: Map<
    string,
    {
      total: number;
      sent: number;
      failed: number;
      status: "sending" | "completed" | "error" | "paused";
      startTime: number;
      lastUpdate: number;
      userEmail?: string;
    }
  >;
  // eslint-disable-next-line no-var
  var emailRateLimitState: {
    isPaused: boolean;
    pauseStartTime: number;
    pauseDuration: number;
    pauseReason?: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const campaignId = new URL(request.url).searchParams.get("campaignId");
    if (!campaignId) {
      return NextResponse.json(
        { error: "Missing campaignId" },
        { status: 400 },
      );
    }

    // Ownership: campaign must belong to the session user when it exists in
    // DB. Ephemeral client campaign ids (not yet in DB) are allowed and their
    // progress-map ownership is checked below before returning data.
    if (config.databaseId && config.campaignsCollectionId) {
      try {
        const owned = await databases.listDocuments(
          config.databaseId,
          config.campaignsCollectionId,
          [
            Query.equal("$id", campaignId),
            Query.equal("user_email", auth.email),
            Query.limit(1),
          ],
        );
        if (owned.total === 0 && !global.emailProgress?.has(campaignId)) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
      } catch {
        // Ownership lookup failed; the map ownership check below still applies.
      }
    }

    if (!global.emailProgress) {
      return NextResponse.json({
        sent: 0,
        failed: 0,
        total: 0,
        status: "error",
      });
    }

    const progress = global.emailProgress.get(campaignId);
    if (!progress) {
      return NextResponse.json({
        sent: 0,
        failed: 0,
        total: 0,
        status: "error",
      });
    }

    if (progress.userEmail && progress.userEmail !== auth.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      ...progress,
      globalPause: global.emailRateLimitState
        ? {
            isPaused: global.emailRateLimitState.isPaused,
            pauseStartTime: global.emailRateLimitState.pauseStartTime,
            pauseDuration: global.emailRateLimitState.pauseDuration,
            pauseReason: global.emailRateLimitState.pauseReason,
            pauseTimeRemaining: global.emailRateLimitState.isPaused
              ? Math.max(
                  0,
                  global.emailRateLimitState.pauseStartTime +
                    global.emailRateLimitState.pauseDuration -
                    Date.now(),
                )
              : 0,
          }
        : null,
    });
  } catch (error) {
    apiLogger.error(
      "Progress API error",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to get progress" },
      { status: 500 },
    );
  }
}
