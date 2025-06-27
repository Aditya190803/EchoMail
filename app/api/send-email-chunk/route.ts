import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendEmailViaAPI, replacePlaceholders } from "@/lib/gmail"

// App Router configuration for larger request bodies
export const maxDuration = 60 // 60 seconds max duration
export const dynamic = 'force-dynamic'

// Global progress tracking (shared with send-email-batch)
declare global {
  var emailProgress: Map<string, {
    total: number
    sent: number
    failed: number
    status: 'sending' | 'completed' | 'error' | 'paused'
    startTime: number
    lastUpdate: number
  }>
  var emailRateLimitState: {
    isPaused: boolean
    pauseStartTime: number
    pauseDuration: number
    pauseReason?: string
  }
}

if (!global.emailProgress) {
  global.emailProgress = new Map()
}

if (!global.emailRateLimitState) {
  global.emailRateLimitState = {
    isPaused: false,
    pauseStartTime: 0,
    pauseDuration: 300000, // 5 minutes default pause
    pauseReason: undefined
  }
}

// Global pause management functions
function triggerGlobalPause(reason: string, durationMs: number = 300000) {
  console.log(`🚨 TRIGGERING GLOBAL EMAIL PAUSE: ${reason} for ${durationMs/1000}s`)
  global.emailRateLimitState.isPaused = true
  global.emailRateLimitState.pauseStartTime = Date.now()
  global.emailRateLimitState.pauseDuration = durationMs
  global.emailRateLimitState.pauseReason = reason
  
  // Mark all active campaigns as paused
  for (const [campaignId, progress] of global.emailProgress.entries()) {
    if (progress.status === 'sending') {
      progress.status = 'paused'
      progress.lastUpdate = Date.now()
      global.emailProgress.set(campaignId, progress)
    }
  }
}

function checkGlobalPause(): boolean {
  if (!global.emailRateLimitState.isPaused) {
    return false
  }
  
  const now = Date.now()
  const pauseEndTime = global.emailRateLimitState.pauseStartTime + global.emailRateLimitState.pauseDuration
  
  if (now >= pauseEndTime) {
    console.log(`✅ GLOBAL EMAIL PAUSE LIFTED after ${(now - global.emailRateLimitState.pauseStartTime)/1000}s`)
    global.emailRateLimitState.isPaused = false
    global.emailRateLimitState.pauseReason = undefined
    
    // Resume all paused campaigns
    for (const [campaignId, progress] of global.emailProgress.entries()) {
      if (progress.status === 'paused') {
        progress.status = 'sending'
        progress.lastUpdate = Date.now()
        global.emailProgress.set(campaignId, progress)
      }
    }
    return false
  }
  
  const remainingTime = pauseEndTime - now
  console.log(`⏸️ GLOBAL EMAIL PAUSE ACTIVE: ${global.emailRateLimitState.pauseReason} - ${Math.ceil(remainingTime/1000)}s remaining`)
  return true
}

