import { type NextRequest, NextResponse } from "next/server";

import { databases, config, ID, Query } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * Public unsubscribe endpoint
 * Adds the email to the unsubscribe list for the user
 */

export async function GET(request: NextRequest) {
  // Apply rate limiting to prevent abuse
  const rateLimitResponse = rateLimit(request, RATE_LIMITS.public);
  if (rateLimitResponse) {
    return new NextResponse(
      generateHtmlPage(
        "Rate Limited",
        "Too many requests. Please try again later.",
      ),
      {
        status: 429,
        headers: { "Content-Type": "text/html" },
      },
    );
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("e");
  const userEmail = searchParams.get("u");

  if (!email || !userEmail) {
    return new NextResponse(
      generateHtmlPage("Invalid Request", "Missing required parameters"),
      {
        status: 400,
        headers: { "Content-Type": "text/html" },
      },
    );
  }

  try {
    const decodedEmail = email.toLowerCase();
    const decodedUserEmail = userEmail;

    if (!config.databaseId || !config.unsubscribesCollectionId) {
      apiLogger.error("Unsubscribe configuration missing", {
        databaseId: config.databaseId,
        collectionId: config.unsubscribesCollectionId,
      });
      throw new Error("Configuration error");
    }

    apiLogger.info("Processing unsubscribe request", {
      email: decodedEmail,
      userEmail: decodedUserEmail,
    });

    // Check if already unsubscribed
    const existing = await databases.listDocuments(
      config.databaseId,
      config.unsubscribesCollectionId,
      [
        Query.equal("user_email", decodedUserEmail),
        Query.equal("email", decodedEmail),
        Query.limit(1),
      ],
    );

    if (existing.documents.length > 0) {
      return new NextResponse(
        generateHtmlPage(
          "Already Unsubscribed",
          `${decodedEmail} is already unsubscribed from this mailing list.`,
        ),
        {
          status: 200,
          headers: { "Content-Type": "text/html" },
        },
      );
    }

    // Add to unsubscribe list
    // We try to include both unsubscribed_at and created_at for compatibility
    // If it fails, we try a more minimal version
    const now = new Date().toISOString();
    try {
      await databases.createDocument(
        config.databaseId,
        config.unsubscribesCollectionId,
        ID.unique(),
        {
          email: decodedEmail,
          user_email: decodedUserEmail,
          reason: "Clicked unsubscribe link",
          unsubscribed_at: now,
          created_at: now,
        },
      );
    } catch (createError: any) {
      // If it failed due to attribute mismatch, try with just the required fields
      apiLogger.warn(
        "First unsubscribe attempt failed, trying minimal version",
        {
          error: createError.message,
        },
      );

      await databases.createDocument(
        config.databaseId,
        config.unsubscribesCollectionId,
        ID.unique(),
        {
          email: decodedEmail,
          user_email: decodedUserEmail,
          reason: "Clicked unsubscribe link",
        },
      );
    }

    apiLogger.info("Unsubscribe processed successfully", {
      email: decodedEmail,
      senderEmail: decodedUserEmail,
    });

    return new NextResponse(
      generateHtmlPage(
        "Successfully Unsubscribed",
        `${decodedEmail} has been unsubscribed from this mailing list. You will no longer receive emails from this sender.`,
      ),
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      },
    );
  } catch (error) {
    apiLogger.error(
      "Unsubscribe error",
      error instanceof Error ? error : undefined,
    );
    return new NextResponse(
      generateHtmlPage(
        "Error",
        "An error occurred while processing your request. Please try again later.",
      ),
      {
        status: 500,
        headers: { "Content-Type": "text/html" },
      },
    );
  }
}

function generateHtmlPage(title: string, message: string): string {
  const isSuccess = title.includes("Success") || title.includes("Unsubscribed");
  const isError =
    title.includes("Error") ||
    title.includes("Invalid") ||
    title.includes("Limited");

  const primaryColor = isSuccess ? "#10b981" : isError ? "#ef4444" : "#6366f1";
  const bgColor = isSuccess ? "#f0fdf4" : isError ? "#fef2f2" : "#f5f3ff";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | EchoMail</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: ${primaryColor};
      --bg: ${bgColor};
      --text-main: #111827;
      --text-muted: #4b5563;
      --accent: #8b5cf6;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background-color: #f9fafb;
      background-image: radial-gradient(#e5e7eb 1px, transparent 1px);
      background-size: 24px 24px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      color: var(--text-main);
    }
    .card {
      background: white;
      border-radius: 24px;
      padding: 48px 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      border: 1px solid #f3f4f6;
      position: relative;
      overflow: hidden;
    }
    .card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(to right, var(--primary), var(--accent));
    }
    .logo {
      font-weight: 700;
      font-size: 22px;
      letter-spacing: -0.03em;
      color: #111827;
      margin-bottom: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    .logo-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);
    }
    .logo-icon svg {
      width: 20px;
      height: 20px;
      color: white;
    }
    .status-icon {
      width: 72px;
      height: 72px;
      background-color: var(--bg);
      color: var(--primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 28px;
    }
    .status-icon svg {
      width: 36px;
      height: 36px;
    }
    h1 {
      font-size: 26px;
      font-weight: 700;
      margin-bottom: 16px;
      letter-spacing: -0.025em;
      color: #111827;
    }
    p {
      font-size: 16px;
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 36px;
    }
    .btn {
      display: inline-block;
      background: #111827;
      color: white;
      padding: 14px 28px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .btn:hover {
      background: #1f2937;
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }
    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #f3f4f6;
      font-size: 14px;
      color: #9ca3af;
    }
    .footer a {
      color: #6366f1;
      text-decoration: none;
      font-weight: 500;
    }
    .footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <div class="logo-icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      EchoMail
    </div>
    <div class="status-icon">
      ${
        isSuccess
          ? '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>'
          : isError
            ? '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
      }
    </div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/" class="btn">Back to Home</a>
    <div class="footer">
      Powered by <a href="/">EchoMail</a>
    </div>
  </div>
</body>
</html>
  `;
}
