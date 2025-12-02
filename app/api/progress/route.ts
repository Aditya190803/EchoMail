import { NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/logger";

// Use the same global Map as in send-single-email
declare global {
  var emailProgress: Map<
    string,
    {
      total: number;
      sent: number;
      failed: number;
      status: "sending" | "completed" | "error" | "paused";
      startTime: number;
      lastUpdate: number;
    }
  >;
  var emailRateLimitState: {
    isPaused: boolean;
    pauseStartTime: number;
    pauseDuration: number;
    pauseReason?: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");

    apiLogger.debug("Progress API called", {
      campaignId,
      availableCampaigns: Array.from(global.emailProgress?.keys() || []),
    });

    if (!campaignId) {
      return NextResponse.json(
        { error: "Missing campaignId" },
        { status: 400 },
      );
    }

    if (!global.emailProgress) {
      apiLogger.debug("Global emailProgress not initialized");
      return NextResponse.json({
        sent: 0,
        failed: 0,
        total: 0,
        status: "error",
      });
    }

    const progress = global.emailProgress.get(campaignId);

    if (!progress) {
      apiLogger.debug("No progress found", { campaignId });
      return NextResponse.json({
        sent: 0,
        failed: 0,
        total: 0,
        status: "error",
      });
    }

    apiLogger.debug("Returning progress", progress);

    // Include global pause state in response
    const response = {
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
    };

    return NextResponse.json(response);
  } catch (error) {
    apiLogger.error(
      "Error in progress API",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
