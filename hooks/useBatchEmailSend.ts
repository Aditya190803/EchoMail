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

interface UseBatchEmailSendResult {
  sendBatchEmails: (personalizedEmails: any[]) => Promise<EmailResult[]>
  sendStatus: SendStatus[]
  isLoading: boolean
  error: string | null
}

export function useBatchEmailSend(): UseBatchEmailSendResult {
  const [sendStatus, setSendStatus] = useState<SendStatus[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendBatchEmails = useCallback(async (personalizedEmails: any[]): Promise<EmailResult[]> => {
    setIsLoading(true)
    setError(null)

    // Initialize send status for all emails
    const initialStatus: SendStatus[] = personalizedEmails.map(email => ({
      email: email.to,
      status: "pending"
    }))
    setSendStatus(initialStatus)

    try {
      const response = await fetch('/api/send-email-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ personalizedEmails }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      const results: EmailResult[] = data.results || []
      
      // Update send status based on results
      setSendStatus(prev => prev.map(status => {
        const result = results.find(r => r.email === status.email)
        if (result) {
          return {
            ...status,
            status: result.status,
            error: result.error
          }
        }
        return status
      }))

      return results
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      
      // Mark all emails as failed
      setSendStatus(prev => prev.map(status => ({
        ...status,
        status: "error" as const,
        error: errorMessage
      })))
      
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    sendBatchEmails,
    sendStatus,
    isLoading,
    error
  }
}
