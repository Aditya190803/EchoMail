"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function DebugPage() {
  const envVars = [
    { name: "GOOGLE_CLIENT_ID", value: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "Not set" },
    { name: "NEXTAUTH_URL", value: process.env.NEXT_PUBLIC_NEXTAUTH_URL || "Not set" },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Environment Variables (Public)</h3>
            <div className="space-y-2">
              {envVars.map((env) => (
                <div key={env.name} className="flex items-center justify-between">
                  <span className="font-mono text-sm">{env.name}</span>
                  <Badge variant={env.value === "Not set" ? "destructive" : "default"}>
                    {env.value === "Not set" ? "Not set" : "Set"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <p>Note: Secret environment variables are not shown for security reasons.</p>
            <p>Make sure GOOGLE_CLIENT_SECRET and NEXTAUTH_SECRET are set on the server.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
