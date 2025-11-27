import { useState, useCallback, useRef } from 'react'

interface EmailResult {
  email: string
  status: "success" | "error" | "skipped"
  error?: string
  retryCount?: number
  index?: number
}

interface SendStatus {
  email: string
  status: "pending" | "success" | "error" | "skipped" | "retrying"
  error?: string
  retryCount?: number
  index: number
}

interface EmailProgress {
  currentEmail: number
  totalEmails: number
  percentage: number
  status: string
}

interface QuotaInfo {
  dailyLimit: number
  estimatedUsed: number
  estimatedRemaining: number
  lastUpdated: Date | null
}

interface SendOptions {
  delayBetweenEmails?: number // milliseconds
}

interface UseEmailSendResult {
  sendEmails: (personalizedEmails: any[], options?: SendOptions) => Promise<EmailResult[]>
  retryFailedEmails: () => Promise<EmailResult[]>
  progress: EmailProgress
  sendStatus: SendStatus[]
  isLoading: boolean
  error: string | null
  failedEmails: any[]
  hasPendingRetries: boolean
  stoppedDueToError: boolean
  quotaInfo: QuotaInfo
  updateQuotaUsed: (count: number) => void
  resetDailyQuota: () => void
}

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000 // 2 seconds between retries
const DEFAULT_BETWEEN_EMAILS_DELAY_MS = 1000 // 1 second between different emails

// Gmail API quotas (conservative estimates)
// Free Gmail: ~500 emails/day, Workspace: ~2000/day
const GMAIL_DAILY_LIMIT = 500 // Conservative default for free accounts

// Storage key for quota tracking
const QUOTA_STORAGE_KEY = 'echomail_gmail_quota'

/**
 * Unified email sending hook that sends emails one by one sequentially.
 * Features:
 * - Retries failed emails up to 3 times
 * - Configurable delay between emails to avoid rate limiting
 * - Tracks estimated Gmail quota usage
 * - Stops sending if an email fails after all retries (to avoid wasting quota on rate limits)
 * - Allows users to retry remaining emails later
 */
