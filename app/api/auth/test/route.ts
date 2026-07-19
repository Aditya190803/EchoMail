import { NextResponse } from "next/server";

/**
 * Auth diagnostics were removed for production.
 * Use NextAuth session endpoints instead.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    // No secret presence flags — avoids env reconnaissance
  });
}
