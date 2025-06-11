"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Paperclip, Eye } from "lucide-react"
import { CSVUpload } from "./csv-upload"
import { EmailPreview } from "./email-preview"
import type { CSVRow, PersonalizedEmail, SendStatus } from "@/types/email"
import { replacePlaceholders } from "@/lib/gmail"

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

  const generatePersonalizedEmails = (): PersonalizedEmail[] => {
    return csvData.map((row) => ({
      to: row.email,
      subject: replacePlaceholders(subject, row),
      message: replacePlaceholders(message, row),
      originalRowData: row,
    }))
  }

  const handlePreview = () => {
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

    const personalizedEmails = generatePersonalizedEmails()

    // Initialize status
    const initialStatus = personalizedEmails.map((email) => ({
      email: email.to,
      status: "pending" as const,
    }))
    setSendStatus(initialStatus)

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizedEmails: personalizedEmails.map((email) => ({
            ...email,
            attachments,
          })),
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

  const personalizedEmails = generatePersonalizedEmails()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Compose Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject (use {{placeholders}} for personalization)"
            />
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter email message (use {{placeholders}} for personalization)"
              rows={8}
            />
          </div>

          <div>
            <Label htmlFor="attachments">Attachments</Label>
            <div className="flex items-center gap-2">
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
              <div className="mt-2 space-y-1">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                    <span>{file.name}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeAttachment(index)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handlePreview}
              disabled={!subject.trim() || !message.trim() || csvData.length === 0}
              variant="outline"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
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
          emails={personalizedEmails}
          onSend={handleSend}
          onClose={() => setShowPreview(false)}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}
