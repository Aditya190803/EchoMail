"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
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
  Edit,
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
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
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
        const { data, error } = await supabase
          .from("contacts")
          .select("*")
          .eq("user_email", session.user.email)
          .order("created_at", { ascending: false })
        
        if (!error && data) {
          setContacts(data as Contact[])
        }
      } catch (e) {
        console.error("Failed to fetch contacts:", e)
      }
    }
    
    if (session?.user?.email) {
      fetchContacts()
    }
  }, [session])

  const addContact = async () => {
    if (!newContact.email || !session?.user?.email) return

    try {
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          email: newContact.email,
          name: newContact.name || null,
          company: newContact.company || null,
          phone: newContact.phone || null,
          user_email: session.user.email,
        })
        .select()

      if (!error && data) {
        setContacts([data[0] as Contact, ...contacts])
        setNewContact({ email: "", name: "", company: "", phone: "" })
        setShowAddForm(false)
      }
    } catch (e) {
      console.error("Failed to add contact:", e)
    }
  }

  const deleteContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", contactId)

      if (!error) {
        setContacts(contacts.filter(c => c.id !== contactId))
      }
    } catch (e) {
      console.error("Failed to delete contact:", e)
    }
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
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={addContact} 
                  disabled={!newContact.email}
                  size="sm"
                  className="flex-1"
                >
                  Add Contact
                </Button>
                <Button 
                  onClick={() => setShowAddForm(false)} 
                  variant="outline" 
                  size="sm"
                  className="flex-1"
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
                  <Button onClick={() => setShowAddForm(true)} size="sm">
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

        {/* Quick Actions */}
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Import/Export</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" size="sm" className="h-9">
                <Link href="/compose">
                  <Upload className="h-3 w-3 mr-1" />
                  Import CSV
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="h-9">
                <Download className="h-3 w-3 mr-1" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
