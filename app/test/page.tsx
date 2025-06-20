"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { db } from "@/lib/firebase"
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp 
} from "firebase/firestore"
import { 
  Database, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Users, 
  Mail,
  Plus
} from "lucide-react"

export default function TestPage() {
  const { data: session } = useSession()
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'success' | 'error' | 'untested'>('untested')
  const [error, setError] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<any>({})
  const runFullTest = async () => {
    if (!session?.user?.email) {
      setError("Please sign in first")
      return
    }

    setConnectionStatus('loading')
    setError(null)
    const results: any = {}

    try {
      // Test 1: Basic connection
      const campaignsRef = collection(db, "email_campaigns")
      const contactsRef = collection(db, "contacts")
      
      // Test reading collections
      await getDocs(query(campaignsRef))
      await getDocs(query(contactsRef))
      results.connection = true

      // Test 2: Create a test contact
      const testContactData = {
        email: "test@example.com",
        name: "Test Contact",
        company: "Test Company",
        user_email: session.user.email,
        created_at: serverTimestamp()
      }

      const contactDocRef = await addDoc(contactsRef, testContactData)
      results.contactInsert = !!contactDocRef.id

      // Test 3: Read contacts
      const contactsQuery = query(contactsRef, where("user_email", "==", session.user.email))
      const contactsSnapshot = await getDocs(contactsQuery)
      results.contactRead = !contactsSnapshot.empty

      // Test 4: Create test campaign
      const testCampaignData = {
        subject: "Test Campaign",
        recipients: 1,
        sent: 1,
        failed: 0,
        user_email: session.user.email,
        date: serverTimestamp(),
        status: "completed"
      }

      const campaignDocRef = await addDoc(campaignsRef, testCampaignData)
      results.campaignInsert = !!campaignDocRef.id

      // Test 5: Read campaigns
      const campaignsQuery = query(campaignsRef, where("user_email", "==", session.user.email))
      const campaignsSnapshot = await getDocs(campaignsQuery)
      results.campaignRead = !campaignsSnapshot.empty

      // Clean up test data
      if (contactDocRef.id) {
        await deleteDoc(doc(db, "contacts", contactDocRef.id))
      }

      if (campaignDocRef.id) {
        await deleteDoc(doc(db, "email_campaigns", campaignDocRef.id))
      }

      setTestResults(results)
      setConnectionStatus('success')

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setConnectionStatus('error')
      setTestResults(results)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-lg font-semibold mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-4">Please sign in to test the database integration.</p>
            <Button asChild>
              <a href="/auth/signin">Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            EchoMail Database Integration Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <Button 
              onClick={runFullTest} 
              disabled={connectionStatus === 'loading'}
              className="mb-4"
            >
              {connectionStatus === 'loading' ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Run Full Integration Test
            </Button>
          </div>

          {/* Test Results */}
          {connectionStatus !== 'untested' && (
            <div className="space-y-3">
              <h3 className="font-semibold">Test Results:</h3>
              
              {Object.entries(testResults).map(([test, success]) => (
                <div key={test} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-medium">{formatTestName(test)}</span>
                  <div className="flex items-center gap-2">
                    {success ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <Badge className="bg-green-100 text-green-800">Pass</Badge>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-600" />
                        <Badge variant="destructive">Fail</Badge>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-800">
                <strong>Error:</strong> {error}
              </p>
            </div>
          )}

          {/* Success Message */}
          {connectionStatus === 'success' && !error && (
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <h4 className="font-semibold text-green-800 mb-2">🎉 All Tests Passed!</h4>
              <p className="text-sm text-green-700">
                Your Firebase integration is working correctly. You can now:
              </p>
              <ul className="text-sm text-green-700 mt-2 list-disc list-inside">
                <li>Manage contacts in the contacts page</li>
                <li>Send emails with contact selection</li>
                <li>View campaign analytics</li>
                <li>Track email performance</li>
              </ul>
            </div>
          )}

          {/* Quick Actions */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Quick Actions:</h4>
            <div className="grid grid-cols-2 gap-3">
              <Button asChild variant="outline">
                <a href="/contacts">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Contacts
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href="/compose">
                  <Mail className="h-4 w-4 mr-2" />
                  Compose Email
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href="/dashboard">
                  <Database className="h-4 w-4 mr-2" />
                  View Dashboard
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href="/debug">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Debug Info
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function formatTestName(test: string): string {
  const names: Record<string, string> = {
    connection: "Database Connection",
    contactInsert: "Contact Creation",
    contactRead: "Contact Reading",
    campaignInsert: "Campaign Creation", 
    campaignRead: "Campaign Reading"
  }
  return names[test] || test
}
