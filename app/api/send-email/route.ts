import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { sendEmailViaAPI, replacePlaceholders } from "@/lib/gmail"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { personalizedEmails } = await request.json()
    const results = []

    // Get first email for campaign info
    const firstEmail = personalizedEmails[0]
    const campaignSubject = replacePlaceholders(firstEmail.subject, firstEmail.originalRowData)

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

    // Save campaign to Supabase
    const successCount = results.filter(r => r.status === "success").length
    const failedCount = results.filter(r => r.status === "error").length
    
    try {
      await supabase.from("email_campaigns").insert({
        subject: campaignSubject,
        recipients: personalizedEmails.length,
        sent: successCount,
        failed: failedCount,
        date: new Date().toISOString(),
        status: failedCount === 0 ? "completed" : "completed",
        user_email: session.user?.email
      })
    } catch (supabaseError) {
      console.error("Failed to save campaign to Supabase:", supabaseError)
      // Continue anyway, don't fail the email sending
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Send email API error:", error)
    return NextResponse.json({ error: "Failed to send emails" }, { status: 500 })
  }
}
