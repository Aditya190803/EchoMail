import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ 
        authenticated: false,
        message: "No session found" 
      }, { status: 401 })
    }

    // Test Gmail API access
    let gmailStatus = "unknown"
    let gmailError = null

    if (session.accessToken) {
      try {
        const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        })

        if (response.ok) {
          gmailStatus = "working"
        } else {
          gmailStatus = "failed"
          gmailError = await response.text()
        }
      } catch (error) {
        gmailStatus = "error"
        gmailError = error instanceof Error ? error.message : "Unknown error"
      }
    } else {
      gmailStatus = "no_token"
    }

    return NextResponse.json({
      authenticated: true,
      user: session.user,
      hasAccessToken: !!session.accessToken,
      tokenError: session.error,
      gmail: {
        status: gmailStatus,
        error: gmailError
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to check auth status",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
