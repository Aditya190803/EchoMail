import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendEmailViaAPI, replacePlaceholders, preResolveAttachments, clearAttachmentCache, preBuildEmailTemplate, sendEmailWithTemplate } from "@/lib/gmail"
import { databases, config, Query } from "@/lib/appwrite-server"

/**
 * API endpoint to send a draft email immediately
 */

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { draftEmailId } = await request.json()

    if (!draftEmailId) {
      return NextResponse.json({ error: "Missing draftEmailId" }, { status: 400 })
    }

    // Get the draft email
    const doc = await databases.getDocument(
      config.databaseId,
      config.draftEmailsCollectionId,
      draftEmailId
    )

    // Verify ownership
    if ((doc as any).user_email !== session.user.email) {
      return NextResponse.json({ error: "Not authorized to send this email" }, { status: 403 })
    }

    // Check if already sent or cancelled
    if ((doc as any).status !== 'pending') {
      return NextResponse.json({ error: `Email is already ${(doc as any).status}` }, { status: 400 })
    }

    // Parse recipients and attachments
    const recipients = typeof (doc as any).recipients === 'string'
      ? JSON.parse((doc as any).recipients)
      : (doc as any).recipients || []

    const attachments = (doc as any).attachments
      ? (typeof (doc as any).attachments === 'string'
        ? JSON.parse((doc as any).attachments)
        : (doc as any).attachments)
      : []

    // Update status to sending
    await databases.updateDocument(
      config.databaseId,
      config.draftEmailsCollectionId,
      draftEmailId,
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
          draftEmailId,
          { status: 'pending', error: 'Failed to process attachments' }
        )
        return NextResponse.json({ 
          error: "Failed to process attachments",
          details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 })
      }
    }

    // Use optimized template-based sending for bulk emails (no personalization in this endpoint)
    if (recipients.length > 1) {
      console.log(`🚀 Using optimized template-based bulk sending (${recipients.length} recipients)`)
      
      try {
        // Pre-build the email template ONCE
        await preBuildEmailTemplate(
          session.accessToken,
          (doc as any).subject,
          (doc as any).content,
          resolvedAttachments
        )
        
        // Send to each recipient using the cached template (FAST)
        for (let i = 0; i < recipients.length; i++) {
          const recipientEmail = recipients[i]
          
          try {
            await sendEmailWithTemplate(session.accessToken, recipientEmail)
            results.push({ email: recipientEmail, status: 'success' })
            successCount++
            console.log(`✅ Sent ${i + 1}/${recipients.length} to ${recipientEmail}`)
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
      } catch (error) {
        console.error('❌ Failed to build email template:', error)
        await databases.updateDocument(
          config.databaseId,
          config.draftEmailsCollectionId,
          draftEmailId,
          { status: 'pending', error: 'Failed to build email template' }
        )
        return NextResponse.json({ 
          error: "Failed to build email template",
          details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 })
      }
    } else {
      // Single recipient - use standard method
      for (let i = 0; i < recipients.length; i++) {
        const recipientEmail = recipients[i]
        
        try {
          await sendEmailViaAPI(
            session.accessToken,
            recipientEmail,
            (doc as any).subject,
            (doc as any).content,
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
    }

    // Update final status
    const finalStatus = failedCount === recipients.length ? 'failed' : 'sent'
    await databases.updateDocument(
      config.databaseId,
      config.draftEmailsCollectionId,
      draftEmailId,
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
    console.error("Send draft email error:", error)
    return NextResponse.json({ error: "Failed to send draft email" }, { status: 500 })
  }
}
