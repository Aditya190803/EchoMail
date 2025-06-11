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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Loading your workspace...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <div className="mx-auto mb-8 p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl w-fit shadow-lg">
              <Mail className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                EchoMail
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Send personalized emails at scale with EchoMail's powerful Gmail API integration. Upload CSV data, craft
              beautiful messages, and reach your audience with precision.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-12">
              <AuthButton />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Everything you need to succeed</h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            Powerful features designed to make your email campaigns more effective and efficient.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature Cards */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-1">
            <CardHeader className="pb-4">
              <div className="p-3 bg-green-100 rounded-xl w-fit mb-4 group-hover:bg-green-200 transition-colors">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">CSV Personalization</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 leading-relaxed">
                Upload CSV files and automatically personalize emails with recipient data. Support for unlimited custom
                fields and smart placeholder replacement.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-1">
            <CardHeader className="pb-4">
              <div className="p-3 bg-purple-100 rounded-xl w-fit mb-4 group-hover:bg-purple-200 transition-colors">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">Rich Text Editor</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 leading-relaxed">
                Create stunning emails with our advanced WYSIWYG editor. Add formatting, links, images, and more with
                professional styling options.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-1">
            <CardHeader className="pb-4">
              <div className="p-3 bg-blue-100 rounded-xl w-fit mb-4 group-hover:bg-blue-200 transition-colors">
                <Send className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">Gmail Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 leading-relaxed">
                Send directly through your Gmail account with full API integration. Maintain your sender reputation and
                deliverability.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-1">
            <CardHeader className="pb-4">
              <div className="p-3 bg-orange-100 rounded-xl w-fit mb-4 group-hover:bg-orange-200 transition-colors">
                <Zap className="h-6 w-6 text-orange-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">Bulk Sending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 leading-relaxed">
                Send hundreds of personalized emails with a single click. Real-time progress tracking and detailed
                delivery reports.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-1">
            <CardHeader className="pb-4">
              <div className="p-3 bg-red-100 rounded-xl w-fit mb-4 group-hover:bg-red-200 transition-colors">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">Secure & Private</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 leading-relaxed">
                Your data never leaves your control. Secure OAuth authentication and GDPR-compliant data handling with
                no storage.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-1">
            <CardHeader className="pb-4">
              <div className="p-3 bg-indigo-100 rounded-xl w-fit mb-4 group-hover:bg-indigo-200 transition-colors">
                <Clock className="h-6 w-6 text-indigo-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">Real-time Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 leading-relaxed">
                Preview your personalized emails before sending. See exactly how each recipient will receive their
                message.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats Section */}

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card className="bg-gradient-to-r from-gray-50 to-blue-50 border-0 shadow-xl">
          <CardContent className="text-center p-12">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Ready to get started?</h3>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of users who trust EchoMail for their email campaigns. Sign in with Google and start
              sending in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <AuthButton />
            </div>
            <div className="mt-8 flex items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Free to start
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                GDPR compliant
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
