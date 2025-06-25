import { NextRequest, NextResponse } from "next/server";

// Use the same global Map as in send-email-chunk
declare global {
  var emailProgress: Map<string, {
    total: number
    sent: number
    failed: number
    status: 'sending' | 'completed' | 'error'
    startTime: number
    lastUpdate: number
  }>
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");
    
    console.log('Progress API called for campaignId:', campaignId); // Debug log
    console.log('Available campaigns:', Array.from(global.emailProgress?.keys() || [])); // Debug log
    
    if (!campaignId) {
      return NextResponse.json({ error: "Missing campaignId" }, { status: 400 });
    }

    if (!global.emailProgress) {
      console.log('Global emailProgress not initialized'); // Debug log
      return NextResponse.json({ sent: 0, failed: 0, total: 0, status: 'error' });
    }

    const progress = global.emailProgress.get(campaignId);
    
    if (!progress) {
      console.log('No progress found for campaignId:', campaignId); // Debug log
      return NextResponse.json({ sent: 0, failed: 0, total: 0, status: 'error' });
    }

    console.log('Returning progress:', progress); // Debug log
    return NextResponse.json(progress);
  } catch (error) {
    console.error('Error in progress API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
