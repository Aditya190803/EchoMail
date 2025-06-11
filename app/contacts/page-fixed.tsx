"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Calendar,
  Upload,
  Download,
  ArrowLeft,
  Trash2,
  AlertCircle,
  CheckCircle,
} from "lucide-react"
import Link from "next/link"
import { AuthButton } from "@/components/auth-button"
import { supabase } from "@/lib/supabase"

interface Contact {
  id: string
  email: string
  name?: string
  company?: string
  phone?: string
  tags?: string[]
  created_at: string
  user_email: string
}

export default function ContactsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [newContact, setNewContact] = useState({
    email: "",
    name: "",
    company: "",
    phone: "",
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  useEffect(() => {
    async function fetchContacts() {
      if (!session?.user?.email) return
      
      try {
        setIsLoading(true)
        setError(null)
        
        const { data, error } = await supabase
          .from("contacts")
          .select("*")
          .eq("user_email", session.user.email)
          .order("created_at", { ascending: false })
        
        if (error) {
          console.error("Supabase error:", error)
          setError(`Failed to fetch contacts: ${error.message}`)
        } else if (data) {
          setContacts(data as Contact[])
        }
      } catch (e) {
        console.error("Failed to fetch contacts:", e)
        setError("Failed to fetch contacts. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }
    
    if (session?.user?.email) {
      // Initial fetch
      fetchContacts()
      
      // Set up real-time subscription
      const channel = supabase
        .channel('contacts_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'contacts',
            filter: `user_email=eq.${session.user.email}`
          },
          (payload) => {
            console.log('Real-time contact update:', payload)
            // Refetch data when any change occurs
            fetchContacts()
          }
        )
        .subscribe()
      
      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [session])

  const addContact = async () => {
    if (!newContact.email || !session?.user?.email) return

    try {
      setIsLoading(true)
      setError(null)
      
      console.log("Adding contact:", newContact)
      console.log("User email:", session.user.email)
      
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          email: newContact.email.trim(),
          name: newContact.name.trim() || null,
          company: newContact.company.trim() || null,
          phone: newContact.phone.trim() || null,
          user_email: session.user.email,
        })
        .select()

      console.log("Supabase response:", { data, error })

      if (error) {
        console.error("Supabase insert error:", error)
        setError(`Failed to add contact: ${error.message}`)
      } else if (data && data.length > 0) {
        setContacts([data[0] as Contact, ...contacts])
        setNewContact({ email: "", name: "", company: "", phone: "" })
        setShowAddForm(false)
        setSuccess("Contact added successfully!")
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (e) {
      console.error("Failed to add contact:", e)
      setError("Failed to add contact. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const deleteContact = async (contactId: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return

    try {
      setIsLoading(true)
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", contactId)

      if (error) {
        console.error("Delete error:", error)
        setError(`Failed to delete contact: ${error.message}`)
      } else {
        setContacts(contacts.filter(c => c.id !== contactId))
        setSuccess("Contact deleted successfully!")
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (e) {
      console.error("Failed to delete contact:", e)
      setError("Failed to delete contact. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const csv = e.target?.result as string
        const lines = csv.split('\n').filter(line => line.trim())
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
        
        const emailIndex = headers.findIndex(h => h.includes('email'))
        const nameIndex = headers.findIndex(h => h.includes('name'))
        const companyIndex = headers.findIndex(h => h.includes('company'))
        const phoneIndex = headers.findIndex(h => h.includes('phone'))

        if (emailIndex === -1) {
          setError("CSV must have an 'email' column")
          return
        }

        const contactsToImport = []
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
          if (values[emailIndex] && values[emailIndex].includes('@')) {
            contactsToImport.push({
              email: values[emailIndex],
              name: nameIndex >= 0 ? values[nameIndex] : null,
              company: companyIndex >= 0 ? values[companyIndex] : null,
              phone: phoneIndex >= 0 ? values[phoneIndex] : null,
              user_email: session?.user?.email
            })
          }
        }

        if (contactsToImport.length === 0) {
          setError("No valid contacts found in CSV")
          return
        }

        setIsLoading(true)
        const { data, error } = await supabase
          .from("contacts")
          .insert(contactsToImport)
          .select()

        if (error) {
          setError(`Failed to import contacts: ${error.message}`)
        } else {
          setSuccess(`Successfully imported ${contactsToImport.length} contacts!`)
          // Refresh contacts list
          setTimeout(() => {
            setSuccess(null)
            window.location.reload()
          }, 2000)
        }
      } catch (e) {
        setError("Failed to parse CSV file")
      } finally {
        setIsLoading(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    }
    reader.readAsText(file)
  }

  const handleCSVExport = () => {
    if (contacts.length === 0) {
      setError("No contacts to export")
      return
    }

    const csvHeaders = "Email,Name,Company,Phone,Created Date\n"
    const csvData = contacts.map(contact => 
      `"${contact.email}","${contact.name || ''}","${contact.company || ''}","${contact.phone || ''}","${new Date(contact.created_at).toLocaleDateString()}"`
    ).join('\n')

    const csvContent = csvHeaders + csvData
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `contacts_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
    
    setSuccess("Contacts exported successfully!")
    setTimeout(() => setSuccess(null), 3000)
  }

  const filteredContacts = contacts.filter(contact =>
    contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contact.name && contact.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (contact.company && contact.company.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="w-full px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-gray-900 leading-tight">Contacts</h1>
                  <p className="text-xs text-gray-600 leading-tight">{contacts.length} total contacts</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setShowAddForm(!showAddForm)} 
                size="sm" 
                className="h-8 px-2"
                disabled={isLoading}
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Add
              </Button>
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full flex-1 px-2 pt-3 pb-4 space-y-3">
        {/* Error/Success Messages */}
        {error && (
          <Card className="w-full border-red-200 bg-red-50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
                <Button 
                  onClick={() => setError(null)} 
                  variant="ghost" 
                  size="sm" 
                  className="ml-auto h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card className="w-full border-green-200 bg-green-50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">{success}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <Card className="w-full">
          <CardContent className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Add Contact Form */}
        {showAddForm && (
          <Card className="w-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Add New Contact</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                  placeholder="contact@example.com"
                  className="h-9 text-sm"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs">Name</Label>
                <Input
                  id="name"
                  value={newContact.name}
                  onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                  placeholder="John Doe"
                  className="h-9 text-sm"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company" className="text-xs">Company</Label>
                <Input
                  id="company"
                  value={newContact.company}
                  onChange={(e) => setNewContact({...newContact, company: e.target.value})}
                  placeholder="Acme Corp"
                  className="h-9 text-sm"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs">Phone</Label>
                <Input
                  id="phone"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                  placeholder="+1 (555) 123-4567"
                  className="h-9 text-sm"
                  disabled={isLoading}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={addContact} 
                  disabled={!newContact.email || isLoading}
                  size="sm"
                  className="flex-1"
                >
                  {isLoading ? "Adding..." : "Add Contact"}
                </Button>
                <Button 
                  onClick={() => setShowAddForm(false)} 
                  variant="outline" 
                  size="sm"
                  className="flex-1"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contacts List */}
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" />
              Your Contacts ({filteredContacts.length})
              {isLoading && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {filteredContacts.length === 0 ? (
              <div className="text-center py-6">
                <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <h3 className="text-sm font-medium text-gray-900 mb-1">
                  {contacts.length === 0 ? "No contacts yet" : "No matching contacts"}
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  {contacts.length === 0 ? "Add your first contact to get started" : "Try adjusting your search terms"}
                </p>
                {contacts.length === 0 && (
                  <Button onClick={() => setShowAddForm(true)} size="sm" disabled={isLoading}>
                    <UserPlus className="h-3 w-3 mr-1" />
                    Add Contact
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex flex-col gap-2 p-2.5 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div className="p-1 bg-white rounded-lg mt-0.5">
                        <Mail className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900">
                          {contact.name || contact.email}
                        </h4>
                        <div className="space-y-1">
                          <p className="text-xs text-gray-600">{contact.email}</p>
                          {contact.company && (
                            <p className="text-xs text-gray-600">{contact.company}</p>
                          )}
                          {contact.phone && (
                            <p className="text-xs text-gray-600">{contact.phone}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            Added {new Date(contact.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={() => deleteContact(contact.id)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={isLoading}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import/Export */}
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Import/Export</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                variant="outline" 
                size="sm" 
                className="h-9"
                disabled={isLoading}
              >
                <Upload className="h-3 w-3 mr-1" />
                Import CSV
              </Button>
              <Button 
                onClick={handleCSVExport} 
                variant="outline" 
                size="sm" 
                className="h-9"
                disabled={isLoading || contacts.length === 0}
              >
                <Download className="h-3 w-3 mr-1" />
                Export CSV
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
            />
            <p className="text-xs text-gray-500 mt-2">
              CSV format: Email, Name, Company, Phone
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
