"use client"

import { useSession } from "next-auth/react"
import { AuthButton } from "@/components/auth-button"
import { ComposeForm } from "@/components/compose-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Users, Send } from "lucide-react"

export default function HomePage() {
  const { data: session } = useSession()

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Mail className="h-6 w-6" />
              Email Sender
            </CardTitle>
            <p className="text-gray-600">Send personalized emails using Gmail API</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                Upload CSV for personalization
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Send className="h-4 w-4" />
                Send via Gmail API
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                Preview before sending
              </div>
            </div>
            <div className="pt-4">
              <AuthButton />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-2">
              <Mail className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Email Sender</h1>
            </div>
            <AuthButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <ComposeForm />
        </div>
      </main>
    </div>
  )
}
