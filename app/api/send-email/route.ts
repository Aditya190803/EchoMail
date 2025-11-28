import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendEmailViaAPI, replacePlaceholders, preResolveAttachments, clearAttachmentCache, preBuildEmailTemplate, sendEmailWithTemplate } from "@/lib/gmail"

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

    // Pre-resolve all attachments ONCE before the send loop
    // This prevents downloading the same attachment for each email
    let resolvedAttachments: any[] = []
    const firstEmailWithAttachments = personalizedEmails.find(e => e.attachments && e.attachments.length > 0)
    if (firstEmailWithAttachments?.attachments) {
      console.log(`📦 Pre-resolving ${firstEmailWithAttachments.attachments.length} attachments before sending...`)
      try {
        resolvedAttachments = await preResolveAttachments(firstEmailWithAttachments.attachments)
        console.log(`✅ Attachments pre-resolved successfully`)
      } catch (error) {
        console.error('❌ Failed to pre-resolve attachments:', error)
        return NextResponse.json({ 
          error: "Failed to process attachments",
          details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 })
      }
    }

    // Check if all emails have the same subject/message (bulk mode - can use template optimization)
    const firstEmail = personalizedEmails[0]
    const allSameContent = personalizedEmails.every(e => 
      e.subject === firstEmail.subject && 
      e.message === firstEmail.message &&
      Object.keys(e.originalRowData).length === 0 // No placeholders
    )
    
    // Use optimized template-based sending for bulk emails with same content
    if (allSameContent && personalizedEmails.length > 1) {
      console.log(`🚀 Using optimized template-based bulk sending (${personalizedEmails.length} recipients)`)
      
      try {
        // Pre-build the email template ONCE (includes base64 encoding of attachments)
        await preBuildEmailTemplate(
          session.accessToken,
          firstEmail.subject,
          firstEmail.message,
          resolvedAttachments
        )
        
        // Send to each recipient using the cached template (FAST - only swaps To header)
        for (let i = 0; i < personalizedEmails.length; i++) {
          const email = personalizedEmails[i]
          
          try {
            await sendEmailWithTemplate(session.accessToken, email.to)
            results.push({ email: email.to, status: "success" })
            console.log(`✅ Sent ${i + 1}/${personalizedEmails.length} to ${email.to}`)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error"
            console.error(`❌ Failed ${i + 1}/${personalizedEmails.length} to ${email.to}:`, errorMessage)
            results.push({ email: email.to, status: "error", error: errorMessage })
          }
          
          // Wait 1 second between emails to avoid rate limiting
          if (i < personalizedEmails.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      } catch (error) {
        console.error('❌ Failed to build email template:', error)
        return NextResponse.json({ 
          error: "Failed to build email template",
          details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 })
      }
    } else {
      // Personalized emails - need to build each one (slower but necessary for placeholders)
      console.log(`📧 Using personalized sending mode (placeholders detected)`)
      
      for (let i = 0; i < personalizedEmails.length; i++) {
        const email = personalizedEmails[i]
        
        console.log(`Processing email ${i + 1}/${personalizedEmails.length}:`, {
          to: email.to,
          hasAttachments: resolvedAttachments.length > 0
        })

        try {
          const personalizedSubject = replacePlaceholders(email.subject, email.originalRowData)
          const personalizedMessage = replacePlaceholders(email.message, email.originalRowData)

          await sendEmailViaAPI(
            session!.accessToken!,
            email.to,
            personalizedSubject,
            personalizedMessage,
            resolvedAttachments, // Use pre-resolved attachments for all emails
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
    }

    // Always save campaign to Firebase, regardless of email success/failure
    const successCount = results.filter(r => r.status === "success").length
    const failedCount = results.filter(r => r.status === "error").length

    // Clear attachment cache after campaign completes
    clearAttachmentCache()

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
