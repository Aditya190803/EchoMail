import { useState, useCallback } from 'react'

interface EmailResult {
  email: string
  status: "success" | "error"
  error?: string
}

interface SendStatus {
  email: string
  status: "pending" | "success" | "error"
  error?: string
}

interface EmailProgress {
  currentEmail: number
  totalEmails: number
  percentage: number
  status: string
}

interface UseSimpleEmailSendResult {
  sendEmails: (personalizedEmails: any[]) => Promise<EmailResult[]>
  progress: EmailProgress
  sendStatus: SendStatus[]
  isLoading: boolean
  error: string | null
}

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

  const sendEmails = useCallback(async (personalizedEmails: any[]): Promise<EmailResult[]> => {
    setIsLoading(true)
    setError(null)
    
    const totalEmails = personalizedEmails.length
    
    setProgress({
      currentEmail: 0,
      totalEmails,
      percentage: 0,
      status: `Starting to send ${totalEmails} emails...`
    })

    // Initialize all emails as pending
    setSendStatus(personalizedEmails.map(email => ({
      email: email.to,
      status: "pending"
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

        try {
          const response = await fetch('/api/send-single-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: email.to,
              subject: email.subject,
              message: email.message,
              originalRowData: email.originalRowData || {}
            }),
          })

          if (response.ok) {
            results.push({ email: email.to, status: "success" })
            setSendStatus(prev => prev.map(s => 
              s.email === email.to ? { ...s, status: "success" as const } : s
            ))
          } else {
            const errorData = await response.json()
            throw new Error(errorData.error || `HTTP ${response.status}`)
          }

        } catch (emailError) {
          const errorMessage = emailError instanceof Error ? emailError.message : "Failed"
          results.push({ email: email.to, status: "error", error: errorMessage })
          setSendStatus(prev => prev.map(s => 
            s.email === email.to ? { ...s, status: "error" as const, error: errorMessage } : s
          ))
        }

        // Wait 1 second between emails
        if (i < personalizedEmails.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      const sent = results.filter(r => r.status === "success").length
      const failed = results.filter(r => r.status === "error").length
      
      setProgress(prev => ({
        ...prev,
        status: `Done! ${sent} sent, ${failed} failed`
      }))

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

  return {
    sendEmails,
    progress,
    sendStatus,
    isLoading,
    error
  }
}
