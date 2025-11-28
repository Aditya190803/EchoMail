import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendEmailViaAPI, replacePlaceholders, preResolveAttachments, clearAttachmentCache } from "@/lib/gmail"
import { databases, config } from "@/lib/appwrite-server"

/**
 * API endpoint to send a draft email immediately
 */

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { draftId } = await request.json()

    if (!draftId) {
      return NextResponse.json({ error: "Missing draftId" }, { status: 400 })
    }

    // Get the draft
    const doc = await databases.getDocument(
      config.databaseId,
      config.draftEmailsCollectionId,
      draftId
    )

    // Verify ownership
    if ((doc as any).user_email !== session.user.email) {
      return NextResponse.json({ error: "Not authorized to send this draft" }, { status: 403 })
    }

    // Check if already sent or cancelled
    if ((doc as any).status !== 'pending') {
      return NextResponse.json({ error: `Draft is already ${(doc as any).status}` }, { status: 400 })
    }

    // Parse recipients, attachments, and csv_data
    const recipients = typeof (doc as any).recipients === 'string'
      ? JSON.parse((doc as any).recipients)
      : (doc as any).recipients || []

    const attachments = (doc as any).attachments
      ? (typeof (doc as any).attachments === 'string'
        ? JSON.parse((doc as any).attachments)
        : (doc as any).attachments)
      : []

    // Parse csv_data for personalization
    let csvData: Record<string, string>[] = []
    if ((doc as any).csv_data) {
      try {
        csvData = typeof (doc as any).csv_data === 'string'
          ? JSON.parse((doc as any).csv_data)
          : (doc as any).csv_data
      } catch (e) {
        console.error("Error parsing csv_data:", e)
      }
    }

    // Update status to sending
    await databases.updateDocument(
      config.databaseId,
      config.draftEmailsCollectionId,
      draftId,
      { status: 'sending' }
    )

    const results: { email: string; status: string; error?: string }[] = []
    let successCount = 0
    let failedCount = 0

    // Pre-resolve attachments ONCE before the send loop
    let resolvedAttachments: any[] = []
    if (attachments && attachments.length > 0) {
      console.log(`📦 Pre-resolving ${attachments.length} attachments before sending draft...`)
      try {
        const attachmentData = attachments.map((a: any) => ({
          name: a.fileName,
          type: 'application/octet-stream',
          data: 'appwrite',
          appwriteUrl: a.fileUrl,
          appwriteFileId: a.appwrite_file_id,
        }))
        resolvedAttachments = await preResolveAttachments(attachmentData)
        console.log(`✅ Draft attachments pre-resolved successfully`)
      } catch (error) {
        console.error('❌ Failed to pre-resolve draft attachments:', error)
        // Update status back to pending so user can retry
        await databases.updateDocument(
          config.databaseId,
          config.draftEmailsCollectionId,
          draftId,
          { status: 'pending', error: 'Failed to process attachments' }
        )
        return NextResponse.json({ 
          error: "Failed to process attachments",
          details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 })
      }
    }

    // Send emails with personalization
    for (let i = 0; i < recipients.length; i++) {
      const recipientEmail = recipients[i]
      
      // Get personalization data for this recipient (case-insensitive matching)
      let recipientData: Record<string, string> = { email: recipientEmail }
      const csvRow = csvData.find((row: Record<string, string>) => {
        const rowEmail = row.email || row.Email || row.EMAIL || ''
        return rowEmail.toLowerCase() === recipientEmail.toLowerCase()
      })
      if (csvRow) {
        // Normalize keys to lowercase for consistent placeholder matching
        recipientData = Object.entries(csvRow).reduce((acc, [key, value]) => {
          acc[key.toLowerCase()] = String(value)
          acc[key] = String(value) // Keep original case too
          return acc
        }, {} as Record<string, string>)
      }

      // Personalize subject and content
      const personalizedSubject = replacePlaceholders((doc as any).subject, recipientData)
      const personalizedContent = replacePlaceholders((doc as any).content, recipientData)
      
      try {
        await sendEmailViaAPI(
          session.accessToken,
          recipientEmail,
          personalizedSubject,
          personalizedContent,
          resolvedAttachments // Use pre-resolved attachments
        )

        results.push({ email: recipientEmail, status: 'success' })
        successCount++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        results.push({ email: recipientEmail, status: 'error', error: errorMessage })
        failedCount++
      }

      // Wait between emails to avoid rate limiting
      if (i < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Update final status
    const finalStatus = failedCount === recipients.length ? 'failed' : 'sent'
    await databases.updateDocument(
      config.databaseId,
      config.draftEmailsCollectionId,
      draftId,
      {
        status: finalStatus,
        sent_at: new Date().toISOString(),
        error: failedCount > 0 ? `${failedCount} of ${recipients.length} emails failed` : null,
      }
    )

    // Clear attachment cache after sending
    clearAttachmentCache()

    // Also save to campaigns collection for history
    await databases.createDocument(
      config.databaseId,
      config.campaignsCollectionId,
      crypto.randomUUID(),
      {
        subject: (doc as any).subject,
        content: (doc as any).content,
        recipients: JSON.stringify(recipients),
        sent: successCount,
        failed: failedCount,
        status: 'completed',
        user_email: session.user.email,
        campaign_type: 'draft',
        attachments: (doc as any).attachments,
        send_results: JSON.stringify(results),
        created_at: new Date().toISOString(),
      }
    )

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: recipients.length,
        sent: successCount,
        failed: failedCount,
      }
    })
  } catch (error) {
    console.error("Send draft error:", error)
    return NextResponse.json({ error: "Failed to send draft" }, { status: 500 })
  }
}
