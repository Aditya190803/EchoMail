import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendEmailViaAPI, replacePlaceholders } from "@/lib/gmail"

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

    // Enhanced batch configuration for better reliability
    const BATCH_SIZE = 6 // Smaller batches for better stability
    const ATTACHMENT_BATCH_SIZE = 3 // Even smaller for emails with attachments
    const BATCH_DELAY = 4000 // 4 seconds between batches for rate limiting
    const RETRY_ATTEMPTS = 3
    const RETRY_DELAY = 2000 // 2 seconds between retries

    // Helper function to check if emails have attachments
    const hasAttachments = (email: any) => email.attachments && email.attachments.length > 0

    // Separate emails with and without attachments for different batch sizes
    const emailsWithAttachments = personalizedEmails.filter(hasAttachments)
    const emailsWithoutAttachments = personalizedEmails.filter(email => !hasAttachments(email))

    console.log(`Processing ${personalizedEmails.length} emails: ${emailsWithAttachments.length} with attachments, ${emailsWithoutAttachments.length} without`)

    // Process emails in batches
    async function processBatch(emailBatch: any[], batchIndex: number, batchType: string) {
      console.log(`Processing ${batchType} batch ${batchIndex + 1} with ${emailBatch.length} emails`)
      
      const batchPromises = emailBatch.map(async (email, emailIndex) => {
        let lastError: Error | null = null
        
        for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
          try {
            console.log(`Processing email ${emailIndex + 1}/${emailBatch.length} in ${batchType} batch ${batchIndex + 1} (attempt ${attempt}):`, {
              to: email.to,
              hasAttachments: hasAttachments(email),
              attachmentCount: email.attachments?.length || 0
            })

            const personalizedSubject = replacePlaceholders(email.subject, email.originalRowData)
            const personalizedMessage = replacePlaceholders(email.message, email.originalRowData)

            await sendEmailViaAPI(
              session!.accessToken!,
              email.to,
              personalizedSubject,
              personalizedMessage,
              email.attachments,
            )

            console.log(`✅ Successfully sent email to ${email.to}`)

            return {
              email: email.to,
              status: "success" as const,
            }
          } catch (error) {
            lastError = error instanceof Error ? error : new Error("Unknown error")
            console.error(`❌ Failed to send email to ${email.to} (attempt ${attempt}/${RETRY_ATTEMPTS}):`, lastError.message)
            
            if (attempt < RETRY_ATTEMPTS) {
              console.log(`⏳ Retrying email to ${email.to} in ${RETRY_DELAY}ms...`)
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
            }
          }
        }

        console.log(`💥 All retry attempts failed for ${email.to}`)
        return {
          email: email.to,
          status: "error" as const,
          error: lastError?.message || "Unknown error",
        }
      })

      // Wait for all emails in this batch to complete
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
      
      const successCount = batchResults.filter(r => r.status === "success").length
      console.log(`✅ Completed ${batchType} batch ${batchIndex + 1}: ${successCount}/${batchResults.length} successful`)
    }

    // Process emails with attachments first (smaller batches)
    if (emailsWithAttachments.length > 0) {
      console.log(`📎 Processing ${emailsWithAttachments.length} emails with attachments in batches of ${ATTACHMENT_BATCH_SIZE}`)
      
      for (let i = 0; i < emailsWithAttachments.length; i += ATTACHMENT_BATCH_SIZE) {
        const batch = emailsWithAttachments.slice(i, i + ATTACHMENT_BATCH_SIZE)
        const batchIndex = Math.floor(i / ATTACHMENT_BATCH_SIZE)
        
        await processBatch(batch, batchIndex, "attachment")
        
        // Add delay between batches if there are more batches to process
        if (i + ATTACHMENT_BATCH_SIZE < emailsWithAttachments.length) {
          console.log(`⏳ Waiting ${BATCH_DELAY}ms before next attachment batch...`)
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
        }
      }
      
      // Add extra delay before processing regular emails
      if (emailsWithoutAttachments.length > 0) {
        console.log(`⏳ Waiting ${BATCH_DELAY}ms before processing emails without attachments...`)
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
      }
    }

    // Process emails without attachments (regular batch size)
    if (emailsWithoutAttachments.length > 0) {
      console.log(`📧 Processing ${emailsWithoutAttachments.length} emails without attachments in batches of ${BATCH_SIZE}`)
      
      for (let i = 0; i < emailsWithoutAttachments.length; i += BATCH_SIZE) {
        const batch = emailsWithoutAttachments.slice(i, i + BATCH_SIZE)
        const batchIndex = Math.floor(i / BATCH_SIZE)
        
        await processBatch(batch, batchIndex, "regular")
        
        // Add delay between batches if there are more batches to process
        if (i + BATCH_SIZE < emailsWithoutAttachments.length) {
          console.log(`⏳ Waiting ${BATCH_DELAY}ms before next regular batch...`)
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
        }
      }
    }

    const successCount = results.filter(r => r.status === "success").length
    const failedCount = results.filter(r => r.status === "error").length
    
    console.log(`🎉 Email batch processing complete: ${successCount} sent, ${failedCount} failed out of ${personalizedEmails.length} total`)

    return NextResponse.json({ 
      results,
      summary: {
        total: personalizedEmails.length,
        sent: successCount,
        failed: failedCount,
        batched: true,
        batchInfo: {
          attachmentEmails: emailsWithAttachments.length,
          regularEmails: emailsWithoutAttachments.length,
          attachmentBatchSize: ATTACHMENT_BATCH_SIZE,
          regularBatchSize: BATCH_SIZE,
          batchDelay: BATCH_DELAY
        }
      }
    })
  } catch (error) {
    console.error("Send email batch API error:", error)
    return NextResponse.json({ error: "Failed to process email request" }, { status: 500 })
  }
}
