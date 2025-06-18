"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Send, X, Paperclip, Mail } from "lucide-react"
import type { PersonalizedEmail } from "@/types/email"
import { getEmailPreviewHTML } from "@/lib/email-formatter"

interface EmailPreviewProps {
  emails: PersonalizedEmail[]
  onSend: () => void
  onClose: () => void
  isLoading: boolean
}

export function EmailPreview({ emails, onSend, onClose, isLoading }: EmailPreviewProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
      <Card className="w-full max-w-4xl max-h-[95vh] overflow-hidden">
        <CardHeader className="flex flex-col space-y-3 p-3 border-b bg-white sticky top-0 z-10">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4" />
              Email Preview ({emails.length} emails)
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
          {/* Action Buttons - Always visible at top */}
          <div className="flex flex-col gap-2">
            <Button onClick={onSend} disabled={isLoading} className="w-full h-10 shadow-lg">
              <Send className="h-4 w-4 mr-2" />
              {isLoading ? "Sending..." : `Send ${emails.length} Emails`}
            </Button>
            <Button variant="outline" onClick={onClose} className="w-full h-8">
              Cancel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-3">
          <div className="bg-blue-50 p-3 rounded-lg mb-3">
            <p className="text-xs text-blue-800 flex items-center gap-1">
              <Mail className="h-3 w-3" />
              <strong>Gmail Preview:</strong> Shows exactly how emails will appear in Gmail with proper formatting and spacing.
            </p>
          </div>
          <div className="max-h-[65vh] overflow-y-auto space-y-4">
            {emails.map((email, index) => (
              <div key={index} className="border rounded-lg p-3 bg-white">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-xs">{email.to}</Badge>
                  <Badge variant="secondary" className="text-xs">Email #{index + 1}</Badge>
                  {email.attachments && email.attachments.length > 0 && (
                    <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                      <Paperclip className="h-3 w-3" />
                      {email.attachments.length} attachment{email.attachments.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Subject: </span>
                    <span className="text-sm font-semibold break-words">{email.subject}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Message: </span>
                    <div className="mt-2 p-3 bg-gray-50 rounded border max-h-96 overflow-y-auto">
                      <iframe
                        srcDoc={getEmailPreviewHTML(email.message)}
                        className="w-full h-64 border-0 bg-white rounded"
                        title={`Email preview for ${email.to}`}
                      />
                    </div>
                  </div>
                  {email.attachments && email.attachments.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Attachments: </span>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {email.attachments.map((attachment, attachIndex) => (
                          <div
                            key={attachIndex}
                            className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded border"
                          >
                            <Paperclip className="h-4 w-4" />
                            <span className="truncate flex-1">{attachment.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
