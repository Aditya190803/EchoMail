import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { apiLogger } from "@/lib/logger";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { EmailService } from "@/lib/services/email-service";

// App Router configuration for single email sending
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = rateLimit(request, RATE_LIMITS.sendEmail);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const session = await getServerSession(authOptions);

    if (!session?.accessToken || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const {
      to,
      subject,
      message,
      originalRowData = {},
      attachments = [],
      personalizedAttachment,
      campaignId,
      trackingEnabled = true,
      isTransactional = false,
    } = data;

    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const emailService = new EmailService(session.accessToken);

    const result = await emailService.sendSingle(
      {
        email: to,
        customFields: originalRowData,
        personalizedAttachment,
      },
      {
        subject,
        body: message,
      },
      attachments,
      trackingEnabled
        ? {
            campaignId: campaignId || "single-send-" + Date.now(),
            userEmail: session.user.email,
          }
        : undefined,
      isTransactional,
    );

    if (result.status === "error") {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    apiLogger.error(
      "Send single email API error",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to process email request" },
      { status: 500 },
    );
  }
}