export function useEmailSend(): UseEmailSendResult {
  const [progress, setProgress] = useState<EmailProgress>({
    currentEmail: 0,
    totalEmails: 0,
    percentage: 0,
    status: ''
  })
  
  const [sendStatus, setSendStatus] = useState<SendStatus[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [failedEmails, setFailedEmails] = useState<any[]>([])
  const [stoppedDueToError, setStoppedDueToError] = useState(false)
  
  // Quota tracking state
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo>(() => {
    // Load quota info from localStorage on init
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(QUOTA_STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          const lastUpdated = new Date(parsed.lastUpdated)
          const now = new Date()
          
          // Reset quota if it's a new day (based on UTC)
          if (lastUpdated.toDateString() !== now.toDateString()) {
            return {
              dailyLimit: GMAIL_DAILY_LIMIT,
              estimatedUsed: 0,
              estimatedRemaining: GMAIL_DAILY_LIMIT,
              lastUpdated: null
            }
          }
          
          return {
            ...parsed,
            lastUpdated: lastUpdated
          }
        }
      } catch (e) {
        console.error('Error loading quota info:', e)
      }
    }
    return {
      dailyLimit: GMAIL_DAILY_LIMIT,
      estimatedUsed: 0,
      estimatedRemaining: GMAIL_DAILY_LIMIT,
      lastUpdated: null
    }
  })
  
  // Store remaining emails for retry
  const remainingEmailsRef = useRef<any[]>([])
  
  // Store current delay setting
  const currentDelayRef = useRef<number>(DEFAULT_BETWEEN_EMAILS_DELAY_MS)

  // Update quota used count
  const updateQuotaUsed = useCallback((count: number) => {
    setQuotaInfo(prev => {
      const newUsed = prev.estimatedUsed + count
      const newRemaining = Math.max(0, prev.dailyLimit - newUsed)
      const updated = {
        ...prev,
        estimatedUsed: newUsed,
        estimatedRemaining: newRemaining,
        lastUpdated: new Date()
      }
      
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(updated))
        } catch (e) {
          console.error('Error saving quota info:', e)
        }
      }
      
      return updated
    })
  }, [])
  
  // Reset daily quota (for manual reset or new day)
  const resetDailyQuota = useCallback(() => {
    const reset = {
      dailyLimit: GMAIL_DAILY_LIMIT,
      estimatedUsed: 0,
      estimatedRemaining: GMAIL_DAILY_LIMIT,
      lastUpdated: null
    }
    setQuotaInfo(reset)
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(QUOTA_STORAGE_KEY)
      } catch (e) {
        console.error('Error clearing quota info:', e)
      }
    }
  }, [])

  // Helper to check if error is retryable
  const isRetryableError = (errorMessage: string): boolean => {
    const nonRetryableErrors = [
      "Session expired",
      "Unauthorized",
      "401",
      "Invalid email",
      "invalid address",
      "Email too large",
      "413",
    ]
    return !nonRetryableErrors.some(e => errorMessage.toLowerCase().includes(e.toLowerCase()))
  }

  // Helper to send a single email with retries
  const sendSingleEmailWithRetry = async (
    email: any, 
    index: number, 
    totalEmails: number
  ): Promise<EmailResult> => {
    let lastError = ""
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Update status to show retry attempt
        if (attempt > 1) {
          setProgress(prev => ({
            ...prev,
            status: `Retrying ${email.to} (attempt ${attempt}/${MAX_RETRIES})...`
          }))
          setSendStatus(prev => prev.map(s => 
            s.index === index ? { ...s, status: "retrying" as const, retryCount: attempt } : s
          ))
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
        }

        console.log(`📧 Sending email to ${email.to} (attempt ${attempt}/${MAX_RETRIES})`)
        
        const payload = {
          to: email.to,
          subject: email.subject,
          message: email.message,
          originalRowData: email.originalRowData || {},
          attachments: email.attachments || []
        }
        
        const response = await fetch('/api/send-single-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (response.ok) {
          console.log(`✅ Email sent successfully to ${email.to}`)
          return { email: email.to, status: "success", retryCount: attempt }
        }
        
        const errorData = await response.json()
        lastError = errorData.userMessage || errorData.error || `HTTP ${response.status}`
        
        // Check if error is non-retryable
        if (!isRetryableError(lastError)) {
          console.log(`❌ Non-retryable error for ${email.to}: ${lastError}`)
          break
        }
        
        console.log(`⚠️ Attempt ${attempt} failed for ${email.to}: ${lastError}`)
        
      } catch (fetchError) {
        lastError = fetchError instanceof Error ? fetchError.message : "Network error"
        
        // Format user-friendly error messages
        if (lastError.includes("Failed to fetch") || lastError.includes("NetworkError")) {
          lastError = "Network error - please check your internet connection"
        }
        
        console.log(`⚠️ Attempt ${attempt} failed for ${email.to}: ${lastError}`)
        
        if (!isRetryableError(lastError)) {
          break
        }
      }
    }
    
    // All retries exhausted or non-retryable error
    return { email: email.to, status: "error", error: lastError, retryCount: MAX_RETRIES }
  }

  const sendEmails = useCallback(async (personalizedEmails: any[], options?: SendOptions): Promise<EmailResult[]> => {
    // Set the delay from options or use default
    const delayBetweenEmails = options?.delayBetweenEmails ?? DEFAULT_BETWEEN_EMAILS_DELAY_MS
    currentDelayRef.current = delayBetweenEmails
    
    setIsLoading(true)
    setError(null)
    setFailedEmails([])
    setStoppedDueToError(false)
    remainingEmailsRef.current = []
    
    const totalEmails = personalizedEmails.length
    console.log(`🚀 Sending ${totalEmails} emails with retry logic (max ${MAX_RETRIES} retries per email, ${delayBetweenEmails}ms delay)`)
    
    // Check quota before starting
    if (quotaInfo.estimatedRemaining < totalEmails) {
      console.warn(`⚠️ Warning: Attempting to send ${totalEmails} emails but only ~${quotaInfo.estimatedRemaining} quota remaining`)
    }
    
    setProgress({
      currentEmail: 0,
      totalEmails,
      percentage: 0,
      status: `Starting to send ${totalEmails} emails (${delayBetweenEmails / 1000}s delay between emails)...`
    })

    // Initialize all emails as pending with unique index
    setSendStatus(personalizedEmails.map((email, index) => ({
      email: email.to,
      status: "pending" as const,
      index
    })))

    const results: EmailResult[] = []
    let successCount = 0

    try {
      for (let i = 0; i < personalizedEmails.length; i++) {
        const email = personalizedEmails[i]
        
        setProgress({
          currentEmail: i + 1,
          totalEmails,
          percentage: Math.round(((i + 1) / totalEmails) * 100),
          status: `Sending ${i + 1}/${totalEmails}: ${email.to}`
        })

        const result = await sendSingleEmailWithRetry(email, i, totalEmails)
        results.push({ ...result, index: i })
        
        // Update quota on success
        if (result.status === "success") {
          successCount++
          updateQuotaUsed(1)
        }
        
        // Update status using index to handle duplicate emails correctly
        setSendStatus(prev => prev.map(s => 
          s.index === i ? { 
            ...s, 
            status: result.status as "success" | "error",
            error: result.error,
            retryCount: result.retryCount
          } : s
        ))

        // If email failed after all retries, stop sending remaining emails
        if (result.status === "error") {
          console.log(`🛑 Stopping email campaign due to persistent error: ${result.error}`)
          
          // Mark remaining emails as skipped
          const remainingEmails = personalizedEmails.slice(i + 1)
          remainingEmailsRef.current = remainingEmails
          setFailedEmails([email, ...remainingEmails])
          
          for (let j = 0; j < remainingEmails.length; j++) {
            const remainingEmail = remainingEmails[j]
            const remainingIndex = i + 1 + j
            results.push({ 
              email: remainingEmail.to, 
              status: "skipped", 
              error: "Skipped due to previous error",
              index: remainingIndex
            })
            setSendStatus(prev => prev.map(s => 
              s.index === remainingIndex ? { 
                ...s, 
                status: "skipped" as const,
                error: "Skipped - campaign stopped due to previous error"
              } : s
            ))
          }
          
          setStoppedDueToError(true)
          setError(`Campaign stopped: ${result.error}. ${remainingEmails.length} emails were not sent. You can retry them later.`)
          
          setProgress(prev => ({
            ...prev,
            status: `⚠️ Stopped! ${results.filter(r => r.status === "success").length} sent, 1 failed, ${remainingEmails.length} skipped`
          }))
          
          break
        }

        // Wait between emails to avoid rate limits (using configurable delay)
        if (i < personalizedEmails.length - 1) {
          setProgress(prev => ({
            ...prev,
            status: `Sent ${i + 1}/${totalEmails}. Waiting ${delayBetweenEmails / 1000}s before next...`
          }))
          await new Promise(resolve => setTimeout(resolve, delayBetweenEmails))
        }
      }

      if (!stoppedDueToError) {
        const sent = results.filter(r => r.status === "success").length
        const failed = results.filter(r => r.status === "error").length
        
        setProgress(prev => ({
          ...prev,
          status: `✅ Done! ${sent} sent, ${failed} failed`
        }))
      }

      return results
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      setProgress(prev => ({ ...prev, status: `Error: ${errorMessage}` }))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [quotaInfo.estimatedRemaining, updateQuotaUsed])

  // Function to retry failed/skipped emails
  const retryFailedEmails = useCallback(async (): Promise<EmailResult[]> => {
    if (failedEmails.length === 0) {
      return []
    }
    
    console.log(`🔄 Retrying ${failedEmails.length} failed/skipped emails...`)
    
    // Reset states
    setStoppedDueToError(false)
    setError(null)
    
    // Use the sendEmails function with failed emails
    const emailsToRetry = [...failedEmails]
    setFailedEmails([])
    
    return sendEmails(emailsToRetry)
  }, [failedEmails, sendEmails])

  return {
    sendEmails,
    retryFailedEmails,
    progress,
    sendStatus,
    isLoading,
    error,
    failedEmails,
    hasPendingRetries: failedEmails.length > 0,
    stoppedDueToError,
    quotaInfo,
    updateQuotaUsed,
    resetDailyQuota
  }
}
