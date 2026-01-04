import { type NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { databases, config, Query } from "@/lib/appwrite-server";
import { authOptions } from "@/lib/auth";
import { apiLogger } from "@/lib/logger";
import { rateLimit, rateLimitUserEmail, RATE_LIMITS } from "@/lib/rate-limit";
import {
  EmailService,
  type PersonalizedEmail,
} from "@/lib/services/email-service";

export async function POST(request: NextRequest) {
  try {
    // Apply global IP-based rate limiting first
    const rateLimitResponse = rateLimit(request, RATE_LIMITS.sendEmail);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const session = await getServerSession(authOptions);

    if (!session?.accessToken || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      campaignId,
      trackingEnabled = true,
      abTestId: _abTestId,
      recipients,
      subject,
      content,
      variants, // New: support for multiple variants
    } = body;

    let personalizedEmails: PersonalizedEmail[] = body.personalizedEmails;

    // Handle A/B testing payload format (recipients, subject, content)
    if (!personalizedEmails && recipients && Array.isArray(recipients)) {
      if (variants && Array.isArray(variants) && variants.length > 0) {
        // Distribute variants among recipients
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

    if (
      !personalizedEmails ||
      !Array.isArray(personalizedEmails) ||
      personalizedEmails.length === 0
    ) {
      return NextResponse.json(
        { error: "No emails provided" },
        { status: 400 },
      );
    }

    // Apply per-user rate limiting based on number of emails
    const userRateLimitResponse = rateLimitUserEmail(
      session.user.email,
      personalizedEmails.length,
    );
    if (userRateLimitResponse) {
      return userRateLimitResponse;
    }

    const emailService = new EmailService(session.accessToken);

    const summary = await emailService.sendPersonalizedBatch(
      personalizedEmails,
      {
        verifyBeforeSending: true,
        tracking: {
          enabled: trackingEnabled,
          campaignId: campaignId,
          userEmail: session.user.email,
        },
        checkUnsubscribe: async (email: string) => {
          const unsubscribeCheck = await databases.listDocuments(
            config.databaseId,
            config.unsubscribesCollectionId,
            [
              Query.equal("user_email", session.user.email!),
              Query.equal("email", email.toLowerCase()),
              Query.limit(1),
            ],
          );
          return unsubscribeCheck.documents.length > 0;
        },
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
      {
        error: "Failed to process email request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
