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

interface UseSimpleEmailSendResult {
  sendEmails: (personalizedEmails: any[]) => Promise<EmailResult[]>
  retryFailedEmails: () => Promise<EmailResult[]>
  progress: EmailProgress
  sendStatus: SendStatus[]
  isLoading: boolean
  error: string | null
  failedEmails: any[]
  hasPendingRetries: boolean
  stoppedDueToError: boolean
}

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000
const BETWEEN_EMAILS_DELAY_MS = 1000

/**
 * Simple email sending hook with retry logic.
 * - Retries failed emails up to 3 times
 * - Stops on persistent errors
 * - Allows retry of failed/skipped emails
 */
export function useSimpleEmailSend(): UseSimpleEmailSendResult {
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
  
  const remainingEmailsRef = useRef<any[]>([])

  const isRetryableError = (errorMessage: string): boolean => {
    const nonRetryableErrors = [
      "Session expired", "Unauthorized", "401",
      "Invalid email", "invalid address",
      "Email too large", "413",
    ]
    return !nonRetryableErrors.some(e => errorMessage.toLowerCase().includes(e.toLowerCase()))
  }

  const sendSingleEmailWithRetry = async (email: any, index: number): Promise<EmailResult> => {
    let lastError = ""
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 1) {
          setProgress(prev => ({
            ...prev,
            status: `Retrying ${email.to} (attempt ${attempt}/${MAX_RETRIES})...`
          }))
          setSendStatus(prev => prev.map(s => 
            s.index === index ? { ...s, status: "retrying" as const, retryCount: attempt } : s
          ))
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
        }

        const response = await fetch('/api/send-single-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email.to,
            subject: email.subject,
            message: email.message,
            originalRowData: email.originalRowData || {},
            attachments: email.attachments || []
          }),
        })

        if (response.ok) {
          return { email: email.to, status: "success", retryCount: attempt }
        }
        
        const errorData = await response.json()
        lastError = errorData.userMessage || errorData.error || `HTTP ${response.status}`
        
        if (!isRetryableError(lastError)) break
        
      } catch (fetchError) {
        lastError = fetchError instanceof Error ? fetchError.message : "Network error"
        if (lastError.includes("Failed to fetch")) {
          lastError = "Network error - please check your internet connection"
        }
        if (!isRetryableError(lastError)) break
      }
    }
    
    return { email: email.to, status: "error", error: lastError, retryCount: MAX_RETRIES }
  }

  const sendEmails = useCallback(async (personalizedEmails: any[]): Promise<EmailResult[]> => {
    setIsLoading(true)
    setError(null)
    setFailedEmails([])
    setStoppedDueToError(false)
    remainingEmailsRef.current = []
    
    const totalEmails = personalizedEmails.length
    
    setProgress({
      currentEmail: 0,
      totalEmails,
      percentage: 0,
      status: `Starting to send ${totalEmails} emails...`
    })

    setSendStatus(personalizedEmails.map((email, index) => ({
      email: email.to,
      status: "pending" as const,
      index
    })))

    const results: EmailResult[] = []

    try {
      for (let i = 0; i < personalizedEmails.length; i++) {
        const email = personalizedEmails[i]
        
        setProgress({
          currentEmail: i + 1,
          totalEmails,
          percentage: Math.round(((i + 1) / totalEmails) * 100),
          status: `Sending ${i + 1}/${totalEmails}: ${email.to}`
        })

        const result = await sendSingleEmailWithRetry(email, i)
        results.push({ ...result, index: i })
        
        setSendStatus(prev => prev.map(s => 
          s.index === i ? { 
            ...s, 
            status: result.status as "success" | "error",
            error: result.error,
            retryCount: result.retryCount
          } : s
        ))

        if (result.status === "error") {
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
          setError(`Campaign stopped: ${result.error}. ${remainingEmails.length} emails were not sent.`)
          
          setProgress(prev => ({
            ...prev,
            status: `⚠️ Stopped! ${results.filter(r => r.status === "success").length} sent, 1 failed, ${remainingEmails.length} skipped`
          }))
          
          break
        }

        if (i < personalizedEmails.length - 1) {
          await new Promise(resolve => setTimeout(resolve, BETWEEN_EMAILS_DELAY_MS))
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
  }, [])

  const retryFailedEmails = useCallback(async (): Promise<EmailResult[]> => {
    if (failedEmails.length === 0) return []
    
    setStoppedDueToError(false)
    setError(null)
    
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
    stoppedDueToError
  }
}
