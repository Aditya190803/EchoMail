import { NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { authLogger } from "@/lib/logger";

export async function GET() {
  try {
    // Test if we can get the auth options
    const session = await getServerSession(authOptions);

    return NextResponse.json({
      status: "ok",
      hasSession: !!session,
      timestamp: new Date().toISOString(),
      environment: {
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
        nodeEnv: process.env.NODE_ENV,
      },
    });
  } catch (error) {
    authLogger.error(
      "Auth test error",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
