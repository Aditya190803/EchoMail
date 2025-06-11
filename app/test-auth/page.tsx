"use client"

import { useSession } from "next-auth/react"
import { AuthButton } from "@/components/auth-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestAuth() {
  const { data: session, status } = useSession()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Auth Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <strong>Status:</strong> {status}
          </div>
          {session && (
            <div>
              <strong>User:</strong> {session.user?.email}
            </div>
          )}
          {session?.accessToken && (
            <div>
              <strong>Access Token:</strong> {session.accessToken.substring(0, 20)}...
            </div>
          )}
          <AuthButton />
        </CardContent>
      </Card>
    </div>
  )
}
