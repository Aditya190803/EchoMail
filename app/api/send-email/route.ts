import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendEmailViaAPI, replacePlaceholders } from "@/lib/gmail"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { personalizedEmails } = await request.json()

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
      } catch (error) {
        results.push({
          email: email.to,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    return NextResponse.json({ error: "Failed to send emails" }, { status: 500 })
  }
}
