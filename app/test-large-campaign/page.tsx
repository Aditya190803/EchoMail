"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, AlertCircle, Send, Users, Clock, Zap } from "lucide-react"

interface SendStatus {
  email: string
  status: "pending" | "success" | "error"
  error?: string
}

export default function TestLargeCampaign() {
  const { data: session } = useSession()
  const [numberOfEmails, setNumberOfEmails] = useState("100")
  const [baseEmail, setBaseEmail] = useState("test@example.com")
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<any>(null)
  const [sendStatus, setSendStatus] = useState<SendStatus[]>([])
  const [error, setError] = useState<string | null>(null)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [endTime, setEndTime] = useState<Date | null>(null)

  const generateTestCampaign = async () => {
    const count = parseInt(numberOfEmails)
    if (!count || count < 1 || count > 1000) {
      setError("Please enter a number between 1 and 1000")
      return
    }

    setIsLoading(true)
    setError(null)
    setResults(null)
    setSendStatus([])
    setProgress(0)
    setStartTime(new Date())
    setEndTime(null)

    try {
      // Generate test email addresses
      const emails = []
      const domain = baseEmail.includes('@') ? baseEmail.split('@')[1] : 'example.com'
      
      for (let i = 1; i <= count; i++) {
        emails.push(`test${i}@${domain}`)
      }

      // Create personalized emails for testing
      const personalizedEmails = emails.map((email, index) => ({
        to: email,
        subject: `Large Campaign Test #${index + 1} - {{name}}`,
        message: `
          <h2>Large Campaign Test Email</h2>
          <p>Hello {{name}},</p>
          <p>This is test email #${index + 1} from EchoMail's large campaign system.</p>
          <p><strong>Campaign Details:</strong></p>
          <ul>
            <li>Total emails in campaign: ${count}</li>
            <li>Your position: ${index + 1}</li>
            <li>Processing method: ${count > 100 ? 'Chunked' : count > 5 ? 'Batched' : 'Regular'}</li>
            <li>Expected chunk size: ${count > 100 ? (count > 500 ? '30 emails' : count > 100 ? '50 emails' : 'N/A') : 'N/A'}</li>
            <li>Timestamp: ${new Date().toISOString()}</li>
          </ul>
          <p><strong>Test Info:</strong></p>
          <ul>
            <li>User: {{email}}</li>
            <li>Company: {{company}}</li>
            <li>Batch processing: Enabled</li>
            <li>Rate limiting: Active</li>
          </ul>
          <p>If you received this email, the large campaign system is working correctly! ✅</p>
          <p>Best regards,<br>EchoMail Large Campaign Test</p>
        `,
        originalRowData: {
          name: `TestUser${index + 1}`,
          email: email,
          company: `TestCompany${Math.floor(index / 10) + 1}`
        },
        attachments: []
      }))

      // Initialize status
      setSendStatus(emails.map(email => ({
        email,
        status: "pending"
      })))

      console.log(`Starting large campaign test with ${count} emails`)

      // Use the chunked approach for large campaigns
      if (count > 100) {
        await sendEmailsInChunks(personalizedEmails, count)
      } else {
        await sendEmailsInBatch(personalizedEmails)
      }

    } catch (error) {
      console.error("Large campaign test error:", error)
      setError(error instanceof Error ? error.message : "Unknown error")
    } finally {
      setIsLoading(false)
      setEndTime(new Date())
    }
  }

  const sendEmailsInChunks = async (personalizedEmails: any[], totalCount: number) => {
    const chunkSize = totalCount > 500 ? 30 : 50
    const chunks = []
    
    for (let i = 0; i < personalizedEmails.length; i += chunkSize) {
      chunks.push(personalizedEmails.slice(i, i + chunkSize))
    }
    
    console.log(`Using chunked sending: ${chunks.length} chunks of ~${chunkSize} emails each`)
    
    const allResults: any[] = []
    
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex]
      setProgress(Math.round(((chunkIndex) / chunks.length) * 100))
      
      try {
        const response = await fetch("/api/send-email-chunk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizedEmails: chunk,
            chunkIndex,
            totalChunks: chunks.length,
            chunkInfo: {
              totalEmails: personalizedEmails.length,
              startIndex: chunkIndex * chunkSize,
              endIndex: Math.min((chunkIndex + 1) * chunkSize - 1, personalizedEmails.length - 1)
            }
          }),
        })

        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || `HTTP ${response.status}`)
        }

        const chunkResults = data.results || []
        allResults.push(...chunkResults)
        
        // Update status
        setSendStatus(prev => {
          const updated = [...prev]
          chunkResults.forEach((result: any) => {
            const index = updated.findIndex(status => status.email === result.email)
            if (index >= 0) {
              updated[index] = result
            }
          })
          return updated
        })
        
        console.log(`Completed chunk ${chunkIndex + 1}/${chunks.length}`)
        
        // Small delay between chunks
        if (chunkIndex < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
      } catch (chunkError) {
        console.error(`Error in chunk ${chunkIndex + 1}:`, chunkError)
        const failedResults = chunk.map((email: any) => ({
          email: email.to,
          status: "error",
          error: "Chunk processing failed"
        }))
        allResults.push(...failedResults)
      }
    }
    
    setProgress(100)
    setResults({
      results: allResults,
      summary: {
        total: personalizedEmails.length,
        sent: allResults.filter(r => r.status === "success").length,
        failed: allResults.filter(r => r.status === "error").length,
        chunked: true,
        chunks: chunks.length,
        chunkSize
      }
    })
  }

  const sendEmailsInBatch = async (personalizedEmails: any[]) => {
    const endpoint = personalizedEmails.length > 5 ? "/api/send-email-batch" : "/api/send-email"
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizedEmails,
      }),
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    setResults(data)
    setSendStatus(data.results || [])
    setProgress(100)
  }

  const getTimeDuration = () => {
    if (!startTime || !endTime) return null
    const duration = (endTime.getTime() - startTime.getTime()) / 1000
    return `${duration.toFixed(1)} seconds`
  }

  const getSuccessRate = () => {
    if (!results) return 0
    const total = results.summary?.total || 0
    const sent = results.summary?.sent || 0
    return total > 0 ? Math.round((sent / total) * 100) : 0
  }

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-600">Please sign in to test large campaign sending.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Large Campaign Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numberOfEmails">Number of Test Emails</Label>
              <Input
                id="numberOfEmails"
                type="number"
                value={numberOfEmails}
                onChange={(e) => setNumberOfEmails(e.target.value)}
                placeholder="100"
                min="1"
                max="1000"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500">
                Enter a number between 1 and 1000 emails
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="baseEmail">Base Email Domain</Label>
              <Input
                id="baseEmail"
                value={baseEmail}
                onChange={(e) => setBaseEmail(e.target.value)}
                placeholder="test@example.com"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500">
                Will generate test1@domain.com, test2@domain.com, etc.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">📊 Processing Method Preview:</h4>
            <div className="text-xs text-blue-800 space-y-1">
              {parseInt(numberOfEmails) > 100 && (
                <p>🚀 <strong>Chunked Processing:</strong> Will use {parseInt(numberOfEmails) > 500 ? 30 : 50} email chunks with delays between chunks</p>
              )}
              {parseInt(numberOfEmails) > 5 && parseInt(numberOfEmails) <= 100 && (
                <p>📦 <strong>Batch Processing:</strong> Will use smart batching with rate limiting</p>
              )}
              {parseInt(numberOfEmails) <= 5 && (
                <p>📧 <strong>Regular Processing:</strong> Will send emails individually</p>
              )}
            </div>
          </div>

          {isLoading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing campaign...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
              {startTime && (
                <p className="text-xs text-gray-500">
                  Started: {startTime.toLocaleTimeString()}
                </p>
              )}
            </div>
          )}

          <Button 
            onClick={generateTestCampaign} 
            disabled={isLoading || !numberOfEmails.trim()}
            className="w-full"
          >
            {isLoading ? "Processing Campaign..." : `Send ${numberOfEmails} Test Emails`}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {results && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="space-y-2">
                  <p><strong>Campaign completed!</strong></p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>Total: {results.summary?.total || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      <span>Sent: {results.summary?.sent || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>Failed: {results.summary?.failed || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>Time: {getTimeDuration()}</span>
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <p className="font-medium">Success Rate: {getSuccessRate()}%</p>
                    {results.summary?.chunked && (
                      <p className="text-xs">Processed in {results.summary.chunks} chunks of {results.summary.chunkSize} emails each</p>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {sendStatus.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Email Status Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center p-2 bg-yellow-50 rounded">
                      <div className="font-medium text-yellow-800">
                        {sendStatus.filter(s => s.status === "pending").length}
                      </div>
                      <div className="text-xs text-yellow-600">Pending</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded">
                      <div className="font-medium text-green-800">
                        {sendStatus.filter(s => s.status === "success").length}
                      </div>
                      <div className="text-xs text-green-600">Success</div>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded">
                      <div className="font-medium text-red-800">
                        {sendStatus.filter(s => s.status === "error").length}
                      </div>
                      <div className="text-xs text-red-600">Failed</div>
                    </div>
                  </div>
                  
                  {sendStatus.filter(s => s.status === "error").length > 0 && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-medium text-red-700">
                        View Failed Emails ({sendStatus.filter(s => s.status === "error").length})
                      </summary>
                      <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                        {sendStatus.filter(s => s.status === "error").map((status, index) => (
                          <div key={index} className="text-xs p-2 bg-red-50 rounded">
                            <span className="font-mono">{status.email}</span>
                            {status.error && <div className="text-red-600 mt-1">{status.error}</div>}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">About Large Campaign Testing</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-600 space-y-2">
          <p>🧪 <strong>This tool tests EchoMail's ability to handle large email campaigns reliably.</strong></p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="font-medium text-gray-800">📧 1-5 emails:</p>
              <p>Regular processing</p>
            </div>
            <div>
              <p className="font-medium text-gray-800">📦 6-100 emails:</p>
              <p>Batch processing with rate limiting</p>
            </div>
            <div>
              <p className="font-medium text-gray-800">🚀 100+ emails:</p>
              <p>Advanced chunked processing</p>
            </div>
          </div>
          <div className="mt-4 p-2 bg-yellow-50 rounded">
            <p><strong>⚠️ Important:</strong> This sends real test emails. Use test domains only!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
