import { type NextRequest, NextResponse } from "next/server";
import { databases, config, ID, Query } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";

/**
 * Public unsubscribe endpoint
 * Adds the email to the unsubscribe list for the user
 */

export async function GET(request: NextRequest) {
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
    const decodedEmail = decodeURIComponent(email).toLowerCase();
    const decodedUserEmail = decodeURIComponent(userEmail);

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
    await databases.createDocument(
      config.databaseId,
      config.unsubscribesCollectionId,
      ID.unique(),
      {
        email: decodedEmail,
        user_email: decodedUserEmail,
        reason: "Clicked unsubscribe link",
        unsubscribed_at: new Date().toISOString(),
      },
    );

    apiLogger.info("Unsubscribe processed", {
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
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - EchoMail</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 48px;
      max-width: 500px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    .icon {
      width: 80px;
      height: 80px;
      background: ${title.includes("Success") ? "#10b981" : title.includes("Error") ? "#ef4444" : "#6366f1"};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .icon svg {
      width: 40px;
      height: 40px;
      color: white;
    }
    h1 {
      font-size: 28px;
      color: #111827;
      margin-bottom: 16px;
    }
    p {
      font-size: 16px;
      color: #6b7280;
      line-height: 1.6;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      ${
        title.includes("Success")
          ? '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>'
          : title.includes("Error")
            ? '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>'
      }
    </div>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="footer">
      Powered by EchoMail
    </div>
  </div>
</body>
</html>
  `;
}
