import { NextRequest, NextResponse } from "next/server";

// Use the same global object as in send-email-batch
const globalEmailProgress: Record<string, { sent: number; failed: number; total: number; done: boolean }> =
  (global as any).globalEmailProgress || {};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "Missing campaignId" }, { status: 400 });
  }
  const progress = globalEmailProgress[campaignId] || null;
  return NextResponse.json(progress || { sent: 0, failed: 0, total: 0, done: false });
}
