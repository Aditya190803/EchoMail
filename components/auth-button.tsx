"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"

export function AuthButton() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <Button disabled>Loading...</Button>
  }

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm">Signed in as {session.user?.email}</span>
        <Button onClick={() => signOut()} variant="outline" size="sm">
          Sign Out
        </Button>
      </div>
    )
  }

  return <Button onClick={() => signIn("google")}>Sign in with Google</Button>
}
