import { type NextRequest, NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { apiLogger } from "@/lib/logger";
import {
  rateLimitAsync,
  rateLimitUserEmailAsync,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import {
  EmailService,
  type PersonalizedEmail,
} from "@/lib/services/email-service";
import { checkUserUnsubscribed } from "@/lib/services/unsubscribe-service";
import { sendEmailRequestSchema, validate } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await rateLimitAsync(
      request,
      RATE_LIMITS.sendEmail,
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const auth = await requireSession(request, { accessToken: true });
    if (!isAuthed(auth)) {
      return auth;
    }

    const body = await request.json();
    const parsed = validate(sendEmailRequestSchema, body);
    if (!parsed.success || !parsed.data) {
      return NextResponse.json(
        { error: parsed.message || "Invalid request" },
        { status: 400 },
      );
    }

    const {
      campaignId,
      trackingEnabled = true,
      isTransactional = false,
      recipients,
      subject,
      content,
      variants,
      personalizedEmails: rawPersonalized,
    } = parsed.data;

    let personalizedEmails: PersonalizedEmail[] | undefined =
      rawPersonalized?.map((e) => ({
        to: e.to,
        subject: e.subject,
        message: e.message,
        originalRowData: e.originalRowData ?? {},
        attachments: e.attachments,
      }));

    if (!personalizedEmails && recipients && Array.isArray(recipients)) {
      if (variants && variants.length > 0) {
        personalizedEmails = recipients.map((to: string, index: number) => {
          const variant = variants[index % variants.length];
          return {
            to,
            subject: variant.subject || subject || "A/B Test Email",
            message: variant.content || content || "",
            originalRowData: {},
          };
        });
      } else {
        personalizedEmails = recipients.map((to: string) => ({
          to,
          subject: subject || "A/B Test Email",
          message: content || "",
          originalRowData: {},
        }));
      }
    }

    if (!personalizedEmails || personalizedEmails.length === 0) {
      return NextResponse.json(
        { error: "No emails provided" },
        { status: 400 },
      );
    }

    const userRateLimitResponse = await rateLimitUserEmailAsync(
      auth.email,
      personalizedEmails.length,
    );
    if (userRateLimitResponse) {
      return userRateLimitResponse;
    }

    const emailService = new EmailService(auth.accessToken, auth.email);

    const summary = await emailService.sendPersonalizedBatch(
      personalizedEmails,
      {
        verifyBeforeSending: true,
        tracking: {
          enabled: trackingEnabled,
          campaignId: campaignId,
          userEmail: auth.email,
        },
        checkUnsubscribe: isTransactional
          ? undefined
          : async (email: string) => checkUserUnsubscribed(auth.email, email),
      },
    );

    return NextResponse.json({
      results: summary.results,
      summary: {
        total: summary.total,
        sent: summary.sent,
        failed: summary.failed,
        skipped: summary.skipped,
        successRate:
          summary.total > 0 ? (summary.sent / summary.total) * 100 : 0,
      },
    });
  } catch (error) {
    apiLogger.error(
      "Send email API error",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to process email request" },
      { status: 500 },
    );
  }
}
