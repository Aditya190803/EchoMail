"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { db } from "@/lib/firebase"
import { 
  collection, 
  addDoc, 
  getDocs, 
  serverTimestamp 
} from "firebase/firestore"

export default function FirebaseTestPage() {
  const [testData, setTestData] = useState<any[]>([])
  const [testMessage, setTestMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const testFirebaseConnection = async () => {
    setIsLoading(true)
    try {
      console.log("Testing Firebase connection...")
      
      // Try to read from a test collection
      const testRef = collection(db, "test")
      const snapshot = await getDocs(testRef)
      
      const data: any[] = []
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() })
      })
      
      setTestData(data)
      console.log("Firebase read successful:", data)
      alert("Firebase read successful! Check console for details.")
      
    } catch (error) {
      console.error("Firebase read error:", error)
      alert("Firebase read error: " + (error as Error).message)
    }
    setIsLoading(false)
  }

  const addTestDocument = async () => {
    if (!testMessage.trim()) return
    
    setIsLoading(true)
    try {
      console.log("Adding test document...")
      
      const testRef = collection(db, "test")
      const docRef = await addDoc(testRef, {
        message: testMessage,
        timestamp: serverTimestamp(),
        created_at: new Date().toISOString()
      })
      
      console.log("Document added with ID:", docRef.id)
      setTestMessage("")
      
      // Refresh the data
      await testFirebaseConnection()
      
    } catch (error) {
      console.error("Firebase write error:", error)
      alert("Firebase write error: " + (error as Error).message)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    testFirebaseConnection()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Firebase Connection Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Enter test message"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={addTestDocument} 
                disabled={isLoading || !testMessage.trim()}
              >
                {isLoading ? "Adding..." : "Add Test Document"}
              </Button>
            </div>
            
            <Button 
              onClick={testFirebaseConnection} 
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? "Testing..." : "Test Firebase Read"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Data ({testData.length} documents)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testData.length > 0 ? (
                testData.map((item) => (
                  <div key={item.id} className="p-3 bg-gray-100 rounded">
                    <div><strong>ID:</strong> {item.id}</div>
                    <div><strong>Message:</strong> {item.message}</div>
                    <div><strong>Created:</strong> {item.created_at}</div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No test data found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
