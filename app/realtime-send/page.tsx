"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Send, CheckCircle, X } from "lucide-react"

export default function RealtimeSendPage() {
  const [emailCount, setEmailCount] = useState("50")
  const [isLoading, setIsLoading] = useState(false)
  const [showSendingScreen, setShowSendingScreen] = useState(false)
  
  // Real-time progress tracking
  const [sendProgress, setSendProgress] = useState(0)
  const [emailsSent, setEmailsSent] = useState(0)
  const [emailsRemaining, setEmailsRemaining] = useState(0)
  const [processingStatus, setProcessingStatus] = useState("")
  const [currentProcessingMethod, setCurrentProcessingMethod] = useState("")

  const simulateEmailSending = async () => {
    const totalEmails = parseInt(emailCount) || 50
    
    // Start the sending process
    setIsLoading(true)
    setShowSendingScreen(true)
    setSendProgress(0)
    setEmailsSent(0)
    setEmailsRemaining(totalEmails)
    
    // Always use sequential sending (no more chunking/batching)
    setCurrentProcessingMethod("� Sequential Email Sending")
    setProcessingStatus(`Sending ${totalEmails} emails one by one...`)
    
    // Simulate sequential sending (one email at a time)
    for (let i = 0; i < totalEmails; i++) {
      setProcessingStatus(`Sending email ${i + 1} of ${totalEmails}`)
      await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second per email (realistic)
      
      // Update counters synchronously
      const sentCount = i + 1
      const remainingCount = totalEmails - sentCount
      
      setEmailsSent(sentCount)
      setEmailsRemaining(remainingCount)
      setSendProgress(Math.round((sentCount / totalEmails) * 90))
    }
    
    // Finalize with correct counts
    setSendProgress(90)
    setProcessingStatus("Saving campaign data...")
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setSendProgress(100)
    setProcessingStatus(`Campaign completed! ${totalEmails} emails sent successfully.`)
    setEmailsSent(totalEmails) // Ensure final count is correct
    setEmailsRemaining(0) // Ensure remaining is 0
    setIsLoading(false)
    
    // Auto-close after 3 seconds
    setTimeout(() => {
      setShowSendingScreen(false)
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Real-time Sending Screen - Full Screen Overlay */}
      {showSendingScreen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-white border-2 border-blue-200">
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <h2 className="text-2xl font-bold text-blue-900">Sending Your Campaign</h2>
                  </div>
                  <p className="text-gray-600">Please keep this window open while we send your emails</p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                    <span className="text-sm font-bold text-blue-600">{sendProgress}%</span>
                  </div>
                  <Progress value={sendProgress} className="w-full h-4 bg-blue-100" />
                </div>

                {/* Real-time Statistics */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-6 bg-green-50 rounded-lg border-2 border-green-200">
                    <div className="text-4xl font-bold text-green-600 mb-2">{emailsSent}</div>
                    <div className="text-sm font-medium text-green-800">Emails Sent</div>
                  </div>
                  <div className="text-center p-6 bg-orange-50 rounded-lg border-2 border-orange-200">
                    <div className="text-4xl font-bold text-orange-600 mb-2">{emailsRemaining}</div>
                    <div className="text-sm font-medium text-orange-800">Remaining</div>
                  </div>
                </div>

                {/* Processing Method Info */}
                {currentProcessingMethod && (
                  <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-lg font-semibold text-gray-800 mb-2">{currentProcessingMethod}</div>
                    {processingStatus && (
                      <div className="text-sm text-gray-600">{processingStatus}</div>
                    )}
                  </div>
                )}

                {/* Status Message */}
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-lg text-blue-800 font-medium">
                    {processingStatus || "Processing your email campaign..."}
                  </p>
                  {!isLoading && (
                    <p className="text-sm text-gray-600 mt-2">
                      Campaign completed! This screen will close automatically in a few seconds.
                    </p>
                  )}
                </div>

                {/* Close button (only show when not actively sending) */}
                {!isLoading && (
                  <div className="text-center">
                    <Button 
                      onClick={() => setShowSendingScreen(false)} 
                      variant="outline"
                      className="px-6 py-2"
                    >
                      Close
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Page Content */}
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Real-time Email Sending Demo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="emailCount">Number of emails to simulate</Label>
              <Input
                id="emailCount"
                type="number"
                value={emailCount}
                onChange={(e) => setEmailCount(e.target.value)}
                placeholder="Enter number of emails"
                min="1"
                max="1000"
              />
              <p className="text-xs text-gray-500 mt-1">
                All emails are sent sequentially, one at a time, for maximum reliability.
              </p>
            </div>
            
            <Button 
              onClick={simulateEmailSending} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Sending..." : "Start Email Campaign"}
            </Button>
            
            <div className="text-center text-sm text-gray-600">
              <p>This is a simulation that demonstrates the real-time loading screen.</p>
              <p>All emails are sent sequentially, one at a time, for maximum reliability.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
