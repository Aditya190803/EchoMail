"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogOut, Mail } from "lucide-react"

export function AuthButton() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <Button disabled>Loading...</Button>
  }

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">Signed in as {session.user?.email}</span>
        <Button onClick={() => signOut()} variant="outline" size="sm">
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    )
  }

  return (
    <Button onClick={() => signIn("google")} className="bg-blue-600 hover:bg-blue-700">
      <Mail className="h-4 w-4 mr-2" />
      Sign in with Gmail
    </Button>
  )
}
