import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { formatForEmail, convertEmojisToUnicode } from "@/lib/email-formatting";
import { apiLogger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const { htmlContent } = await request.json();

    if (!htmlContent) {
      return NextResponse.json(
        { error: "HTML content is required" },
        { status: 400 },
      );
    }

    // Test emoji conversion first
    const originalContent = htmlContent;
    const contentWithTextEmojis = convertEmojisToUnicode(htmlContent);

    // Format for email
    const formattedHTML = formatForEmail(htmlContent);

    return NextResponse.json({
      success: true,
      original: originalContent,
      emojiConverted: contentWithTextEmojis,
      formatted: formattedHTML,
      analysis: {
        originalLength: originalContent.length,
        emojiConvertedLength: contentWithTextEmojis.length,
        formattedLength: formattedHTML.length,
        hasEmojiImages:
          originalContent.includes("<img") && originalContent.includes("emoji"),
        emojiImagesRemoved:
          !contentWithTextEmojis.includes("<img") ||
          !contentWithTextEmojis.includes("emoji"),
      },
    });
  } catch (error) {
    apiLogger.error(
      "Email formatting error",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error: "Failed to format email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
