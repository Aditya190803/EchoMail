import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendEmailViaAPI, replacePlaceholders } from "@/lib/gmail"

/**
 * Simplified email sending endpoint with sequential processing.
 * 
 * This endpoint processes emails one at a time to ensure reliable delivery
 * and avoid payload size issues. For new implementations, use the dedicated
 * /api/send-single-email endpoint which is optimized for single email delivery.
 */

interface EmailResult {
  email: string
  status: "success" | "error"
  error?: string
}

interface PersonalizedEmail {
  to: string
  subject: string
  message: string
  originalRowData: Record<string, string>
  attachments?: any[]
}

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

    const { personalizedEmails }: { personalizedEmails: PersonalizedEmail[] } = await request.json()
    
    if (!personalizedEmails || !Array.isArray(personalizedEmails) || personalizedEmails.length === 0) {
      return NextResponse.json({ error: "No emails provided" }, { status: 400 })
    }

    const results: EmailResult[] = []

    console.log(`Processing ${personalizedEmails.length} emails sequentially...`)

    // Process emails one by one to avoid payload size issues
    for (let i = 0; i < personalizedEmails.length; i++) {
      const email = personalizedEmails[i]
      
      console.log(`Processing email ${i + 1}/${personalizedEmails.length}:`, {
        to: email.to,
        hasAttachments: email.attachments && email.attachments.length > 0
      })

      try {
        const personalizedSubject = replacePlaceholders(email.subject, email.originalRowData)
        const personalizedMessage = replacePlaceholders(email.message, email.originalRowData)

        await sendEmailViaAPI(
          session!.accessToken!,
          email.to,
          personalizedSubject,
          personalizedMessage,
          email.attachments || [],
        )

        results.push({
          email: email.to,
          status: "success",
        })

        console.log(`✅ Successfully sent email ${i + 1}/${personalizedEmails.length} to ${email.to}`)

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        console.error(`❌ Failed to send email ${i + 1}/${personalizedEmails.length} to ${email.to}:`, errorMessage)
        
        results.push({
          email: email.to,
          status: "error",
          error: errorMessage,
        })
      }

      // Wait 1 second between emails to avoid rate limiting
      if (i < personalizedEmails.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Always save campaign to Firebase, regardless of email success/failure
    const successCount = results.filter(r => r.status === "success").length
    const failedCount = results.filter(r => r.status === "error").length
    
    // Note: Campaign data is now saved by the frontend component to avoid duplicates
    // This allows for more detailed campaign data including content, attachments, etc.

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
