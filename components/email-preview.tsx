"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Send, X, Paperclip } from "lucide-react"
import type { PersonalizedEmail } from "@/types/email"

interface EmailPreviewProps {
  emails: PersonalizedEmail[]
  onSend: () => void
  onClose: () => void
  isLoading: boolean
}

export function EmailPreview({ emails, onSend, onClose, isLoading }: EmailPreviewProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Eye className="h-5 w-5" />
            Email Preview ({emails.length} emails)
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-96 overflow-y-auto space-y-4">
            {emails.slice(0, 3).map((email, index) => (
              <div key={index} className="border rounded-lg p-4 text-xs sm:text-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3">
                  <Badge variant="outline">{email.to}</Badge>
                  {email.attachments && email.attachments.length > 0 && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      {email.attachments.length} attachment{email.attachments.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium text-gray-700">Subject: </span>
                    <span className="font-semibold">{email.subject}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Message: </span>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border overflow-x-auto">
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: email.message.length > 300 ? email.message.substring(0, 300) + "..." : email.message,
                        }}
                      />
                    </div>
                  </div>
                  {email.attachments && email.attachments.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">Attachments: </span>
                      <div className="mt-2 space-y-1">
                        {email.attachments.map((attachment, attachIndex) => (
                          <div
                            key={attachIndex}
                            className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded"
                          >
                            <Paperclip className="h-3 w-3" />
                            {attachment.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {emails.length > 3 && (
              <div className="text-center text-gray-500 text-xs sm:text-sm">... and {emails.length - 3} more emails</div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
            <Button onClick={onSend} disabled={isLoading} className="flex-1">
              <Send className="h-4 w-4 mr-2" />
              {isLoading ? "Sending..." : `Send ${emails.length} Emails`}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-initial">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
