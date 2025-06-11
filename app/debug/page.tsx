"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { testSupabaseConnection, supabase } from "@/lib/supabase"
import { Database, CheckCircle, XCircle, RefreshCw } from "lucide-react"

export default function DebugPage() {
  const [supabaseStatus, setSupabaseStatus] = useState<'loading' | 'success' | 'error' | 'untested'>('untested')
  const [supabaseError, setSupabaseError] = useState<string | null>(null)
  const [campaignCount, setCampaignCount] = useState<number | null>(null)
  const [contactCount, setContactCount] = useState<number | null>(null)

  const envVars = [
    { name: "GOOGLE_CLIENT_ID", value: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "Not set" },
    { name: "NEXTAUTH_URL", value: process.env.NEXT_PUBLIC_NEXTAUTH_URL || "Not set" },
    { name: "SUPABASE_URL", value: process.env.NEXT_PUBLIC_SUPABASE_URL || "Not set" },
    { name: "SUPABASE_ANON_KEY", value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Not set" },
  ]

  const testDatabase = async () => {
    setSupabaseStatus('loading')
    setSupabaseError(null)
    setCampaignCount(null)
    setContactCount(null)

    try {
      const connectionTest = await testSupabaseConnection()
      
      if (!connectionTest.success) {
        setSupabaseStatus('error')
        const errorMessage = connectionTest.error && typeof connectionTest.error === 'object' && 'message' in connectionTest.error
          ? (connectionTest.error as any).message
          : 'Connection failed'
        setSupabaseError(errorMessage)
        return
      }

      const [campaignsResult, contactsResult] = await Promise.all([
        supabase.from('email_campaigns').select('id', { count: 'exact' }),
        supabase.from('contacts').select('id', { count: 'exact' })
      ])

      if (campaignsResult.error || contactsResult.error) {
        setSupabaseStatus('error')
        setSupabaseError(campaignsResult.error?.message || contactsResult.error?.message || 'Table access error')
        return
      }

      setCampaignCount(campaignsResult.count || 0)
      setContactCount(contactsResult.count || 0)
      setSupabaseStatus('success')

    } catch (error) {
      setSupabaseStatus('error')
      setSupabaseError(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  useEffect(() => {
    testDatabase()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Debug Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Environment Variables</h3>
            <div className="space-y-2">
              {envVars.map((env) => (
                <div key={env.name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="font-mono text-sm">{env.name}</span>
                  <Badge variant={env.value === "Not set" ? "destructive" : "default"}>
                    {env.value === "Not set" ? "Not set" : env.value === "Set" ? "Set" : env.value.substring(0, 20) + "..."}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Supabase Connection</h3>
              <Button 
                onClick={testDatabase} 
                disabled={supabaseStatus === 'loading'}
                size="sm"
                variant="outline"
              >
                {supabaseStatus === 'loading' ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Test Connection
              </Button>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium">Database Connection</span>
                <div className="flex items-center gap-2">
                  {supabaseStatus === 'loading' && (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                      <Badge variant="secondary">Testing...</Badge>
                    </>
                  )}
                  {supabaseStatus === 'success' && (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <Badge variant="default" className="bg-green-100 text-green-800">Connected</Badge>
                    </>
                  )}
                  {supabaseStatus === 'error' && (
                    <>
                      <XCircle className="h-4 w-4 text-red-600" />
                      <Badge variant="destructive">Failed</Badge>
                    </>
                  )}
                  {supabaseStatus === 'untested' && (
                    <Badge variant="secondary">Not tested</Badge>
                  )}
                </div>
              </div>

              {supabaseError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-800">
                    <strong>Error:</strong> {supabaseError}
                  </p>
                </div>
              )}

              {supabaseStatus === 'success' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded text-center">
                    <p className="text-sm text-blue-600 font-medium">Email Campaigns</p>
                    <p className="text-2xl font-bold text-blue-800">{campaignCount}</p>
                  </div>
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded text-center">
                    <p className="text-sm text-purple-600 font-medium">Contacts</p>
                    <p className="text-2xl font-bold text-purple-800">{contactCount}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {supabaseStatus === 'error' && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
              <h4 className="font-semibold text-yellow-800 mb-2">Setup Instructions</h4>
              <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                <li>Check your <code>.env</code> file has correct Supabase credentials</li>
                <li>Go to your Supabase project → SQL Editor</li>
                <li>Run the contents of <code>schema.sql</code> to create tables</li>
                <li>Verify RLS policies are enabled and working</li>
                <li>Click "Test Connection" to verify</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
