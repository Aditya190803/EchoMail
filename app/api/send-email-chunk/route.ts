import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendEmailViaAPI, replacePlaceholders } from "@/lib/gmail"

// Global progress tracking (shared with send-email-batch)
declare global {
  var emailProgress: Map<string, {
    total: number
    sent: number
    failed: number
    status: 'sending' | 'completed' | 'error'
    startTime: number
    lastUpdate: number
  }>
}

if (!global.emailProgress) {
  global.emailProgress = new Map()
}

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

    const { 
      personalizedEmails, 
      chunkIndex = 0, 
      totalChunks = 1,
      chunkInfo,
      campaignId
    }: { 
      personalizedEmails: PersonalizedEmail[]
      chunkIndex?: number
      totalChunks?: number
      chunkInfo?: {
        totalEmails: number
        startIndex: number
        endIndex: number
      }
      campaignId?: string
    } = await request.json()
    
    if (!personalizedEmails || !Array.isArray(personalizedEmails) || personalizedEmails.length === 0) {
      return NextResponse.json({ error: "No emails provided" }, { status: 400 })
    }

    // Track progress state for this chunk
    let chunkSentSoFar = 0
    let chunkFailedSoFar = 0

    // Update progress if campaignId is provided
    const updateProgress = () => {
      if (campaignId && global.emailProgress.has(campaignId)) {
        const progress = global.emailProgress.get(campaignId)!
        const newChunkSent = results.filter(r => r.status === "success").length
        const newChunkFailed = results.filter(r => r.status === "error").length
        
        // Calculate the difference since last update for this chunk
        const sentDelta = newChunkSent - chunkSentSoFar
        const failedDelta = newChunkFailed - chunkFailedSoFar
        
        console.log('Updating progress - sent delta:', sentDelta, 'failed delta:', failedDelta); // Debug log
        
        // Update cumulative totals
        progress.sent += sentDelta
        progress.failed += failedDelta
        progress.lastUpdate = Date.now()
        global.emailProgress.set(campaignId, progress)
        
        console.log('New progress state:', progress); // Debug log
        
        // Update chunk counters
        chunkSentSoFar = newChunkSent
        chunkFailedSoFar = newChunkFailed
      } else {
        console.log('Cannot update progress - campaignId:', campaignId || 'undefined', 'has progress:', global.emailProgress?.has(campaignId || '')); // Debug log
      }
    }

    console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks} with ${personalizedEmails.length} emails`)
    if (chunkInfo) {
      console.log(`Chunk covers emails ${chunkInfo.startIndex + 1}-${chunkInfo.endIndex + 1} of ${chunkInfo.totalEmails} total`)
    }

    console.log('Chunk API called with campaignId:', campaignId); // Debug log
    console.log('Processing', personalizedEmails?.length, 'emails in this chunk'); // Debug log

    // Initialize or update campaign progress
    if (campaignId) {
      if (!global.emailProgress.has(campaignId)) {
        // Initialize with total campaign size, not just this chunk
        const totalCampaignSize = chunkInfo?.totalEmails || personalizedEmails.length
        console.log('Initializing campaign progress for:', campaignId, 'total:', totalCampaignSize); // Debug log
        global.emailProgress.set(campaignId, {
          total: totalCampaignSize,
          sent: 0,
          failed: 0,
          status: 'sending',
          startTime: Date.now(),
          lastUpdate: Date.now(),
        })
      }
    }

    const results: EmailResult[] = []

    // More aggressive settings for chunk processing
    const BATCH_SIZE = 4 // Smaller batches for reliability
    const ATTACHMENT_BATCH_SIZE = 2 // Very small for emails with attachments
    const BATCH_DELAY = 3000 // 3 seconds between batches
    const RETRY_ATTEMPTS = 2 // Fewer retries to prevent timeouts
    const RETRY_DELAY = 1500

    // Helper function to check if emails have attachments
    const hasAttachments = (email: any) => email.attachments && email.attachments.length > 0

    // Separate emails with and without attachments
    const emailsWithAttachments = personalizedEmails.filter(hasAttachments)
    const emailsWithoutAttachments = personalizedEmails.filter(email => !hasAttachments(email))

    console.log(`Chunk ${chunkIndex + 1}: ${emailsWithAttachments.length} with attachments, ${emailsWithoutAttachments.length} without`)

    // Process emails in micro-batches within this chunk
    async function processBatch(emailBatch: any[], batchIndex: number, batchType: string) {
      console.log(`Processing ${batchType} micro-batch ${batchIndex + 1} with ${emailBatch.length} emails in chunk ${chunkIndex + 1}`)
      
      const batchPromises = emailBatch.map(async (email, emailIndex) => {
        let lastError: Error | null = null
        
        for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
          try {
            const personalizedSubject = replacePlaceholders(email.subject, email.originalRowData)
            const personalizedMessage = replacePlaceholders(email.message, email.originalRowData)

            await sendEmailViaAPI(
              session!.accessToken!,
              email.to,
              personalizedSubject,
              personalizedMessage,
              email.attachments,
            )

            console.log(`✅ Chunk ${chunkIndex + 1}: Successfully sent to ${email.to}`)
            return {
              email: email.to,
              status: "success" as const,
            }
          } catch (error) {
            lastError = error instanceof Error ? error : new Error("Unknown error")
            console.error(`❌ Chunk ${chunkIndex + 1}: Failed to send to ${email.to} (attempt ${attempt}/${RETRY_ATTEMPTS}):`, lastError.message)
            
            if (attempt < RETRY_ATTEMPTS) {
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
            }
          }
        }

        console.log(`💥 Chunk ${chunkIndex + 1}: All attempts failed for ${email.to}`)
        return {
          email: email.to,
          status: "error" as const,
          error: lastError?.message || "Unknown error",
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
      
      // Update progress after each micro-batch
      updateProgress()
      
      const successCount = batchResults.filter(r => r.status === "success").length
      console.log(`✅ Chunk ${chunkIndex + 1} micro-batch ${batchIndex + 1}: ${successCount}/${batchResults.length} successful`)
    }

    // Process emails with attachments first (very small batches)
    if (emailsWithAttachments.length > 0) {
      console.log(`📎 Chunk ${chunkIndex + 1}: Processing ${emailsWithAttachments.length} emails with attachments`)
      
      for (let i = 0; i < emailsWithAttachments.length; i += ATTACHMENT_BATCH_SIZE) {
        const batch = emailsWithAttachments.slice(i, i + ATTACHMENT_BATCH_SIZE)
        const batchIndex = Math.floor(i / ATTACHMENT_BATCH_SIZE)
        
        await processBatch(batch, batchIndex, "attachment")
        
        // Add delay between micro-batches
        if (i + ATTACHMENT_BATCH_SIZE < emailsWithAttachments.length) {
          console.log(`⏳ Chunk ${chunkIndex + 1}: Waiting ${BATCH_DELAY}ms before next attachment micro-batch...`)
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
        }
      }
      
      // Add delay before processing regular emails
      if (emailsWithoutAttachments.length > 0) {
        console.log(`⏳ Chunk ${chunkIndex + 1}: Waiting ${BATCH_DELAY}ms before processing regular emails...`)
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
      }
    }

    // Process emails without attachments
    if (emailsWithoutAttachments.length > 0) {
      console.log(`📧 Chunk ${chunkIndex + 1}: Processing ${emailsWithoutAttachments.length} regular emails`)
      
      for (let i = 0; i < emailsWithoutAttachments.length; i += BATCH_SIZE) {
        const batch = emailsWithoutAttachments.slice(i, i + BATCH_SIZE)
        const batchIndex = Math.floor(i / BATCH_SIZE)
        
        await processBatch(batch, batchIndex, "regular")
        
        // Add delay between micro-batches
        if (i + BATCH_SIZE < emailsWithoutAttachments.length) {
          console.log(`⏳ Chunk ${chunkIndex + 1}: Waiting ${BATCH_DELAY}ms before next regular micro-batch...`)
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
        }
      }
    }

    const successCount = results.filter(r => r.status === "success").length
    const failedCount = results.filter(r => r.status === "error").length
    
    console.log(`🎉 Chunk ${chunkIndex + 1}/${totalChunks} complete: ${successCount} sent, ${failedCount} failed`)

    // Mark campaign as completed if this is the last chunk
    if (campaignId && chunkIndex + 1 === totalChunks) {
      if (global.emailProgress.has(campaignId)) {
        const progress = global.emailProgress.get(campaignId)!
        progress.status = 'completed'
        progress.lastUpdate = Date.now()
        global.emailProgress.set(campaignId, progress)
      }
    }

    return NextResponse.json({ 
      results,
      chunkInfo: {
        chunkIndex,
        totalChunks,
        processed: personalizedEmails.length,
        ...chunkInfo
      },
      summary: {
        sent: successCount,
        failed: failedCount,
        total: personalizedEmails.length
      }
    })
  } catch (error) {
    console.error("Send email chunk API error:", error)
    return NextResponse.json({ error: "Failed to process email chunk" }, { status: 500 })
  }
}
