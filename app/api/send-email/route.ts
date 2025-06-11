import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { sendEmailViaAPI, replacePlaceholders } from "@/lib/gmail"

export async function POST(request: NextRequest) {
  try {
    // Check if we can get a session
    let session
    try {
      session = await getServerSession(authOptions)
    } catch (authError) {
      console.error("Auth session error:", authError)
      return NextResponse.json(
        {
          error: "Authentication service error",
          details: "Unable to verify session",
        },
        { status: 500 },
      )
    }

    if (!session) {
      return NextResponse.json(
        {
          error: "Not authenticated",
          details: "Please sign in to send emails",
        },
        { status: 401 },
      )
    }

    if (!session.accessToken) {
      return NextResponse.json(
        {
          error: "No access token",
          details: "Please sign in again to refresh your access token",
        },
        { status: 401 },
      )
    }

    const body = await request.json()
    const { personalizedEmails } = body

    if (!personalizedEmails || !Array.isArray(personalizedEmails)) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: "personalizedEmails array is required",
        },
        { status: 400 },
      )
    }

    const results = []

    for (const email of personalizedEmails) {
      try {
        const personalizedSubject = replacePlaceholders(email.subject, email.originalRowData)
        const personalizedMessage = replacePlaceholders(email.message, email.originalRowData)

        await sendEmailViaAPI(
          session.accessToken,
          email.to,
          personalizedSubject,
          personalizedMessage,
          email.attachments,
        )

        results.push({
          email: email.to,
          status: "success",
        })
      } catch (emailError) {
        console.error(`Failed to send email to ${email.to}:`, emailError)
        results.push({
          email: email.to,
          status: "error",
          error: emailError instanceof Error ? emailError.message : "Failed to send email",
        })
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Send email API error:", error)
    return NextResponse.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 },
    )
  }
}
