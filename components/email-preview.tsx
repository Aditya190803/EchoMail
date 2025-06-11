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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
      <Card className="w-full max-w-sm sm:max-w-lg max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between p-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Eye className="h-4 w-4" />
            Preview ({emails.length} emails)
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 p-3">
          <div className="max-h-60 overflow-y-auto space-y-3">
            {emails.slice(0, 2).map((email, index) => (
              <div key={index} className="border rounded-lg p-2">
                <div className="flex flex-wrap items-center gap-1 mb-2">
                  <Badge variant="outline" className="text-xs">{email.to}</Badge>
                  {email.attachments && email.attachments.length > 0 && (
                    <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                      <Paperclip className="h-3 w-3" />
                      {email.attachments.length}
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs font-medium text-gray-700">Subject: </span>
                    <span className="text-xs font-semibold break-words">{email.subject}</span>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-700">Message: </span>
                    <div className="mt-1 p-2 bg-gray-50 rounded border">
                      <div
                        className="prose prose-xs max-w-none text-xs"
                        dangerouslySetInnerHTML={{
                          __html: email.message.length > 150 ? email.message.substring(0, 150) + "..." : email.message,
                        }}
                      />
                    </div>
                  </div>
                  {email.attachments && email.attachments.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-gray-700">Attachments: </span>
                      <div className="mt-1 space-y-1">
                        {email.attachments.map((attachment, attachIndex) => (
                          <div
                            key={attachIndex}
                            className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 p-1 rounded"
                          >
                            <Paperclip className="h-3 w-3" />
                            <span className="truncate">{attachment.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {emails.length > 2 && (
              <div className="text-center text-gray-500 text-xs">... and {emails.length - 2} more emails</div>
            )}
          </div>
          <div className="flex flex-col gap-2 pt-3 border-t">
            <Button onClick={onSend} disabled={isLoading} className="w-full h-10">
              <Send className="h-4 w-4 mr-2" />
              {isLoading ? "Sending..." : `Send ${emails.length} Emails`}
            </Button>
            <Button variant="outline" onClick={onClose} className="w-full h-8">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
