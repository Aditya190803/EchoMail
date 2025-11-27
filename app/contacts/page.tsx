"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Users,
  Plus,
  Search,
  Trash2,
  Mail,
  Building,
  Phone,
  Download,
  Upload,
  CheckCircle,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { AuthButton } from "@/components/auth-button"
import { db } from "@/lib/firebase"
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  Timestamp,
  getDocs
} from "firebase/firestore"

interface Contact {
  id: string
  email: string
  name?: string
  company?: string
  phone?: string
  tags?: string[]
  created_at: Timestamp | string
  user_email: string
}

export default function ContactsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [newContact, setNewContact] = useState({
    email: "",
    name: "",
    company: "",
    phone: "",
  })
  const [importStatus, setImportStatus] = useState<string>("")
  const [firebaseStatus, setFirebaseStatus] = useState<string>("")
  // Test Firebase connection
  const testFirebase = async () => {
    try {
      setFirebaseStatus("Testing Firebase connection...")
      console.log("Testing Firebase connection...")
      
      // Try to read from contacts collection
      const contactsRef = collection(db, "contacts")
      const snapshot = await getDocs(contactsRef)
      
      console.log("Firebase read test successful, total docs count:", snapshot.size)
      
      // Try to read user-specific contacts
      if (session?.user?.email) {
        const userQuery = query(
          contactsRef,
          where("user_email", "==", session.user.email)
        )
        const userSnapshot = await getDocs(userQuery)
        console.log("User-specific contacts:", userSnapshot.size)
        
        setFirebaseStatus(`✅ Firebase connected! Total: ${snapshot.size} docs, Your contacts: ${userSnapshot.size}`)
      } else {
        setFirebaseStatus(`✅ Firebase connected! Found ${snapshot.size} documents in contacts collection.`)
      }
      
    } catch (error) {
      console.error("Firebase test error:", error)
      setFirebaseStatus(`❌ Firebase error: ${(error as Error).message}`)
    }
    
    setTimeout(() => setFirebaseStatus(""), 5000)
  }

  // Manual refresh function
  const refreshContacts = async () => {
    if (!session?.user?.email) return
    
    try {
      console.log("Manually refreshing contacts...")
      const contactsRef = collection(db, "contacts")
      const q = query(
        contactsRef,
        where("user_email", "==", session.user.email)
      )
      
      const snapshot = await getDocs(q)
      console.log("Manual refresh - found contacts:", snapshot.size)
      
      const contactsData: Contact[] = []
      snapshot.forEach((doc) => {
        console.log("Manual refresh doc:", doc.id, doc.data())
        contactsData.push({
          id: doc.id,
          ...doc.data()
        } as Contact)
      })
      
      setContacts(contactsData)
      setFirebaseStatus(`🔄 Manually refreshed: Found ${contactsData.length} contacts`)
      
      setTimeout(() => setFirebaseStatus(""), 3000)
      
    } catch (error) {
      console.error("Manual refresh error:", error)
      setFirebaseStatus(`❌ Refresh error: ${(error as Error).message}`)
      setTimeout(() => setFirebaseStatus(""), 5000)
    }
  }

  // Fix hydration mismatch by only rendering after mount
  useEffect(() => {
    setIsMounted(true)
  }, [])
  // Safe date formatting to prevent hydration mismatches
  const formatDate = (dateValue: string | Timestamp) => {
    if (!isMounted) return "" // Prevent SSR/client mismatch
    try {
      if (typeof dateValue === 'string') {
        return new Date(dateValue).toLocaleDateString()
      } else if (dateValue && typeof dateValue.toDate === 'function') {
        return dateValue.toDate().toLocaleDateString()
      }
      return "Invalid date"
    } catch (error) {
      return "Invalid date"
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])
  useEffect(() => {
    if (!session?.user?.email) {
      console.log("No user email, skipping contacts fetch")
      return
    }
    
    console.log("Setting up Firebase listener for user:", session.user.email)
    
    // Set up real-time listener for contacts
    const contactsRef = collection(db, "contacts")
    
    // First try to get all contacts to see if there are any
    getDocs(contactsRef).then((allSnapshot) => {
      console.log("Total contacts in database (all users):", allSnapshot.size)
      allSnapshot.forEach((doc) => {
        console.log("All contacts doc:", doc.id, doc.data())
      })
    }).catch((error) => {
      console.error("Error getting all contacts:", error)
    })
    
    const q = query(
      contactsRef,
      where("user_email", "==", session.user.email)
    )
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("Firebase snapshot received, docs count:", snapshot.size)
      const contactsData: Contact[] = []
      snapshot.forEach((doc) => {
        console.log("Contact doc:", doc.id, doc.data())
        contactsData.push({
          id: doc.id,
          ...doc.data()
        } as Contact)
      })
      
      // Sort client-side by created_at (newest first) to avoid needing a composite index
      contactsData.sort((a, b) => {
        const getDate = (timestamp: Timestamp | string | undefined): Date => {
          if (!timestamp) return new Date(0)
          if (typeof timestamp === 'string') return new Date(timestamp)
          if (timestamp.toDate) return timestamp.toDate()
          return new Date(0)
        }
        const dateA = getDate(a.created_at)
        const dateB = getDate(b.created_at)
        return dateB.getTime() - dateA.getTime()
      })
      
      console.log("Setting contacts:", contactsData)
      setContacts(contactsData)
    }, (error) => {
      console.error("Error fetching contacts:", error)
      // Try a simpler query without orderBy in case that's the issue
      console.log("Trying simpler query without orderBy...")
      const simpleQuery = query(
        contactsRef,
        where("user_email", "==", session.user.email)
      )
      
      getDocs(simpleQuery).then((simpleSnapshot) => {
        console.log("Simple query result:", simpleSnapshot.size)
        const contactsData: Contact[] = []
        simpleSnapshot.forEach((doc) => {
          contactsData.push({
            id: doc.id,
            ...doc.data()
          } as Contact)
        })
        setContacts(contactsData)
      }).catch((simpleError) => {
        console.error("Simple query also failed:", simpleError)
      })
    })
    
    return () => unsubscribe()
  }, [session])

  const addContact = async () => {
    if (!session?.user?.email || !newContact.email.trim()) {
      console.log("Cannot add contact - missing user email or contact email")
      return
    }
    
    console.log("Adding contact:", newContact, "for user:", session.user.email)
    setIsLoading(true)
    try {
      const contactsRef = collection(db, "contacts")
      const contactData = {
        email: newContact.email.trim(),
        name: newContact.name.trim() || null,
        company: newContact.company.trim() || null,
        phone: newContact.phone.trim() || null,
        user_email: session.user.email,
        created_at: serverTimestamp()
      }
      
      console.log("Contact data to save:", contactData)
      const docRef = await addDoc(contactsRef, contactData)
      console.log("Contact saved with ID:", docRef.id)
      
      setNewContact({ email: "", name: "", company: "", phone: "" })
      setShowAddForm(false)
    } catch (error) {
      console.error("Error adding contact:", error)
      alert("Failed to add contact. Please try again. Error: " + (error as Error).message)
    }
    setIsLoading(false)
  }
  const deleteContact = async (contactId: string) => {
    if (!session?.user?.email) return
    
    try {
      const contactRef = doc(db, "contacts", contactId)
      await deleteDoc(contactRef)
    } catch (error) {
      console.error("Error deleting contact:", error)
      alert("Failed to delete contact. Please try again.")
    }
  }

  const exportContacts = () => {
    if (contacts.length === 0) {
      alert("No contacts to export")
      return
    }

    const csvContent = [
      ["Email", "Name", "Company", "Phone"],
      ...contacts.map(contact => [
        contact.email,
        contact.name || "",
        contact.company || "",
        contact.phone || ""
      ])
    ].map(row => row.map(field => `"${field}"`).join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `contacts_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split('\n').filter(line => line.trim())
        
        const dataLines = lines.slice(1)
        
        const contactsToImport = dataLines
          .map(line => {
            const [email, name, company, phone] = line.split(',').map(field => 
              field.replace(/"/g, '').trim()
            )
            return { email, name, company, phone }
          })
          .filter(contact => contact.email && contact.email.includes('@'))

        if (contactsToImport.length > 0 && session?.user?.email) {
          const contactsRef = collection(db, "contacts")
          
          // Add contacts one by one for reliability
          let successCount = 0
          for (const contact of contactsToImport) {
            try {
              await addDoc(contactsRef, {
                email: contact.email,
                name: contact.name || null,
                company: contact.company || null,
                phone: contact.phone || null,
                user_email: session.user.email,
                created_at: serverTimestamp()
              })
              successCount++
            } catch (error) {
              console.error("Error importing contact:", contact.email, error)
            }
          }

          if (successCount > 0) {
            setImportStatus(`Successfully imported ${successCount} contacts`)
          } else {
            setImportStatus("Error importing contacts")
          }
        } else {
          setImportStatus("No valid email addresses found")
        }
      } catch (error) {
        console.error("File processing error:", error)
        setImportStatus("Error processing file")
      }

      setTimeout(() => setImportStatus(""), 3000)
    }
    
    reader.readAsText(file)
    event.target.value = ""
  }

  if (status === "loading" || !isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading contacts...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  const filteredContacts = contacts.filter(contact =>
    contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.company?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-6 gap-4">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 text-sm sm:text-base">
                ← Back to Dashboard
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Contacts</h1>
                <p className="text-sm sm:text-base text-gray-600">Manage your email contacts</p>
              </div>
            </div>
            <AuthButton />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Actions Bar */}
        <div className="mb-6 flex flex-col gap-4">
          {/* Search */}
          <div className="w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent className="mx-4 max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                </DialogHeader>                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name *</label>
                    <Input
                      placeholder="John Doe"
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Company</label>
                    <Input
                      placeholder="Acme Corp"
                      value={newContact.company}
                      onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <Input
                      placeholder="+1 (555) 123-4567"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={addContact} 
                      disabled={isLoading || !newContact.name.trim() || !newContact.email.trim()}
                      className="flex-1"
                    >
                      {isLoading ? "Adding..." : "Add Contact"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button 
              variant="outline" 
              onClick={exportContacts} 
              disabled={contacts.length === 0}
              className="w-full sm:w-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            
            <div className="relative w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileImport}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
            {/* Import Status */}
          {importStatus && (
            <div className={`p-3 rounded-md text-sm ${
              importStatus.includes("Successfully") 
                ? "bg-green-50 text-green-700 border border-green-200" 
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              <div className="flex items-center gap-2">
                {importStatus.includes("Successfully") ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {importStatus}
              </div>
            </div>
          )}
            {/* Firebase Test */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={testFirebase}
              className="text-xs"
              size="sm"
            >
              Test Firebase Connection
            </Button>
            <Button 
              variant="outline" 
              onClick={refreshContacts}
              className="text-xs"
              size="sm"
            >
              🔄 Refresh Contacts
            </Button>
          </div>
          
          {/* Firebase Status */}
          {firebaseStatus && (
            <div className={`p-3 rounded-md text-sm ${
              firebaseStatus.includes("✅") 
                ? "bg-green-50 text-green-700 border border-green-200" 
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {firebaseStatus}
            </div>
          )}
        </div>

        {/* Contacts Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => (
              <Card key={contact.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {contact.email}
                        </span>
                      </div>
                      
                      {contact.name && (
                        <div className="text-sm font-medium text-gray-800 mb-1">
                          {contact.name}
                        </div>
                      )}
                      
                      {contact.company && (
                        <div className="flex items-center gap-2 mb-1 text-sm text-gray-600">
                          <Building className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{contact.company}</span>
                        </div>
                      )}
                      
                      {contact.phone && (
                        <div className="flex items-center gap-2 mb-1 text-sm text-gray-600">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{contact.phone}</span>
                        </div>
                      )}
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 p-1 h-auto">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="mx-4 max-w-md">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {contact.email}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                          <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteContact(contact.id)}
                            className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Added {formatDate(contact.created_at)}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full">
              <Card>
                <CardContent className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? "No contacts found" : "No contacts yet"}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm 
                      ? "Try adjusting your search terms"
                      : "Get started by adding your first contact or importing a CSV file"
                    }
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setShowAddForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Contact
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {contacts.length > 0 && (
          <div className="mt-8">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Contact Summary</h3>
                    <p className="text-gray-600">
                      {filteredContacts.length} of {contacts.length} contacts shown
                    </p>
                  </div>
                  <div>
                    <Link href="/compose">
                      <Button className="w-full sm:w-auto">
                        <Mail className="h-4 w-4 mr-2" />
                        Compose Email
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
