"use client"

import { useState } from "react"
import { useSession, signIn } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

export default function TestEmailPage() {
  const { data: session } = useSession()
  const [testResult, setTestResult] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const testDatabaseTables = async () => {
    setIsLoading(true)
    try {
      // Test email_campaigns table
      const { data: campaigns, error: campaignsError } = await supabase
        .from("email_campaigns")
        .select("id")
        .limit(1)
      
      // Test contacts table
      const { data: contacts, error: contactsError } = await supabase
        .from("contacts")
        .select("id")
        .limit(1)
      
      let result = "🧪 Database Table Tests:\n\n"
      
      if (campaignsError) {
        result += `❌ email_campaigns table: ${campaignsError.message}\n`
      } else {
        result += `✅ email_campaigns table: EXISTS\n`
      }
      
      if (contactsError) {
        result += `❌ contacts table: ${contactsError.message}\n`
      } else {
        result += `✅ contacts table: EXISTS\n`
      }
      
      setTestResult(result)
    } catch (error) {
      setTestResult(`❌ Database test error: ${error}`)
    }
    setIsLoading(false)
  }

  const testSupabaseConnection = async () => {
    setIsLoading(true)
    try {
      // First test basic connection
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("id")
        .limit(1)
      
      if (error) {
        setTestResult(`❌ Supabase connection failed: ${error.message}`)
      } else {
        // Get count using a different approach
        const { count, error: countError } = await supabase
          .from("email_campaigns")
          .select("*", { count: "exact", head: true })
        
        if (countError) {
          setTestResult(`✅ Supabase connection successful, but count failed: ${countError.message}`)
        } else {
          setTestResult(`✅ Supabase connection successful! Found ${count || 0} campaigns`)
        }
      }
    } catch (error) {
      setTestResult(`❌ Supabase test error: ${error}`)
    }
    setIsLoading(false)
  }
  const testEmailSending = async () => {
    if (!session?.accessToken) {
      setTestResult("❌ Please sign in first - No access token available")
      return
    }

    if (!session?.user?.email) {
      setTestResult("❌ No user email available")
      return
    }

    setIsLoading(true)
    setTestResult("🔄 Sending test email...")

    try {
      // First test Gmail API access
      const gmailTest = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      })

      if (!gmailTest.ok) {
        const gmailError = await gmailTest.text()
        setTestResult(`❌ Gmail API access failed. Please refresh your authentication.\n\nError: ${gmailError}`)
        return
      }

      const testEmail = {
        to: session.user.email,
        subject: "Test Email from EchoMail - " + new Date().toLocaleTimeString(),
        message: "This is a test email to verify Supabase integration is working correctly. Sent at: " + new Date().toLocaleString(),
        originalRowData: {},
        attachments: []
      }

      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizedEmails: [testEmail]
        }),
      })

      const result = await response.json()
      
      if (response.ok) {
        setTestResult(`✅ Email API call completed!\n\nResponse: ${JSON.stringify(result, null, 2)}`)
        
        // Check if campaign was saved to Supabase
        setTimeout(async () => {
          const { data: campaigns, error } = await supabase
            .from("email_campaigns")
            .select("*")
            .eq("user_email", session.user?.email)
            .order("date", { ascending: false })
            .limit(1)
          
          if (!error && campaigns?.length > 0) {
            setTestResult(prev => prev + `\n\n✅ Campaign saved to Supabase:\n${JSON.stringify(campaigns[0], null, 2)}`)
          } else {
            setTestResult(prev => prev + `\n\n❌ Campaign not found in Supabase.\nError: ${error?.message || "No campaigns found"}`)
          }
        }, 3000)
      } else {
        setTestResult(`❌ Failed to send email:\n${JSON.stringify(result, null, 2)}`)
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error}`)
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Email & Supabase Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Button 
                onClick={testDatabaseTables}
                disabled={isLoading}
                className="w-full"
              >
                Test Database Tables
              </Button>
              
              <Button 
                onClick={testSupabaseConnection}
                disabled={isLoading}
                className="w-full"
              >
                Test Supabase Connection & Count
              </Button>
              
              <Button 
                onClick={testEmailSending}
                disabled={isLoading || !session}
                className="w-full"
              >
                Test Email Sending + Database Save
              </Button>
            </div>
            
            {testResult && (
              <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
              </div>
            )}
            
            {!session && (
              <div className="text-center space-y-4">
                <div className="text-gray-600">
                  Please sign in to test email functionality
                </div>
                <Button onClick={() => signIn('google')} className="w-full">
                  Sign in with Google
                </Button>
                <Link href="/auth/signin" className="block">
                  <Button variant="outline" className="w-full">
                    Go to Sign In Page
                  </Button>
                </Link>
              </div>
            )}

            {session && (
              <div className="text-center text-green-600 text-sm">
                ✅ Signed in as: {session.user?.email}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
