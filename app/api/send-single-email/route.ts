import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { formatEmailSendErrorForUser } from "@/lib/gmail-user-message";
import { apiLogger } from "@/lib/logger";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { EmailService } from "@/lib/services/email-service";
import { sendSingleEmailSchema, validate } from "@/lib/validation";

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
    const parsed = validate(sendSingleEmailSchema, data);
    if (!parsed.success || !parsed.data) {
      return NextResponse.json(
        { error: parsed.message || "Invalid request" },
        { status: 400 },
      );
    }

    const {
      to,
      subject,
      message,
      originalRowData = {},
      attachments = [],
      personalizedAttachment,
      cc,
      bcc,
    } = parsed.data;
    const campaignId =
      typeof data.campaignId === "string" ? data.campaignId : undefined;
    const trackingEnabled = data.trackingEnabled !== false;
    const isTransactional = data.isTransactional === true;

    const ccList = cc ?? [];
    const bccList = bcc ?? [];

    if (ccList.length || bccList.length) {
      apiLogger.info("Sending with Cc/Bcc", {
        to,
        ccCount: ccList.length,
        bccCount: bccList.length,
      });
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
        cc: ccList.length ? ccList : undefined,
        bcc: bccList.length ? bccList : undefined,
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
      const raw = result.error || "Send failed";
      return NextResponse.json(
        {
          error: raw,
          userMessage: formatEmailSendErrorForUser(raw),
        },
        { status: 500 },
      );
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
