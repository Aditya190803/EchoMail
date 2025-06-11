import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { sendEmailViaAPI, replacePlaceholders } from "@/lib/gmail"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log("Session debug:", {
      hasSession: !!session,
      hasAccessToken: !!session?.accessToken,
      hasUserEmail: !!session?.user?.email,
      userEmail: session?.user?.email,
      sessionKeys: session ? Object.keys(session) : [],
      userKeys: session?.user ? Object.keys(session.user) : []
    })

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized - No access token" }, { status: 401 })
    }

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized - No user email" }, { status: 401 })
    }

    const { personalizedEmails } = await request.json()
    
    if (!personalizedEmails || !Array.isArray(personalizedEmails) || personalizedEmails.length === 0) {
      return NextResponse.json({ error: "No emails provided" }, { status: 400 })
    }

    const results = []

    // Get first email for campaign info
    const firstEmail = personalizedEmails[0]
    const campaignSubject = replacePlaceholders(firstEmail.subject, firstEmail.originalRowData)

    for (const email of personalizedEmails) {
      try {
        console.log("Processing email:", {
          to: email.to,
          originalSubject: email.subject,
          originalMessage: email.message?.substring(0, 100) + "...",
          originalRowData: email.originalRowData
        })

        const personalizedSubject = replacePlaceholders(email.subject, email.originalRowData)
        const personalizedMessage = replacePlaceholders(email.message, email.originalRowData)

        console.log("After placeholder replacement:", {
          personalizedSubject,
          personalizedMessage: personalizedMessage?.substring(0, 100) + "...",
          dataUsed: email.originalRowData
        })

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
        console.error(`Failed to send email to ${email.to}:`, error)
        results.push({
          email: email.to,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    // Always save campaign to Supabase, regardless of email success/failure
    const successCount = results.filter(r => r.status === "success").length
    const failedCount = results.filter(r => r.status === "error").length
    
    try {
      const campaignData = {
        subject: campaignSubject,
        recipients: personalizedEmails.length,
        sent: successCount,
        failed: failedCount,
        date: new Date().toISOString(),
        status: failedCount === 0 ? "completed" : (successCount === 0 ? "failed" : "partial"),
        user_email: session.user.email
      }

      console.log("Saving campaign to Supabase:", campaignData)
      
      const { data, error } = await supabaseAdmin.from("email_campaigns").insert(campaignData)
      
      if (error) {
        console.error("Supabase insert error:", error)
        // Don't fail the request if Supabase fails, just log it
      } else {
        console.log("Campaign saved successfully to Supabase:", data)
      }
    } catch (supabaseError) {
      console.error("Failed to save campaign to Supabase:", supabaseError)
      // Continue anyway, don't fail the email sending response
    }

    return NextResponse.json({ 
      results,
      summary: {
        total: personalizedEmails.length,
        sent: successCount,
        failed: failedCount
      }
    })
  } catch (error) {
    console.error("Send email API error:", error)
    return NextResponse.json({ error: "Failed to process email request" }, { status: 500 })
  }
}
