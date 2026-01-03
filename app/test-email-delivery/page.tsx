"use client"

import { useState } from "react"

import { CheckCircle, AlertCircle, Mail } from "lucide-react"
import { useSession } from "next-auth/react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function TestEmailDelivery() {
  const { data: session } = useSession()
  const [testEmail, setTestEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const sendTestEmail = async () => {
    if (!testEmail.trim()) {
      setError("Please enter a test email address")
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizedEmails: [
            {
              to: testEmail,
              subject: "Test Email from EchoMail - {{name}}",
              message: `
                <h2>Test Email Delivery</h2>
                <p>Hello {{name}},</p>
                <p>This is a test email from EchoMail to verify email delivery is working correctly.</p>
                <p><strong>Test Details:</strong></p>
                <ul>
                  <li>Sent at: ${new Date().toLocaleString()}</li>
                  <li>From: ${session?.user?.email}</li>
                  <li>To: ${testEmail}</li>
                </ul>
                <p>If you received this email, the delivery system is working correctly!</p>
                <p>Best regards,<br>EchoMail Team</p>
              `,
              originalRowData: { 
                name: "Test User", 
                email: testEmail 
              },
              attachments: [],
            },
          ],
        }),
      })

      const data = await response.json()
      setResult(data)

      if (!response.ok) {
        setError(data.error || "Failed to send test email")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please sign in to test email delivery</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Test Email Delivery
            </CardTitle>
            <p className="text-sm text-gray-600">
              Send a test email to verify that email delivery is working correctly
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="testEmail">Test Email Address</Label>
              <Input
                id="testEmail"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Enter email address to test delivery"
              />
            </div>

            <Button onClick={sendTestEmail} disabled={isLoading} className="w-full">
              {isLoading ? "Sending..." : "Send Test Email"}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <Alert className={result.results?.[0]?.status === "success" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                {result.results?.[0]?.status === "success" ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>
                  <div className="space-y-2">
                    <p className={result.results?.[0]?.status === "success" ? "text-green-800" : "text-red-800"}>
                      {result.results?.[0]?.status === "success" 
                        ? `✅ Test email sent successfully to ${testEmail}!` 
                        : `❌ Failed to send test email: ${result.results?.[0]?.error}`
                      }
                    </p>
                    {result.results?.[0]?.status === "success" && (
                      <div className="text-sm text-green-700">
                        <p><strong>Next steps:</strong></p>
                        <ol className="list-decimal list-inside space-y-1 mt-1">
                          <li>Check the recipient's inbox</li>
                          <li>If not found, check spam/junk folder</li>
                          <li>Verify the sender's email reputation</li>
                          <li>Consider email authentication (SPF, DKIM, DMARC)</li>
                        </ol>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Troubleshooting Tips:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Check if emails are going to spam/junk folders</li>
                <li>• Verify your Gmail account has proper sending permissions</li>
                <li>• Ensure recipient email addresses are valid</li>
                <li>• Check Gmail's sending limits (500 emails per day for free accounts)</li>
                <li>• Consider warming up your sending domain if sending to many recipients</li>
              </ul>
            </div>            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Current Session Info:</h3>
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>User:</strong> {session.user?.email || "Not available"}</p>
                <p><strong>User Name:</strong> {session.user?.name || "Not available"}</p>
                <p><strong>Access Token:</strong> {session.accessToken ? "✅ Available" : "❌ Missing"}</p>
                <p><strong>Session Error:</strong> {session.error || "None"}</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-blue-600">Debug Session Object</summary>
                  <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto">
                    {JSON.stringify(session, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
