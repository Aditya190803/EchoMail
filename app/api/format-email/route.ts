import { NextRequest, NextResponse } from "next/server";
import {
  formatEmailHTML,
  convertEmojiImagesToText,
} from "@/lib/email-formatter";
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
    const contentWithTextEmojis = convertEmojiImagesToText(htmlContent);

    // Format with MJML (server-side)
    const formattedHTML = formatEmailHTML(htmlContent);

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
        isMjmlCompiled:
          formattedHTML.includes("mj-") ||
          formattedHTML.length > originalContent.length * 2,
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
