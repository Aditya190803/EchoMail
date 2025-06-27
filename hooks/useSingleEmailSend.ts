import { useState, useCallback } from 'react'

interface EmailResult {
  email: string
  status: "success" | "error"
  error?: string
}

interface SendStatus {
  email: string
  status: "pending" | "sending" | "success" | "error"
  error?: string
}

interface SingleEmailProgress {
  currentEmail: number
  totalEmails: number
  percentage: number
  status: string
}

interface UseSingleEmailSendResult {
  sendEmailsOneByOne: (personalizedEmails: any[]) => Promise<EmailResult[]>
  progress: SingleEmailProgress
  sendStatus: SendStatus[]
  isLoading: boolean
  error: string | null
}

export function useSingleEmailSend(): UseSingleEmailSendResult {
  const [progress, setProgress] = useState<SingleEmailProgress>({
    currentEmail: 0,
    totalEmails: 0,
    percentage: 0,
    status: ''
  })
  
  const [sendStatus, setSendStatus] = useState<SendStatus[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendEmailsOneByOne = useCallback(async (
    personalizedEmails: any[]
  ): Promise<EmailResult[]> => {
    setIsLoading(true)
    setError(null)
    
    const totalEmails = personalizedEmails.length
    
    console.log(`🚀 Sending ${totalEmails} emails one by one to avoid 413 errors`)
    
    setProgress({
      currentEmail: 0,
      totalEmails,
      percentage: 0,
      status: `Preparing to send ${totalEmails} emails individually...`
    })

    // Initialize send status for all emails
    const initialStatus: SendStatus[] = personalizedEmails.map(email => ({
      email: email.to,
      status: "pending"
    }))
    setSendStatus(initialStatus)

    const results: EmailResult[] = []

    try {
      for (let i = 0; i < personalizedEmails.length; i++) {
        const email = personalizedEmails[i]
        
        setProgress(prev => ({
          ...prev,
          currentEmail: i + 1,
          percentage: Math.round(((i + 1) / totalEmails) * 100),
          status: `Sending email ${i + 1}/${totalEmails} to ${email.to}...`
        }))

        // Update status to sending
        setSendStatus(prev => prev.map(status => 
          status.email === email.to 
            ? { ...status, status: "sending" as const }
            : status
        ))

        try {
          // Create minimal payload for single email
          const singleEmailPayload = {
            to: email.to?.trim(),
            subject: (email.subject || '').substring(0, 150), // Short subject
            message: (email.message || '').substring(0, 2000), // Short message
            originalRowData: {
              email: email.to?.trim() || '',
              name: email.originalRowData?.name?.substring(0, 50) || ''
            }
          }

          const response = await fetch('/api/send-single-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(singleEmailPayload),
          })

          if (response.ok) {
            const result = await response.json()
            results.push({
              email: email.to,
              status: "success"
            })

            // Update status to success
            setSendStatus(prev => prev.map(status => 
              status.email === email.to 
                ? { ...status, status: "success" as const }
                : status
            ))

            console.log(`✅ Email ${i + 1}/${totalEmails} sent successfully to ${email.to}`)
          } else {
            const errorData = await response.json()
            throw new Error(errorData.error || `HTTP ${response.status}`)
          }

        } catch (emailError) {
          const errorMessage = emailError instanceof Error ? emailError.message : "Unknown error"
          
          results.push({
            email: email.to,
            status: "error",
            error: errorMessage
          })

          // Update status to error
          setSendStatus(prev => prev.map(status => 
            status.email === email.to 
              ? { ...status, status: "error" as const, error: errorMessage }
              : status
          ))

          console.error(`❌ Email ${i + 1}/${totalEmails} failed for ${email.to}:`, errorMessage)
        }

        // Add delay between individual emails (1 second)
        if (i < personalizedEmails.length - 1) {
          setProgress(prev => ({
            ...prev,
            status: `Waiting 1 second before next email...`
          }))
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      const successCount = results.filter(r => r.status === "success").length
      const failedCount = results.filter(r => r.status === "error").length
      
      setProgress(prev => ({
        ...prev,
        percentage: 100,
        status: `Completed! ${successCount} sent, ${failedCount} failed out of ${totalEmails} total.`
      }))

      return results
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      
      setProgress(prev => ({
        ...prev,
        status: `Error: ${errorMessage}`
      }))
      
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    sendEmailsOneByOne,
    progress,
    sendStatus,
    isLoading,
    error
  }
}
