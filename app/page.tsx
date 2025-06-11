"use client"

import { useSession } from "next-auth/react"
import { AuthButton } from "@/components/auth-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  const { data: session, status } = useSession()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email Sender App</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm">
              Authentication Status: <strong>{status}</strong>
            </div>
            {session && (
              <div className="text-sm">
                User: <strong>{session.user?.email}</strong>
              </div>
            )}
          </div>
          <div className="pt-4">
            <AuthButton />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
