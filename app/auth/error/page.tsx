"use client"

import { useEffect, useState } from "react"

import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"

import { AlertTriangle, Home, Settings, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"



export default function AuthError() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get error from URL params
    const errorParam = searchParams.get("error")
    setError(errorParam)
    setIsLoading(false)
  }, [searchParams])

  const getErrorMessage = (errorType: string | null) => {
    switch (errorType) {
      case "Configuration":
        return "There is a problem with the server configuration. Please check your environment variables."
      case "AccessDenied":
        return "Access was denied. You may not have permission to sign in."
      case "Verification":
        return "The verification token has expired or has already been used."
      case "OAuthSignin":
        return "Error in constructing an authorization URL."
      case "OAuthCallback":
        return "Error in handling the response from an OAuth provider."
      case "OAuthCreateAccount":
        return "Could not create OAuth provider user in the database."
      case "EmailCreateAccount":
        return "Could not create email provider user in the database."
      case "Callback":
        return "Error in the OAuth callback handler route."
      case "OAuthAccountNotLinked":
        return "The email on the account is already linked, but not with this OAuth account."
      case "EmailSignin":
        return "Sending the e-mail with the verification token failed."
      case "CredentialsSignin":
        return "The authorize callback returned null in the Credentials provider."
      case "SessionRequired":
        return "The content of this page requires you to be signed in at all times."
      case "Default":
        return "An unexpected error occurred during authentication."
      default:
        return error ? `Authentication error: ${error}` : "An unknown authentication error occurred."
    }
  }

  const getErrorSolution = (errorType: string | null) => {
    switch (errorType) {
      case "Configuration":
        return "Please ensure all required environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET, NEXTAUTH_URL) are set correctly."
      case "AccessDenied":
        return "Please try signing in again or contact support if the issue persists."
      case "Verification":
        return "Please try the sign-in process again."
      case "OAuthSignin":
      case "OAuthCallback":
      case "OAuthCreateAccount":
        return "There may be an issue with the OAuth configuration. Please check your Google OAuth settings."
      case "OAuthAccountNotLinked":
        return "Try signing in with a different method or contact support to link your accounts."
      default:
        return "Please try again or contact support if the issue continues."
    }
  }

  const handleRetry = () => {
    setIsLoading(true)
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-xl text-red-600">Authentication Error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-gray-700 mb-3 font-medium">{getErrorMessage(error)}</p>
            <p className="text-sm text-gray-600">{getErrorSolution(error)}</p>
          </div>

          {error && (
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-xs text-gray-600 mb-2 font-medium">Error Details:</p>
              <code className="text-sm font-mono text-red-600 bg-red-50 p-2 rounded block">{error}</code>
            </div>
          )}

          <div className="space-y-3">
            <Button onClick={handleRetry} className="w-full" disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Try Again
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" asChild>
                <Link href="/" className="flex items-center justify-center gap-2">
                  <Home className="h-4 w-4" />
                  Home
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/env-check" className="flex items-center justify-center gap-2">
                  <Settings className="h-4 w-4" />
                  Config
                </Link>
              </Button>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              If this error persists, please check your environment configuration or contact support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
