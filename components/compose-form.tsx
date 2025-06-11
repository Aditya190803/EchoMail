"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Paperclip, Eye, X, Send, CheckCircle, AlertCircle, Users, FileText, Plus, Trash2 } from "lucide-react"
import { CSVUpload } from "./csv-upload"
import { EmailPreview } from "./email-preview"
import { RichTextEditor } from "./rich-text-editor"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import type { CSVRow, PersonalizedEmail, SendStatus, AttachmentData } from "@/types/email"

// Simple client-side placeholder replacement for HTML content
function replacePlaceholders(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match)
}

// Convert File to base64
async function fileToBase64(file: File): Promise<AttachmentData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      const base64Data = result.split(",")[1]
      resolve({
        name: file.name,
        type: file.type,
        data: base64Data,
      })
    }
    reader.onerror = reject
  })
}

interface ManualEmail {
  email: string
  name: string
  [key: string]: string
}

export function ComposeForm() {
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [csvData, setCsvData] = useState<CSVRow[]>([])
  const [manualEmails, setManualEmails] = useState<ManualEmail[]>([{ email: "", name: "" }])
  const [attachments, setAttachments] = useState<File[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [sendStatus, setSendStatus] = useState<SendStatus[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [sendProgress, setSendProgress] = useState(0)
  const [activeTab, setActiveTab] = useState("csv")

  const handleFileAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments((prev) => [...prev, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const addManualEmail = () => {
    setManualEmails((prev) => [...prev, { email: "", name: "" }])
  }

  const removeManualEmail = (index: number) => {
    setManualEmails((prev) => prev.filter((_, i) => i !== index))
  }

  const updateManualEmail = (index: number, field: string, value: string) => {
    setManualEmails((prev) => prev.map((email, i) => (i === index ? { ...email, [field]: value } : email)))
  }

  const generatePersonalizedEmails = async (): Promise<PersonalizedEmail[]> => {
    const attachmentData: AttachmentData[] = []
    for (const file of attachments) {
      try {
        const base64Attachment = await fileToBase64(file)
        attachmentData.push(base64Attachment)
      } catch (error) {
        console.error(`Failed to convert file ${file.name} to base64:`, error)
      }
    }

    const emailData = activeTab === "csv" ? csvData : manualEmails.filter((email) => email.email.trim())

    return emailData.map((row) => ({
      to: row.email,
      subject: replacePlaceholders(subject, row),
      message: replacePlaceholders(message, row),
      originalRowData: row,
      attachments: attachmentData,
    }))
  }

  const handlePreview = async () => {
    const emailData = activeTab === "csv" ? csvData : manualEmails.filter((email) => email.email.trim())

    if (emailData.length === 0) {
      alert("Please add email recipients first")
      return
    }
    if (!subject.trim() || !message.trim()) {
      alert("Please fill in subject and message")
      return
    }
    setShowPreview(true)
  }

  const handleSend = async () => {
    setIsLoading(true)
    setSendStatus([])
    setShowSuccess(false)
    setSendProgress(0)

    try {
      const personalizedEmails = await generatePersonalizedEmails()

      const initialStatus = personalizedEmails.map((email) => ({
        email: email.to,
        status: "pending" as const,
      }))
      setSendStatus(initialStatus)

      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizedEmails,
        }),
      })

      const data = await response.json()
      setSendStatus(data.results)

      const successCount = data.results.filter((result: SendStatus) => result.status === "success").length
      const totalCount = data.results.length
      setSendProgress(100)

      if (successCount === totalCount) {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 5000)
      }
    } catch (error) {
      console.error("Failed to send emails:", error)
      setSendStatus((prev) =>
        prev.map((status) => ({
          ...status,
          status: "error" as const,
          error: "Network error",
        })),
      )
    } finally {
      setIsLoading(false)
      setShowPreview(false)
    }
  }

  const getPersonalizedEmailsForPreview = (): PersonalizedEmail[] => {
    const emailData = activeTab === "csv" ? csvData : manualEmails.filter((email) => email.email.trim())

    return emailData.map((row) => ({
      to: row.email,
      subject: replacePlaceholders(subject, row),
      message: replacePlaceholders(message, row),
      originalRowData: row,
      attachments: attachments.map((file) => ({
        name: file.name,
        type: file.type,
        data: "",
      })),
    }))
  }

  const personalizedEmailsForPreview = getPersonalizedEmailsForPreview()
  const successCount = sendStatus.filter((status) => status.status === "success").length
  const errorCount = sendStatus.filter((status) => status.status === "error").length
  const emailData = activeTab === "csv" ? csvData : manualEmails.filter((email) => email.email.trim())
  const canSend = subject.trim() && message.trim() && emailData.length > 0

  return (
    <div className="space-y-6">
      {/* Success Alert */}
      {showSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">All emails sent successfully! 🎉</AlertDescription>
        </Alert>
      )}

      {/* Main Compose Card */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Send className="h-5 w-5 text-blue-600" />
            Compose Email
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">Create personalized emails for your recipients</p>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {/* Subject Field */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-base font-medium">
              Subject Line
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject (use {{placeholders}} for personalization)"
              className="text-base"
            />
            <p className="text-xs text-gray-500">
              Example: "Hello {`{{name}}`}, special offer for {`{{company}}`}"
            </p>
          </div>

          {/* Message Field */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-base font-medium">
              Email Message
            </Label>
            <RichTextEditor
              content={message}
              onChange={setMessage}
              placeholder="Compose your email message here. Use {{placeholders}} for personalization..."
            />
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Pro Tip:</strong> Use placeholders like {`{{name}}`}, {`{{company}}`}, or {`{{email}}`} to
                personalize your emails based on your recipient data.
              </p>
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-3">
            <Label htmlFor="attachments" className="text-base font-medium">
              Attachments
            </Label>
            <div className="flex items-center gap-2">
              <input type="file" id="attachments" multiple onChange={handleFileAttachment} className="hidden" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("attachments")?.click()}
                className="flex items-center gap-2"
              >
                <Paperclip className="h-4 w-4" />
                Add Files
              </Button>
              <span className="text-sm text-gray-500">
                {attachments.length > 0 ? `${attachments.length} file(s) selected` : "No files selected"}
              </span>
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={handlePreview} disabled={!canSend} variant="outline" className="flex-1">
              <Eye className="h-4 w-4 mr-2" />
              Preview Emails ({emailData.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recipients Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Recipients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="csv">CSV Upload</TabsTrigger>
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            </TabsList>

            <TabsContent value="csv" className="mt-4">
              <CSVUpload onDataLoad={setCsvData} csvData={csvData} />
            </TabsContent>

            <TabsContent value="manual" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Add recipients manually</p>
                  <Button onClick={addManualEmail} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Recipient
                  </Button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {manualEmails.map((emailData, index) => (
                    <div key={index} className="flex gap-3 items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <Input
                          placeholder="Email address"
                          value={emailData.email}
                          onChange={(e) => updateManualEmail(index, "email", e.target.value)}
                          type="email"
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder="Name"
                          value={emailData.name}
                          onChange={(e) => updateManualEmail(index, "name", e.target.value)}
                        />
                      </div>
                      {manualEmails.length > 1 && (
                        <Button
                          onClick={() => removeManualEmail(index)}
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {manualEmails.filter((email) => email.email.trim()).length > 0 && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      📧 {manualEmails.filter((email) => email.email.trim()).length} recipient(s) ready to send
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Send Progress */}
      {isLoading && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Sending Emails...</h3>
                <span className="text-sm text-gray-500">{sendProgress}%</span>
              </div>
              <Progress value={sendProgress} className="w-full" />
              <p className="text-sm text-gray-600">Please wait while we send your emails.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Send Status */}
      {sendStatus.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Send Results
              {successCount > 0 && (
                <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">{successCount} sent</span>
              )}
              {errorCount > 0 && (
                <span className="text-sm bg-red-100 text-red-800 px-2 py-1 rounded-full">{errorCount} failed</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {sendStatus.map((status, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {status.status === "success" ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : status.status === "error" ? (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <div className="h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                    )}
                    <span className="font-medium text-sm">{status.email}</span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        status.status === "success"
                          ? "bg-green-100 text-green-800"
                          : status.status === "error"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {status.status === "success" ? "Sent" : status.status === "error" ? "Failed" : "Sending..."}
                    </span>
                    {status.error && <p className="text-xs text-red-600 mt-1">{status.error}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Preview Modal */}
      {showPreview && (
        <EmailPreview
          emails={personalizedEmailsForPreview}
          onSend={handleSend}
          onClose={() => setShowPreview(false)}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}
