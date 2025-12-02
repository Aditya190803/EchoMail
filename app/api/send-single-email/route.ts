import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  sendEmailViaAPI,
  replacePlaceholders,
  preResolveAttachments,
} from "@/lib/gmail";
import { fetchFileFromUrl } from "@/lib/attachment-fetcher";
import { apiLogger } from "@/lib/logger";

// App Router configuration for single email sending
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Increase body size limit to 10MB for emails with attachments
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized - No access token" },
        { status: 401 },
      );
    }

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized - No user email" },
        { status: 401 },
      );
    }

    // Parse the minimal request
    const requestText = await request.text();
    const sizeKB = (requestText.length / 1024).toFixed(2);
    const sizeMB = (requestText.length / 1024 / 1024).toFixed(2);
    apiLogger.debug(`Single email request`, { sizeKB });

    // Strict size limit for single emails (increased to 10MB for attachments)
    if (requestText.length > 10000000) {
      // 10MB limit for single email with attachments
      return NextResponse.json(
        {
          error: "Email too large to send",
          userMessage: `Your email is too large (${sizeMB} MB). This is usually caused by large attachments. Please reduce attachment sizes or remove some attachments. Maximum allowed size is 10 MB.`,
          sizeKB,
          sizeMB,
          maxSizeMB: "10",
        },
        { status: 413 },
      );
    }

    let data;
    try {
      data = JSON.parse(requestText);
    } catch (_parseError) {
      return NextResponse.json(
        {
          error: "Invalid request format",
          userMessage:
            "The email data could not be processed. Please try again or contact support if the issue persists.",
        },
        { status: 400 },
      );
    }

    const {
      to,
      subject,
      message,
      originalRowData,
      attachments,
      personalizedAttachment,
    } = data;

    if (!to || !subject || !message) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          userMessage:
            "Please make sure you have entered a recipient email address, subject, and message body.",
        },
        { status: 400 },
      );
    }

    try {
      // Personalize and send the single email
      const personalizedSubject = replacePlaceholders(
        subject,
        originalRowData || {},
      );
      const personalizedMessage = replacePlaceholders(
        message,
        originalRowData || {},
      );

      apiLogger.debug(`Sending email`, {
        to,
        attachmentCount: (attachments || []).length,
        hasPersonalizedAttachment: !!personalizedAttachment?.url,
      });

      // Pre-resolve any Appwrite attachments to base64
      // This is done once per email request - for bulk sending, the client should
      // call a batch resolve endpoint or the attachments should already be base64
      let resolvedAttachments = await preResolveAttachments(attachments || []);

      // Fetch personalized attachment (file from Google Drive/OneDrive) if present
      if (personalizedAttachment?.url) {
        apiLogger.debug(`Fetching personalized file`, {
          to,
          url: personalizedAttachment.url,
        });
        try {
          const recipientName =
            originalRowData?.name || originalRowData?.Name || to.split("@")[0];
          const file = await fetchFileFromUrl(
            personalizedAttachment.url,
            recipientName,
            personalizedAttachment.fileName,
          );

          resolvedAttachments = [
            ...resolvedAttachments,
            {
              name: file.fileName,
              type: file.mimeType,
              data: file.base64,
            },
          ];

          apiLogger.debug(`Fetched personalized file`, {
            fileName: file.fileName,
            sizeKB: (file.buffer.length / 1024).toFixed(1),
          });
        } catch (fileError) {
          apiLogger.error(
            `Failed to fetch personalized file`,
            fileError instanceof Error ? fileError : undefined,
            { to },
          );
          return NextResponse.json(
            {
              success: false,
              email: to,
              status: "failed",
              error: `Failed to fetch personalized attachment: ${fileError instanceof Error ? fileError.message : "Unknown error"}`,
              userMessage: `Could not download the personalized attachment for this recipient. Please check the file URL is accessible.`,
              timestamp: new Date().toISOString(),
            },
            { status: 500 },
          );
        }
      }

      await sendEmailViaAPI(
        session.accessToken,
        to,
        personalizedSubject,
        personalizedMessage,
        resolvedAttachments,
      );

      apiLogger.info(`Successfully sent single email`, { to });

      return NextResponse.json({
        success: true,
        email: to,
        status: "sent",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      apiLogger.error(
        `Failed to send email`,
        error instanceof Error ? error : undefined,
        { to },
      );

      // Provide user-friendly error messages based on error type
      let userMessage = "Failed to send email. Please try again.";
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      if (
        errorMsg.includes("Invalid Credentials") ||
        errorMsg.includes("401")
      ) {
        userMessage =
          "Your Google account session has expired. Please sign out and sign in again to refresh your access.";
      } else if (
        errorMsg.includes("quota") ||
        errorMsg.includes("rate limit") ||
        errorMsg.includes("429")
      ) {
        userMessage =
          "You've reached Gmail's sending limit. Please wait a few minutes before trying again, or try sending fewer emails at once.";
      } else if (
        errorMsg.includes("recipient") ||
        errorMsg.includes("invalid email")
      ) {
        userMessage = `The email address "${to}" appears to be invalid. Please check the address and try again.`;
      } else if (errorMsg.includes("attachment") || errorMsg.includes("size")) {
        userMessage =
          "One or more attachments are too large. Please reduce the file size or remove large attachments.";
      } else if (errorMsg.includes("network") || errorMsg.includes("timeout")) {
        userMessage =
          "Network error occurred. Please check your internet connection and try again.";
      }

      return NextResponse.json(
        {
          success: false,
          email: to,
          status: "failed",
          error: errorMsg,
          userMessage,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }
  } catch (error) {
    apiLogger.error(
      "Send single email API error",
      error instanceof Error ? error : undefined,
    );

    // Check if this is a payload size error from the platform
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    let userMessage = "Failed to process your email request. Please try again.";

    if (
      errorMsg.includes("body") ||
      errorMsg.includes("size") ||
      errorMsg.includes("large")
    ) {
      userMessage =
        "Your email is too large to send. This is usually caused by large attachments. Please reduce attachment sizes (keep each file under 5 MB) or remove some attachments.";
    } else if (errorMsg.includes("JSON") || errorMsg.includes("parse")) {
      userMessage =
        "There was an issue processing your email data. Please refresh the page and try again.";
    }

    return NextResponse.json(
      {
        error: "Failed to process single email request",
        userMessage,
        details: errorMsg,
      },
      { status: 500 },
    );
  }
}
