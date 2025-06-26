"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { ComposeForm } from "@/components/compose-form"
import { AuthButton } from "@/components/auth-button"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useIsClient } from "@/hooks/useIsClient"

export default function ComposePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isClient = useIsClient()

  useEffect(() => {
    if (isClient && status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router, isClient])

  // Show loading state until client hydration and session check complete
  if (!isClient || status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-2">
        <Card className="w-full max-w-sm">
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-sm">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-2">
        <Card className="w-full max-w-sm">
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <p className="text-red-600 mb-4 text-sm">Please sign in to access the email composer</p>
              <Button asChild size="sm">
                <Link href="/">Return to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10 flex-shrink-0">
        <div className="w-full px-2">
          <div className="flex flex-col sm:flex-row justify-between items-center py-2 gap-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/" className="flex items-center gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <div className="p-1 bg-blue-100 rounded-lg">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-gray-900">EchoMail Composer</h1>
                  <p className="text-xs text-gray-600">Signed in as {session?.user?.email}</p>
                </div>
              </div>
            </div>
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full py-3 px-1 overflow-auto pb-32">
        <div className="pb-8">
          <ComposeForm />
        </div>
      </main>
    </div>
  )
}
