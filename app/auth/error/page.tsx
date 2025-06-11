"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
        <p className="mb-4">
          An error occurred during authentication: <strong>{error || "Unknown error"}</strong>
        </p>
        <div className="bg-gray-100 p-4 rounded mb-4">
          <pre className="text-xs overflow-auto">{error}</pre>
        </div>
        <div className="flex justify-between">
          <Link href="/" className="text-blue-600 hover:underline">
            Return Home
          </Link>
          <Link href="/env-check" className="text-blue-600 hover:underline">
            Check Environment
          </Link>
        </div>
      </div>
    </div>
  )
}
