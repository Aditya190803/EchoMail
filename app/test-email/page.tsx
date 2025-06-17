"use client"

import { useState } from "react"
import { useSession, signIn } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore"
import { formatEmailHTML, getEmailPreviewHTML } from "@/lib/email-formatter"
import Link from "next/link"

export default function TestEmailPage() {
  const { data: session } = useSession()
  const [testResult, setTestResult] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const testDatabaseTables = async () => {
    setIsLoading(true)
    try {
      // Test email_campaigns collection
      const campaignsRef = collection(db, "email_campaigns")
      const campaignsSnapshot = await getDocs(query(campaignsRef, limit(1)))
      
      // Test contacts collection
      const contactsRef = collection(db, "contacts")
      const contactsSnapshot = await getDocs(query(contactsRef, limit(1)))
      
      let result = "🧪 Firebase Collection Tests:\n\n"
      
      try {
        result += `✅ email_campaigns collection: EXISTS (${campaignsSnapshot.size} docs)\n`
      } catch (error) {
        result += `❌ email_campaigns collection: ERROR - ${error}\n`
      }
      
      try {
        result += `✅ contacts collection: EXISTS (${contactsSnapshot.size} docs)\n`
      } catch (error) {
        result += `❌ contacts collection: ERROR - ${error}\n`
      }
      
      setTestResult(result)
    } catch (error) {
      setTestResult(`❌ Firebase test error: ${error}`)
    }
    setIsLoading(false)
  }

  const testFirebaseConnection = async () => {
    setIsLoading(true)
    try {
      // Test basic connection
      const campaignsRef = collection(db, "email_campaigns")
      const snapshot = await getDocs(query(campaignsRef, limit(1)))
      
      // Get count
      const allSnapshot = await getDocs(campaignsRef)
      
      setTestResult(`✅ Firebase connection successful! Found ${allSnapshot.size} campaigns`)
    } catch (error) {
      setTestResult(`❌ Firebase test error: ${error}`)
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
        message: "This is a test email to verify Firebase integration is working correctly. Sent at: " + new Date().toLocaleString(),
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
        
        // Check if campaign was saved to Firebase
        setTimeout(async () => {
          try {
            const campaignsRef = collection(db, "email_campaigns")
            const q = query(
              campaignsRef,
              where("user_email", "==", session.user?.email || ""),
              orderBy("date", "desc"),
              limit(1)
            )
            const snapshot = await getDocs(q)
            
            if (!snapshot.empty) {
              const latestCampaign = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() }
              setTestResult(prev => prev + `\n\n✅ Campaign saved to Firebase:\n${JSON.stringify(latestCampaign, null, 2)}`)
            } else {
              setTestResult(prev => prev + `\n\n❌ Campaign not found in Firebase.\nNo campaigns found`)
            }
          } catch (error) {
            setTestResult(prev => prev + `\n\n❌ Error checking Firebase: ${error}`)
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

  const testEmailFormatting = () => {
    const sampleHTML = `
      <h1>Sample Email Header</h1>
      <p>This is a test paragraph with <strong>bold text</strong> and <em>italic text</em>.</p>
      <p>Here's another paragraph with some spacing.</p>
      <ul>
        <li>First list item</li>
        <li>Second list item with <a href="https://example.com">a link</a></li>
        <li>Third list item</li>
      </ul>
      <blockquote>This is a quoted text block that should have proper indentation.</blockquote>
      <p>Final paragraph to test spacing.</p>
    `
    
    const formattedEmail = formatEmailHTML(sampleHTML)
    const previewEmail = getEmailPreviewHTML(sampleHTML)
    
    setTestResult(`📧 Email Formatting Test Results:\n\n✅ Email formatted successfully!\n\nFormatted HTML length: ${formattedEmail.length} characters\nPreview HTML length: ${previewEmail.length} characters\n\n🎯 The email will now have Gmail-like spacing and appearance when sent.`)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Email & Firebase Test</CardTitle>
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
                onClick={testFirebaseConnection}
                disabled={isLoading}
                className="w-full"
              >
                Test Firebase Connection & Count
              </Button>
              
              <Button 
                onClick={testEmailSending}
                disabled={isLoading || !session}
                className="w-full"
              >
                Test Email Sending + Database Save
              </Button>

              <Button 
                onClick={testEmailFormatting}
                disabled={isLoading}
                className="w-full"
              >
                Test Email Formatting
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
