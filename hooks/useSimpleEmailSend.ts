import { useState, useCallback, useRef, useEffect } from 'react'

interface EmailResult {
  email: string
  status: "success" | "error" | "skipped" | "cancelled"
  error?: string
  retryCount?: number
  index?: number
}

interface SendStatus {
  email: string
  status: "pending" | "success" | "error" | "skipped" | "retrying" | "cancelled"
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

interface CampaignState {
  campaignId: string
  emails: any[]
  sentIndices: number[]
  failedIndices: number[]
  status: 'in-progress' | 'paused' | 'completed' | 'cancelled'
  startedAt: string
  subject?: string
}

interface UseSimpleEmailSendResult {
  sendEmails: (personalizedEmails: any[], campaignSubject?: string) => Promise<EmailResult[]>
  retryFailedEmails: () => Promise<EmailResult[]>
  stopSending: () => void
  resumeCampaign: () => Promise<EmailResult[]>
  clearSavedCampaign: () => void
  progress: EmailProgress
  sendStatus: SendStatus[]
  isLoading: boolean
  isStopping: boolean
  error: string | null
  failedEmails: any[]
  hasPendingRetries: boolean
  stoppedDueToError: boolean
  hasSavedCampaign: boolean
  savedCampaignInfo: { subject?: string, remaining: number, total: number } | null
}

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000
const BETWEEN_EMAILS_DELAY_MS = 1000
const CAMPAIGN_STATE_KEY = 'echomail_campaign_state'
const CAMPAIGN_LOCK_KEY = 'echomail_campaign_lock'

/**
 * Simple email sending hook with retry logic, stop/resume, and persistence.
 * - Retries failed emails up to 3 times
 * - Stops on persistent errors or user request
 * - Saves progress to localStorage for resume
 * - Prevents duplicate sends with lock mechanism
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
  const [isStopping, setIsStopping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [failedEmails, setFailedEmails] = useState<any[]>([])
  const [stoppedDueToError, setStoppedDueToError] = useState(false)
  const [hasSavedCampaign, setHasSavedCampaign] = useState(false)
  const [savedCampaignInfo, setSavedCampaignInfo] = useState<{ subject?: string, remaining: number, total: number } | null>(null)
  
  const remainingEmailsRef = useRef<any[]>([])
  const shouldStopRef = useRef(false)
  const campaignIdRef = useRef<string>('')
  const allEmailsRef = useRef<any[]>([])

  // Check for saved campaign on mount
  useEffect(() => {
    checkSavedCampaign()
  }, [])

  const checkSavedCampaign = () => {
    try {
      const saved = localStorage.getItem(CAMPAIGN_STATE_KEY)
      if (saved) {
        const state: CampaignState = JSON.parse(saved)
        if (state.status === 'in-progress' || state.status === 'paused') {
          const remaining = state.emails.length - state.sentIndices.length
          setHasSavedCampaign(true)
          setSavedCampaignInfo({
            subject: state.subject,
            remaining,
            total: state.emails.length
          })
        }
      }
    } catch (e) {
      console.error('Error checking saved campaign:', e)
    }
  }

  const generateCampaignId = () => {
    return `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  const getTabId = (): string => {
    if (typeof window === 'undefined') return 'server'
    
    let tabId = sessionStorage.getItem('echomail_tab_id')
    if (!tabId) {
      tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('echomail_tab_id', tabId)
    }
    return tabId
  }

  const acquireLock = (): boolean => {
    try {
      const existingLock = localStorage.getItem(CAMPAIGN_LOCK_KEY)
      if (existingLock) {
        const lock = JSON.parse(existingLock)
        // Lock expires after 5 minutes of inactivity
        if (Date.now() - lock.timestamp < 5 * 60 * 1000) {
          if (lock.tabId !== getTabId()) {
            return false // Another tab is sending
          }
        }
      }
      
      localStorage.setItem(CAMPAIGN_LOCK_KEY, JSON.stringify({
        tabId: getTabId(),
        timestamp: Date.now()
      }))
      return true
    } catch (e) {
      console.error('Error acquiring lock:', e)
      return true // Proceed anyway if localStorage fails
    }
  }

  const releaseLock = () => {
    try {
      const existingLock = localStorage.getItem(CAMPAIGN_LOCK_KEY)
      if (existingLock) {
        const lock = JSON.parse(existingLock)
        if (lock.tabId === getTabId()) {
          localStorage.removeItem(CAMPAIGN_LOCK_KEY)
        }
      }
    } catch (e) {
      console.error('Error releasing lock:', e)
    }
  }

  const refreshLock = () => {
    try {
      localStorage.setItem(CAMPAIGN_LOCK_KEY, JSON.stringify({
        tabId: getTabId(),
        timestamp: Date.now()
      }))
    } catch (e) {
      console.error('Error refreshing lock:', e)
    }
  }

  const saveCampaignState = (state: CampaignState) => {
    try {
      localStorage.setItem(CAMPAIGN_STATE_KEY, JSON.stringify(state))
    } catch (e) {
      console.error('Error saving campaign state:', e)
    }
  }

  const clearCampaignState = () => {
    try {
      localStorage.removeItem(CAMPAIGN_STATE_KEY)
      setHasSavedCampaign(false)
      setSavedCampaignInfo(null)
    } catch (e) {
      console.error('Error clearing campaign state:', e)
    }
  }

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
      // Check if stop was requested
      if (shouldStopRef.current) {
        return { email: email.to, status: "cancelled", error: "Cancelled by user", index }
      }

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

        // Refresh lock periodically
        refreshLock()

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
          return { email: email.to, status: "success", retryCount: attempt, index }
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
    
    return { email: email.to, status: "error", error: lastError, retryCount: MAX_RETRIES, index }
  }

  const stopSending = useCallback(() => {
    shouldStopRef.current = true
    setIsStopping(true)
    setProgress(prev => ({
      ...prev,
      status: '⏸️ Stopping... Please wait for current email to complete'
    }))
  }, [])

  const clearSavedCampaign = useCallback(() => {
    clearCampaignState()
    releaseLock()
  }, [])

  const sendEmails = useCallback(async (personalizedEmails: any[], campaignSubject?: string): Promise<EmailResult[]> => {
    // Check for duplicate sends
    if (!acquireLock()) {
      setError("Another campaign is already running in a different tab. Please wait or close the other tab.")
      return []
    }

    shouldStopRef.current = false
    setIsStopping(false)
    setIsLoading(true)
    setError(null)
    setFailedEmails([])
    setStoppedDueToError(false)
    remainingEmailsRef.current = []
    allEmailsRef.current = personalizedEmails
    
    const campaignId = generateCampaignId()
    campaignIdRef.current = campaignId
    
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

    // Initialize campaign state
    const campaignState: CampaignState = {
      campaignId,
      emails: personalizedEmails,
      sentIndices: [],
      failedIndices: [],
      status: 'in-progress',
      startedAt: new Date().toISOString(),
      subject: campaignSubject
    }
    saveCampaignState(campaignState)

    const results: EmailResult[] = []

    try {
      for (let i = 0; i < personalizedEmails.length; i++) {
        // Check if stop was requested
        if (shouldStopRef.current) {
          const remainingEmails = personalizedEmails.slice(i)
          remainingEmailsRef.current = remainingEmails
          
          // Mark remaining as cancelled
          for (let j = 0; j < remainingEmails.length; j++) {
            const remainingEmail = remainingEmails[j]
            const remainingIndex = i + j
            results.push({ 
              email: remainingEmail.to, 
              status: "cancelled", 
              error: "Cancelled by user",
              index: remainingIndex
            })
            setSendStatus(prev => prev.map(s => 
              s.index === remainingIndex ? { 
                ...s, 
                status: "cancelled" as const,
                error: "Cancelled by user"
              } : s
            ))
          }
          
          // Update campaign state
          campaignState.status = 'paused'
          campaignState.failedIndices = results
            .filter(r => r.status === 'error' || r.status === 'cancelled')
            .map(r => r.index!)
          saveCampaignState(campaignState)
          
          setProgress(prev => ({
            ...prev,
            status: `⏸️ Stopped! ${results.filter(r => r.status === "success").length} sent, ${remainingEmails.length} cancelled`
          }))
          
          setHasSavedCampaign(true)
          setSavedCampaignInfo({
            subject: campaignSubject,
            remaining: remainingEmails.length,
            total: totalEmails
          })
          
          break
        }

        const email = personalizedEmails[i]
        
        setProgress({
          currentEmail: i + 1,
          totalEmails,
          percentage: Math.round(((i + 1) / totalEmails) * 100),
          status: `Sending ${i + 1}/${totalEmails}: ${email.to}`
        })

        const result = await sendSingleEmailWithRetry(email, i)
        results.push({ ...result, index: i })
        
        // Update campaign state
        if (result.status === 'success') {
          campaignState.sentIndices.push(i)
        } else {
          campaignState.failedIndices.push(i)
        }
        saveCampaignState(campaignState)
        
        setSendStatus(prev => prev.map(s => 
          s.index === i ? { 
            ...s, 
            status: result.status as SendStatus['status'],
            error: result.error,
            retryCount: result.retryCount
          } : s
        ))

        // Check if we stopped due to user request
        if (result.status === 'cancelled') {
          continue // Already handled above
        }

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
          
          // Update campaign state
          campaignState.status = 'paused'
          saveCampaignState(campaignState)
          
          setStoppedDueToError(true)
          setError(`Campaign stopped: ${result.error}. ${remainingEmails.length} emails were not sent.`)
          
          setProgress(prev => ({
            ...prev,
            status: `⚠️ Stopped! ${results.filter(r => r.status === "success").length} sent, 1 failed, ${remainingEmails.length} skipped`
          }))
          
          setHasSavedCampaign(true)
          setSavedCampaignInfo({
            subject: campaignSubject,
            remaining: remainingEmails.length + 1,
            total: totalEmails
          })
          
          break
        }

        if (i < personalizedEmails.length - 1) {
          await new Promise(resolve => setTimeout(resolve, BETWEEN_EMAILS_DELAY_MS))
        }
      }

      // Check if completed successfully
      const successCount = results.filter(r => r.status === 'success').length
      const errorCount = results.filter(r => r.status === 'error').length
      const allProcessed = !shouldStopRef.current && results.length === personalizedEmails.length
      
      if (allProcessed && errorCount === 0) {
        // All sent successfully - clear saved state
        campaignState.status = 'completed'
        saveCampaignState(campaignState)
        clearCampaignState()
        
        setProgress(prev => ({
          ...prev,
          status: `✅ Done! ${successCount} emails sent successfully`
        }))
      }

      return results
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      setProgress(prev => ({ ...prev, status: `Error: ${errorMessage}` }))
      
      // Save state for resume
      campaignState.status = 'paused'
      saveCampaignState(campaignState)
      
      throw err
    } finally {
      setIsLoading(false)
      setIsStopping(false)
      shouldStopRef.current = false
      releaseLock()
    }
  }, [])

  const resumeCampaign = useCallback(async (): Promise<EmailResult[]> => {
    try {
      const saved = localStorage.getItem(CAMPAIGN_STATE_KEY)
      if (!saved) {
        setError("No saved campaign to resume")
        return []
      }

      const state: CampaignState = JSON.parse(saved)
      
      if (state.status !== 'in-progress' && state.status !== 'paused') {
        setError("Campaign already completed")
        return []
      }

      // Get emails that weren't sent
      const unsentIndices = state.emails
        .map((_, i) => i)
        .filter(i => !state.sentIndices.includes(i))
      
      const emailsToSend = unsentIndices.map(i => state.emails[i])
      
      if (emailsToSend.length === 0) {
        clearCampaignState()
        return []
      }

      return sendEmails(emailsToSend, state.subject)
    } catch (e) {
      console.error('Error resuming campaign:', e)
      setError("Failed to resume campaign")
      return []
    }
  }, [sendEmails])

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
    stopSending,
    resumeCampaign,
    clearSavedCampaign,
    progress,
    sendStatus,
    isLoading,
    isStopping,
    error,
    failedEmails,
    hasPendingRetries: failedEmails.length > 0,
    stoppedDueToError,
    hasSavedCampaign,
    savedCampaignInfo
  }
}
