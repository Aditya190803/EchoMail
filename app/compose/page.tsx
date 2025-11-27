"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { ComposeForm } from "@/components/compose-form"
import { Card, CardContent } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"
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

  if (!isClient || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Loading composer...</p>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <p className="text-destructive mb-4">Please sign in to access the email composer</p>
              <Button asChild>
                <Link href="/">Return to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-4xl w-full py-6 px-4 sm:px-6 lg:px-8 pb-32">
        <ComposeForm />
      </main>
    </div>
  )
}
