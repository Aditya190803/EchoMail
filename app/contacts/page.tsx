"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/navbar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
  UserPlus,
  FileSpreadsheet,
} from "lucide-react"
import Link from "next/link"
import { db } from "@/lib/firebase"
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  Timestamp,
  getDocs
} from "firebase/firestore"
import { toast } from "sonner"

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

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const formatDate = (dateValue: string | Timestamp) => {
    if (!isMounted) return ""
    try {
      if (typeof dateValue === 'string') {
        return new Date(dateValue).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      } else if (dateValue && typeof dateValue.toDate === 'function') {
        return dateValue.toDate().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      }
      return "Invalid date"
    } catch {
      return "Invalid date"
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  useEffect(() => {
    if (!session?.user?.email) return
    
    const contactsRef = collection(db, "contacts")
    const q = query(
      contactsRef,
      where("user_email", "==", session.user.email)
    )
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const contactsData: Contact[] = []
      snapshot.forEach((doc) => {
        contactsData.push({
          id: doc.id,
          ...doc.data()
        } as Contact)
      })
      
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
      
      setContacts(contactsData)
    }, (error) => {
      console.error("Error fetching contacts:", error)
      toast.error("Failed to load contacts")
    })
    
    return () => unsubscribe()
  }, [session])

  const addContact = async () => {
    if (!session?.user?.email || !newContact.email.trim()) return
    
    setIsLoading(true)
    try {
      const contactsRef = collection(db, "contacts")
      await addDoc(contactsRef, {
        email: newContact.email.trim(),
        name: newContact.name.trim() || null,
        company: newContact.company.trim() || null,
        phone: newContact.phone.trim() || null,
        user_email: session.user.email,
        created_at: serverTimestamp()
      })
      
      setNewContact({ email: "", name: "", company: "", phone: "" })
      setShowAddForm(false)
      toast.success("Contact added successfully!")
    } catch (error) {
      console.error("Error adding contact:", error)
      toast.error("Failed to add contact")
    }
    setIsLoading(false)
  }

  const deleteContact = async (contactId: string) => {
    try {
      await deleteDoc(doc(db, "contacts", contactId))
      toast.success("Contact deleted")
    } catch (error) {
      console.error("Error deleting contact:", error)
      toast.error("Failed to delete contact")
    }
  }

  const exportContacts = () => {
    if (contacts.length === 0) {
      toast.error("No contacts to export")
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
    link.href = URL.createObjectURL(blob)
    link.download = `contacts_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    toast.success("Contacts exported!")
  }

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !session?.user?.email) return

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

        if (contactsToImport.length > 0) {
          const contactsRef = collection(db, "contacts")
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
              console.error("Error importing contact:", error)
            }
          }

          toast.success(`Successfully imported ${successCount} contacts`)
        } else {
          toast.error("No valid email addresses found")
        }
      } catch (error) {
        console.error("File processing error:", error)
        toast.error("Error processing file")
      }
    }
    
    reader.readAsText(file)
    event.target.value = ""
  }

  if (status === "loading" || !isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Loading contacts...</p>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") return null

  const filteredContacts = contacts.filter(contact =>
    contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.company?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Contacts</h1>
            <p className="text-muted-foreground">Manage your email contacts</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                  <DialogDescription>
                    Add a new contact to your list
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name *</label>
                    <Input
                      placeholder="John Doe"
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email *</label>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Company</label>
                    <Input
                      placeholder="Acme Corp"
                      value={newContact.company}
                      onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      placeholder="+1 (555) 123-4567"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={addContact} 
                      disabled={isLoading || !newContact.name.trim() || !newContact.email.trim()}
                      loading={isLoading}
                      className="flex-1"
                    >
                      Add Contact
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" onClick={exportContacts} disabled={contacts.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            
            <div className="relative">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileImport}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Search contacts by name, email, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Contacts Grid */}
        {filteredContacts.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {filteredContacts.length} of {contacts.length} contacts
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredContacts.map((contact) => (
                <Card key={contact.id} hover className="group">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1 min-w-0">
                        {contact.name && (
                          <h3 className="font-semibold text-foreground truncate mb-1">
                            {contact.name}
                          </h3>
                        )}
                        <div className="flex items-center gap-2 text-sm text-primary">
                          <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{contact.email}</span>
                        </div>
                      </div>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon-sm" 
                            className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {contact.name || contact.email}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteContact(contact.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    
                    <div className="space-y-2">
                      {contact.company && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{contact.company}</span>
                        </div>
                      )}
                      
                      {contact.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{contact.phone}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                      Added {formatDate(contact.created_at)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? "No contacts found" : "No contacts yet"}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  {searchTerm 
                    ? "Try adjusting your search terms"
                    : "Get started by adding your first contact or importing a CSV file"
                  }
                </p>
                {!searchTerm && (
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={() => setShowAddForm(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Contact
                    </Button>
                    <div className="relative">
                      <Button variant="outline">
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
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
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Action */}
        {contacts.length > 0 && (
          <Card className="mt-8 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Ready to send?</h3>
                  <p className="text-muted-foreground">
                    Use your contacts in an email campaign
                  </p>
                </div>
                <Button asChild>
                  <Link href="/compose">
                    <Mail className="h-4 w-4 mr-2" />
                    Compose Email
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
