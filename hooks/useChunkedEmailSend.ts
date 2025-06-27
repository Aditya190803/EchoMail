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

interface ChunkProgress {
  currentChunk: number
  totalChunks: number
  currentEmail: number
  totalEmails: number
  percentage: number
  chunkPercentage: number
  status: string
}

interface UseChunkedEmailSendResult {
  sendChunkedEmails: (personalizedEmails: any[], chunkSize?: number) => Promise<EmailResult[]>
  progress: ChunkProgress
  sendStatus: SendStatus[]
  isLoading: boolean
  error: string | null
}

export function useChunkedEmailSend(): UseChunkedEmailSendResult {
  const [progress, setProgress] = useState<ChunkProgress>({
    currentChunk: 0,
    totalChunks: 0,
    currentEmail: 0,
    totalEmails: 0,
    percentage: 0,
    chunkPercentage: 0,
    status: ''
  })
  
  const [sendStatus, setSendStatus] = useState<SendStatus[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendChunkedEmails = useCallback(async (
    personalizedEmails: any[], 
    chunkSize: number = 2 // Reduced from 5 to 2 emails per chunk to avoid 413 errors
  ): Promise<EmailResult[]> => {
    setIsLoading(true)
    setError(null)
    
    const totalEmails = personalizedEmails.length
    const chunks = []
    
    // Split emails into chunks
    for (let i = 0; i < totalEmails; i += chunkSize) {
      chunks.push({
        emails: personalizedEmails.slice(i, i + chunkSize),
        startIndex: i,
        endIndex: Math.min(i + chunkSize - 1, totalEmails - 1)
      })
    }
    
    const totalChunks = chunks.length
    
    console.log(`Splitting ${totalEmails} emails into ${totalChunks} chunks of ~${chunkSize} emails each`)
    
    setProgress({
      currentChunk: 0,
      totalChunks,
      currentEmail: 0,
      totalEmails,
      percentage: 0,
      chunkPercentage: 0,
      status: `Preparing to send ${totalEmails} emails in ${totalChunks} chunks...`
    })

    // Initialize send status for all emails
    const initialStatus: SendStatus[] = personalizedEmails.map(email => ({
      email: email.to,
      status: "pending"
    }))
    setSendStatus(initialStatus)

    const allResults: EmailResult[] = []
    let processedEmails = 0

    try {
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex]
        
        setProgress(prev => ({
          ...prev,
          currentChunk: chunkIndex + 1,
          chunkPercentage: 0,
          status: `Processing chunk ${chunkIndex + 1}/${totalChunks} (${chunk.emails.length} emails)...`
        }))

        try {
          // Log the payload size for debugging in production
          const payload = {
            personalizedEmails: chunk.emails.map(email => ({
              to: email.to,
              subject: email.subject,
              message: email.message,
              // Only include attachments if they exist and are small
              ...(email.attachments && email.attachments.length > 0 && {
                attachments: email.attachments
              }),
              // Include only essential originalRowData, not all fields
              originalRowData: Object.keys(email.originalRowData || {}).length > 20 
                ? { email: email.to } // Fallback if too much data
                : email.originalRowData
            })),
            chunkIndex,
            totalChunks,
            chunkInfo: {
              totalEmails,
              startIndex: chunk.startIndex,
              endIndex: chunk.endIndex
            }
          }
          
          const payloadString = JSON.stringify(payload)
          const payloadSizeKB = (payloadString.length / 1024).toFixed(2)
          console.log(`Chunk ${chunkIndex + 1} payload size: ${payloadSizeKB} KB`)
          
          // If payload is too large, reduce it further
          if (payloadString.length > 100000) { // ~100KB limit
            console.warn(`Large payload detected (${payloadSizeKB} KB), truncating data...`)
            payload.personalizedEmails = payload.personalizedEmails.map(email => ({
              to: email.to,
              subject: email.subject.substring(0, 200), // Truncate long subjects
              message: email.message.substring(0, 5000), // Truncate long messages
              originalRowData: { email: email.to } // Minimal data only
            }))
          }
          
          const response = await fetch('/api/send-email-chunk', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          })

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const data = await response.json()
          
          if (data.error) {
            throw new Error(data.error)
          }

          const chunkResults: EmailResult[] = data.results || []
          allResults.push(...chunkResults)
          
          // Update send status for this chunk
          setSendStatus(prev => prev.map(status => {
            const result = chunkResults.find(r => r.email === status.email)
            if (result) {
              return {
                ...status,
                status: result.status,
                error: result.error
              }
            }
            return status
          }))

          processedEmails += chunk.emails.length
          const overallPercentage = Math.round((processedEmails / totalEmails) * 100)
          
          setProgress(prev => ({
            ...prev,
            currentEmail: processedEmails,
            percentage: overallPercentage,
            chunkPercentage: 100,
            status: `Completed chunk ${chunkIndex + 1}/${totalChunks}. ${processedEmails}/${totalEmails} emails processed.`
          }))

          // Add delay between chunks (except for the last one)
          if (chunkIndex < chunks.length - 1) {
            const delayMs = 3000 // Reduced to 3 second delay between chunks for faster processing
            setProgress(prev => ({
              ...prev,
              status: `Waiting ${delayMs/1000} seconds before next chunk...`
            }))
            await new Promise(resolve => setTimeout(resolve, delayMs))
          }

        } catch (chunkError) {
          console.error(`Error processing chunk ${chunkIndex + 1}:`, chunkError)
          
          // Mark all emails in this chunk as failed
          const chunkEmails = chunk.emails.map(email => email.to)
          setSendStatus(prev => prev.map(status => 
            chunkEmails.includes(status.email) 
              ? { ...status, status: "error" as const, error: "Chunk processing failed" }
              : status
          ))
          
          // Add failed results for this chunk
          const failedResults: EmailResult[] = chunk.emails.map(email => ({
            email: email.to,
            status: "error" as const,
            error: chunkError instanceof Error ? chunkError.message : "Chunk processing failed"
          }))
          allResults.push(...failedResults)
          
          processedEmails += chunk.emails.length
        }
      }

      const finalSuccessCount = allResults.filter(r => r.status === "success").length
      const finalFailedCount = allResults.filter(r => r.status === "error").length
      
      setProgress(prev => ({
        ...prev,
        percentage: 100,
        status: `Completed! ${finalSuccessCount} sent, ${finalFailedCount} failed out of ${totalEmails} total.`
      }))

      return allResults
      
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
    sendChunkedEmails,
    progress,
    sendStatus,
    isLoading,
    error
  }
}
