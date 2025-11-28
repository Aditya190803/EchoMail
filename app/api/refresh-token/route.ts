import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getToken } from 'next-auth/jwt'

/**
 * Token refresh endpoint for long-running email campaigns.
 * This endpoint checks the current token status and refreshes if needed.
 * 
 * Called by the client before sending emails in a long campaign to ensure
 * the access token is still valid.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'No active session',
        requiresReauth: true 
      }, { status: 401 })
    }

    // Get the JWT token to check expiry
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    })

    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Token not found',
        requiresReauth: true 
      }, { status: 401 })
    }

    // Check if token has error from refresh attempt
    if (token.error === 'RefreshAccessTokenError') {
      return NextResponse.json({ 
        success: false, 
        error: 'Token refresh failed',
        requiresReauth: true 
      }, { status: 401 })
    }

    // Check token expiry
    const expiresAt = token.accessTokenExpires as number
    const now = Date.now()
    const timeUntilExpiry = expiresAt - now
    const minutesRemaining = Math.floor(timeUntilExpiry / 1000 / 60)

    // Token is valid
    return NextResponse.json({
      success: true,
      accessToken: token.accessToken,
      expiresIn: timeUntilExpiry,
      minutesRemaining,
      isExpiringSoon: minutesRemaining < 10, // Less than 10 minutes
      message: `Token valid for ${minutesRemaining} more minutes`
    })

  } catch (error) {
    console.error('Token refresh check error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to check token status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET endpoint to check token status without refreshing
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({ 
        valid: false, 
        error: 'No active session' 
      }, { status: 401 })
    }

    // Get the JWT token
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    })

    if (!token || token.error) {
      return NextResponse.json({ 
        valid: false, 
        error: token?.error || 'Token not found' 
      }, { status: 401 })
    }

    const expiresAt = token.accessTokenExpires as number
    const now = Date.now()
    const timeUntilExpiry = expiresAt - now
    const minutesRemaining = Math.floor(timeUntilExpiry / 1000 / 60)

    return NextResponse.json({
      valid: timeUntilExpiry > 0,
      expiresIn: timeUntilExpiry,
      minutesRemaining,
      isExpiringSoon: minutesRemaining < 10
    })

  } catch (error) {
    console.error('Token status check error:', error)
    return NextResponse.json({ 
      valid: false, 
      error: 'Failed to check token status' 
    }, { status: 500 })
  }
}
