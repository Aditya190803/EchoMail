import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { formatForEmail } from "@/lib/email-formatting";
import { apiLogger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { htmlContent } = await request.json();

    if (!htmlContent) {
      return NextResponse.json(
        { error: "HTML content is required" },
        { status: 400 },
      );
    }

    const formattedHTML = formatForEmail(htmlContent);

    return NextResponse.json({
      success: true,
      formattedHTML,
      originalLength: htmlContent.length,
      formattedLength: formattedHTML.length,
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
