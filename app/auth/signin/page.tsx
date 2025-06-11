"use client"

import { signIn, getSession } from "next-auth/react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail } from "lucide-react"

export default function SignIn() {
  const router = useRouter()

  useEffect(() => {
    getSession().then((session) => {
      if (session) {
        router.push("/")
      }
    })
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Mail className="h-6 w-6" />
            Sign In
          </CardTitle>
          <p className="text-gray-600">Sign in with your Google account to access Gmail API</p>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Mail className="h-4 w-4 mr-2" />
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
