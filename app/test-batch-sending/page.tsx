"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Send } from "lucide-react"

interface SendStatus {
  email: string
  status: "pending" | "success" | "error"
  error?: string
}

export default function TestBatchSending() {
  const { data: session } = useSession()
  const [testEmails, setTestEmails] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [sendStatus, setSendStatus] = useState<SendStatus[]>([])
  const [error, setError] = useState<string | null>(null)

  const sendTestBatch = async () => {
    if (!testEmails.trim()) {
      setError("Please enter test email addresses")
      return
    }

    setIsLoading(true)
    setError(null)
    setResults(null)
    setSendStatus([])

    try {
      // Parse email addresses
      const emails = testEmails
        .split(',')
        .map(email => email.trim())
        .filter(email => email.includes('@'))

      if (emails.length === 0) {
        throw new Error("No valid email addresses found")
      }

      // Create personalized emails for testing
      const personalizedEmails = emails.map((email, index) => ({
        to: email,
        subject: `Test Batch Email #${index + 1} - {{name}}`,
        message: `
          <h2>Test Batch Email Delivery</h2>
          <p>Hello {{name}},</p>
          <p>This is test email #${index + 1} from EchoMail's batch sending system.</p>
          <p><strong>Email:</strong> {{email}}</p>
          <p><strong>Test Info:</strong></p>
          <ul>
            <li>Total emails in batch: ${emails.length}</li>
            <li>Your position: ${index + 1}</li>
            <li>Sent using: Batch API</li>
            <li>Timestamp: ${new Date().toISOString()}</li>
          </ul>
          <p>If you received this email, the batch sending system is working correctly! ✅</p>
          <p>Best regards,<br>EchoMail Test System</p>
        `,
        originalRowData: {
          name: email.split('@')[0],
          email: email,
          company: "Test Company"
        },
        attachments: []
      }))

      // Initialize status
      setSendStatus(emails.map(email => ({
        email,
        status: "pending"
      })))

      const response = await fetch("/api/send-email-batch", {
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

    } catch (error) {
      console.error("Batch send test error:", error)
      setError(error instanceof Error ? error.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-600">Please sign in to test batch email sending.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Test Batch Email Sending
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="testEmails">Test Email Addresses</Label>
            <Input
              id="testEmails"
              value={testEmails}
              onChange={(e) => setTestEmails(e.target.value)}
              placeholder="email1@example.com, email2@example.com, email3@example.com"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">
              Enter multiple email addresses separated by commas to test batch sending
            </p>
          </div>

          <Button 
            onClick={sendTestBatch} 
            disabled={isLoading || !testEmails.trim()}
            className="w-full"
          >
            {isLoading ? "Sending Batch..." : "Send Test Batch"}
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
                  <p><strong>Batch sending completed!</strong></p>
                  <div className="text-sm">
                    <p>📊 Summary: {results.summary?.sent || 0} sent, {results.summary?.failed || 0} failed out of {results.summary?.total || 0} total</p>
                    {results.summary?.batched && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-blue-800">
                        <p><strong>🔧 Batch Processing Info:</strong></p>
                        <p>• Attachment emails: {results.summary.batchInfo?.attachmentEmails || 0}</p>
                        <p>• Regular emails: {results.summary.batchInfo?.regularEmails || 0}</p>
                        <p>• Batch delay: {results.summary.batchInfo?.batchDelay || 0}ms</p>
                      </div>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {sendStatus.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Individual Email Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {sendStatus.map((status, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        {status.status === "success" ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : status.status === "error" ? (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <div className="h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                        )}
                        <span className="text-sm truncate">{status.email}</span>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        status.status === "success" 
                          ? "bg-green-100 text-green-800"
                          : status.status === "error"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {status.status === "success" ? "Sent" : status.status === "error" ? "Failed" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">About Batch Sending</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-600 space-y-2">
          <p>📦 <strong>Smart Batch Processing:</strong> Automatically activated when:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Sending more than 5 emails</li>
            <li>Emails contain attachments</li>
            <li>Large recipient lists</li>
          </ul>
          <p>🔧 <strong>Features:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Smaller batches for emails with attachments (3 per batch)</li>
            <li>Regular emails sent in batches of 6</li>
            <li>4-second delays between batches for rate limiting</li>
            <li>3 retry attempts for failed emails</li>
            <li>Timeout protection (30 seconds per request)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