async function waitForGlobalPauseToLift(): Promise<void> {
  while (checkGlobalPause()) {
    console.log(`⏳ Waiting for global pause to lift...`)
    await new Promise(resolve => setTimeout(resolve, 5000)) // Check every 5 seconds
  }
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

    // Parse request with size monitoring
    let requestData
    try {
      const requestText = await request.text()
      const requestSizeKB = (requestText.length / 1024).toFixed(2)
      console.log(`📦 Incoming request size: ${requestSizeKB} KB`)
      
      // Check if request is too large
      if (requestText.length > 200000) { // ~200KB limit
        console.error(`Request too large: ${requestSizeKB} KB`)
        return NextResponse.json({ 
          error: "Request payload too large. Please reduce the number of emails per chunk or message content length.",
          sizeKB: requestSizeKB,
          maxSizeKB: "200"
        }, { status: 413 })
      }
      
      requestData = JSON.parse(requestText)
    } catch (error) {
      console.error('Failed to parse request JSON:', error)
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
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
    } = requestData
    
    if (!personalizedEmails || !Array.isArray(personalizedEmails) || personalizedEmails.length === 0) {
      return NextResponse.json({ error: "No emails provided" }, { status: 400 })
    }

    // Check for global pause before processing any emails
    if (checkGlobalPause()) {
      console.log(`⏸️ Chunk ${chunkIndex + 1} paused due to global rate limit`)
      return NextResponse.json({ 
        error: "Email sending temporarily paused due to rate limits",
        isPaused: true,
        pauseReason: global.emailRateLimitState.pauseReason,
        pauseTimeRemaining: (global.emailRateLimitState.pauseStartTime + global.emailRateLimitState.pauseDuration) - Date.now()
      }, { status: 429 })
    }

    // Log request size for debugging
    const requestSize = JSON.stringify(requestData).length
    console.log(`📧 Processing chunk ${chunkIndex + 1}/${totalChunks} with ${personalizedEmails.length} emails`)
    console.log(`📦 Request payload size: ${(requestSize / 1024).toFixed(2)} KB`)

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

    // Ultra-conservative settings to avoid payload size limits and timeouts
    const BATCH_SIZE = 1 // Process one email at a time within chunks
    const ATTACHMENT_BATCH_SIZE = 1 // Process attachment emails one at a time
    const BATCH_DELAY = 4000 // 4 seconds between micro-batches (reduced from 8s)
    const RETRY_ATTEMPTS = 2 // Reduce retries to avoid timeouts
    const RETRY_DELAY = 2000 // Reduced retry delay
    const RATE_LIMIT_DELAY = 60000 // 1 minute delay for rate limit errors

    // Helper function to check if emails have attachments
    const hasAttachments = (email: any) => email.attachments && email.attachments.length > 0

    // Separate emails with and without attachments
    const emailsWithAttachments = personalizedEmails.filter(hasAttachments)
    const emailsWithoutAttachments = personalizedEmails.filter(email => !hasAttachments(email))

    console.log(`Chunk ${chunkIndex + 1}: ${emailsWithAttachments.length} with attachments, ${emailsWithoutAttachments.length} without`)

    // Process emails in micro-batches within this chunk
    async function processBatch(emailBatch: any[], batchIndex: number, batchType: string) {
      // Check for global pause before processing each batch
      if (checkGlobalPause()) {
        console.log(`⏸️ Skipping ${batchType} micro-batch ${batchIndex + 1} due to global pause`)
        // Create error results for all emails in this batch
        const pausedResults = emailBatch.map(email => ({
          email: email.to,
          status: "error" as const,
          error: "Batch skipped due to global rate limit pause",
        }))
        
        // Add to main results and update progress
        results.push(...pausedResults)
        updateProgress()
        
        return pausedResults
      }
      
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
            const errorMessage = lastError.message
            
            // Check if this is a Gmail rate limit error (429)
            const isRateLimit = errorMessage.includes('429') || errorMessage.includes('rate limit') || errorMessage.includes('rateLimitExceeded')
            
            console.error(`❌ Chunk ${chunkIndex + 1}: Failed to send to ${email.to} (attempt ${attempt}/${RETRY_ATTEMPTS}):`, errorMessage)
            
            if (attempt < RETRY_ATTEMPTS) {
              if (isRateLimit) {
                // Trigger global pause on first rate limit hit
                triggerGlobalPause(`Gmail rate limit hit during chunk ${chunkIndex + 1}`, 300000) // 5 minutes
                
                // Return early with pause status - don't continue processing this chunk
                console.log(`🚨 Triggering global pause due to rate limit, stopping chunk ${chunkIndex + 1}`)
                return {
                  email: email.to,
                  status: "error" as const,
                  error: "Rate limit hit - global pause triggered",
                }
              } else {
                // Use exponential backoff for other errors
                const delay = RETRY_DELAY * Math.pow(2, attempt - 1)
                console.log(`⏳ Waiting ${delay / 1000}s before retry...`)
                await new Promise(resolve => setTimeout(resolve, delay))
              }
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
      
      return batchResults
    }

    // Process emails with attachments first (very small batches)
    if (emailsWithAttachments.length > 0) {
      console.log(`📎 Chunk ${chunkIndex + 1}: Processing ${emailsWithAttachments.length} emails with attachments`)
      
      for (let i = 0; i < emailsWithAttachments.length; i += ATTACHMENT_BATCH_SIZE) {
        const batch = emailsWithAttachments.slice(i, i + ATTACHMENT_BATCH_SIZE)
        const batchIndex = Math.floor(i / ATTACHMENT_BATCH_SIZE)
        
        const batchResults = await processBatch(batch, batchIndex, "attachment")
        
        // If the batch was skipped due to global pause, stop processing
        if (batchResults.every(r => r.error?.includes("global rate limit pause"))) {
          console.log(`🚨 Stopping attachment processing due to global pause`)
          break
        }
        
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
        
        const batchResults = await processBatch(batch, batchIndex, "regular")
        
        // If the batch was skipped due to global pause, stop processing
        if (batchResults.every(r => r.error?.includes("global rate limit pause"))) {
          console.log(`🚨 Stopping regular email processing due to global pause`)
          break
        }
        
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
