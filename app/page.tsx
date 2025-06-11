"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { AuthButton } from "@/components/auth-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Users, Send, Sparkles, Zap, Shield, Clock, CheckCircle } from "lucide-react"

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push("/dashboard")
    }
  }, [status, session, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-2">
        <Card className="w-full max-w-sm">
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-gray-600 text-sm">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-2">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative w-full mx-auto px-1 pt-8 pb-6">
          <div className="text-center">
            <div className="mx-auto mb-4 p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl w-fit shadow-lg">
              <img src="/favicon.png" alt="EchoMail Logo" className="h-8 w-8 mx-auto" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 leading-tight px-2">
              Send Personalized Emails with{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                EchoMail
              </span>
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mb-6 mx-auto leading-relaxed px-2">
              Send personalized emails at scale with EchoMail's powerful Gmail API integration. Upload CSV data, craft
              beautiful messages, and reach your audience with precision.
            </p>
            <div className="flex justify-center items-center mb-8">
              <AuthButton />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="w-full mx-auto px-2 py-6">
        <div className="text-center mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Everything you need to succeed</h2>
          <p className="text-sm text-gray-600 max-w-lg mx-auto">
            Powerful features designed to make your email campaigns more effective and efficient.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Feature Cards */}
          <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="p-2 bg-green-100 rounded-lg w-fit mb-3 group-hover:bg-green-200 transition-colors">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <CardTitle className="text-base font-semibold text-gray-900">CSV Personalization</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 leading-relaxed">
                Upload CSV files and automatically personalize emails with recipient data. Support for unlimited custom
                fields and smart placeholder replacement.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="p-2 bg-purple-100 rounded-lg w-fit mb-3 group-hover:bg-purple-200 transition-colors">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <CardTitle className="text-base font-semibold text-gray-900">Rich Text Editor</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 leading-relaxed">
                Create stunning emails with our advanced WYSIWYG editor. Add formatting, links, images, and more with
                professional styling options.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="p-2 bg-blue-100 rounded-lg w-fit mb-3 group-hover:bg-blue-200 transition-colors">
                <Send className="h-5 w-5 text-blue-600" />
              </div>
              <CardTitle className="text-base font-semibold text-gray-900">Gmail Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 leading-relaxed">
                Send directly through your Gmail account with full API integration. Maintain your sender reputation and
                deliverability.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="p-2 bg-orange-100 rounded-lg w-fit mb-3 group-hover:bg-orange-200 transition-colors">
                <Zap className="h-5 w-5 text-orange-600" />
              </div>
              <CardTitle className="text-base font-semibold text-gray-900">Bulk Sending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 leading-relaxed">
                Send hundreds of personalized emails with a single click. Real-time progress tracking and detailed
                delivery reports.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="p-2 bg-red-100 rounded-lg w-fit mb-3 group-hover:bg-red-200 transition-colors">
                <Shield className="h-5 w-5 text-red-600" />
              </div>
              <CardTitle className="text-base font-semibold text-gray-900">Secure & Private</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 leading-relaxed">
                Your data never leaves your control. Secure OAuth authentication and GDPR-compliant data handling with
                no storage.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="p-2 bg-indigo-100 rounded-lg w-fit mb-3 group-hover:bg-indigo-200 transition-colors">
                <Clock className="h-5 w-5 text-indigo-600" />
              </div>
              <CardTitle className="text-base font-semibold text-gray-900">Real-time Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 leading-relaxed">
                Preview your personalized emails before sending. See exactly how each recipient will receive their
                message.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="w-full mx-auto px-2 py-8">
        <Card className="bg-gradient-to-r from-gray-50 to-blue-50 border-0 shadow-lg">
          <CardContent className="text-center p-6">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Ready to get started?</h3>
            <p className="text-sm text-gray-600 mb-6 max-w-lg mx-auto">
              Join thousands of users who trust EchoMail for their email campaigns. Sign in with Google and start
              sending in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <AuthButton />
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                No credit card required
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Free to start
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                GDPR compliant
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
