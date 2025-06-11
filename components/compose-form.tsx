"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Paperclip, Eye, X } from "lucide-react"
import { CSVUpload } from "./csv-upload"
import { EmailPreview } from "./email-preview"
import { RichTextEditor } from "./rich-text-editor"
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
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
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

export function ComposeForm() {
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [csvData, setCsvData] = useState<CSVRow[]>([])
  const [attachments, setAttachments] = useState<File[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [sendStatus, setSendStatus] = useState<SendStatus[]>([])

  const handleFileAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments((prev) => [...prev, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const generatePersonalizedEmails = async (): Promise<PersonalizedEmail[]> => {
    // Convert all files to base64
    const attachmentData: AttachmentData[] = []
    for (const file of attachments) {
      try {
        const base64Attachment = await fileToBase64(file)
        attachmentData.push(base64Attachment)
      } catch (error) {
        console.error(`Failed to convert file ${file.name} to base64:`, error)
      }
    }

    return csvData.map((row) => ({
      to: row.email,
      subject: replacePlaceholders(subject, row),
      message: replacePlaceholders(message, row),
      originalRowData: row,
      attachments: attachmentData,
    }))
  }

  const handlePreview = async () => {
    if (csvData.length === 0) {
      alert("Please upload CSV data first")
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

    try {
      const personalizedEmails = await generatePersonalizedEmails()

      // Initialize status
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
    // For preview, we don't need to convert files to base64
    return csvData.map((row) => ({
      to: row.email,
      subject: replacePlaceholders(subject, row),
      message: replacePlaceholders(message, row),
      originalRowData: row,
      attachments: attachments.map((file) => ({
        name: file.name,
        type: file.type,
        data: "", // Empty for preview
      })),
    }))
  }

  const personalizedEmailsForPreview = getPersonalizedEmailsForPreview()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Compose Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject (use {{placeholders}} for personalization)"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="message" className="text-base font-medium">
              Message
            </Label>
            <div className="mt-2">
              <RichTextEditor
                content={message}
                onChange={setMessage}
                placeholder="Compose your email message here. Use {{placeholders}} for personalization..."
              />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              <p>
                💡 <strong>Tip:</strong> Use placeholders like {`{name}`} or {`{company}`} to personalize your emails
                based on CSV data.
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="attachments">Attachments</Label>
            <div className="flex items-center gap-2 mt-1">
              <input type="file" id="attachments" multiple onChange={handleFileAttachment} className="hidden" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("attachments")?.click()}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Add Attachments
              </Button>
            </div>
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{file.name}</span>
                      <span className="text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeAttachment(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handlePreview}
              disabled={!subject.trim() || !message.trim() || csvData.length === 0}
              variant="outline"
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview Emails
            </Button>
          </div>
        </CardContent>
      </Card>

      <CSVUpload onDataLoad={setCsvData} csvData={csvData} />

      {sendStatus.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Send Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sendStatus.map((status, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span>{status.email}</span>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      status.status === "success"
                        ? "bg-green-100 text-green-800"
                        : status.status === "error"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {status.status}
                    {status.error && ` - ${status.error}`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
