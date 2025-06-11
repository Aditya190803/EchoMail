"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { AuthButton } from "@/components/auth-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Users, Send, Sparkles } from "lucide-react"

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push("/compose")
    }
  }, [status, session, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900 mb-2">Email Sender Pro</CardTitle>
          <p className="text-gray-600 text-lg">Send personalized emails with ease using Gmail API</p>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-4">
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
              <div className="p-2 bg-green-100 rounded-full">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">CSV Personalization</h3>
                <p className="text-sm text-gray-600">Upload CSV data for bulk personalized emails</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
              <div className="p-2 bg-purple-100 rounded-full">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Rich Text Editor</h3>
                <p className="text-sm text-gray-600">Format your emails with professional styling</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
              <div className="p-2 bg-blue-100 rounded-full">
                <Send className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Gmail API Integration</h3>
                <p className="text-sm text-gray-600">Send directly through your Gmail account</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <AuthButton />
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">Secure authentication • No data stored • GDPR compliant</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
