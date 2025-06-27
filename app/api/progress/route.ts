import { NextRequest, NextResponse } from "next/server";

// Use the same global Map as in send-single-email
declare global {
  var emailProgress: Map<string, {
    total: number
    sent: number
    failed: number
    status: 'sending' | 'completed' | 'error' | 'paused'
    startTime: number
    lastUpdate: number
  }>
  var emailRateLimitState: {
    isPaused: boolean
    pauseStartTime: number
    pauseDuration: number
    pauseReason?: string
  }
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
    
    // Include global pause state in response
    const response = {
      ...progress,
      globalPause: global.emailRateLimitState ? {
        isPaused: global.emailRateLimitState.isPaused,
        pauseStartTime: global.emailRateLimitState.pauseStartTime,
        pauseDuration: global.emailRateLimitState.pauseDuration,
        pauseReason: global.emailRateLimitState.pauseReason,
        pauseTimeRemaining: global.emailRateLimitState.isPaused 
          ? Math.max(0, (global.emailRateLimitState.pauseStartTime + global.emailRateLimitState.pauseDuration) - Date.now())
          : 0
      } : null
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in progress API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
