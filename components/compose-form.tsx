"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Paperclip, Eye, X, Send, CheckCircle, AlertCircle, Users, FileText, Plus, Trash2, Search } from "lucide-react"
import { CSVUpload } from "./csv-upload"
import { EmailPreview } from "./email-preview"
import { RichTextEditor } from "./rich-text-editor"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { db } from "@/lib/firebase"
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  addDoc,
  serverTimestamp
} from "firebase/firestore"
import type { CSVRow, PersonalizedEmail, SendStatus, AttachmentData } from "@/types/email"

interface Contact {
  id: string
  email: string
  name?: string
  company?: string
}

// Simple client-side placeholder replacement for HTML content
function replacePlaceholders(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match)
}

// Convert File to base64
async function fileToBase64(file: File): Promise<AttachmentData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      const base64Data = result.split(",")[1]
      resolve({
        name: file.name,
        type: file.type,
        data: base64Data,
      })
    }
    reader.onerror = reject
  })
}

interface ManualEmail {
  email: string
  name: string
  [key: string]: string
}

export function ComposeForm() {
  const { data: session } = useSession()
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [csvData, setCsvData] = useState<CSVRow[]>([])
  const [manualEmails, setManualEmails] = useState<ManualEmail[]>([{ email: "", name: "" }])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([])
  const [contactSearch, setContactSearch] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [sendStatus, setSendStatus] = useState<SendStatus[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [sendProgress, setSendProgress] = useState(0)
  const [activeTab, setActiveTab] = useState("csv")
  const [campaignSaved, setCampaignSaved] = useState(false)

  // Upload attachments to Cloudinary via API
  const uploadAttachments = async (attachmentFiles: File[]): Promise<{url: string, public_id: string, fileName: string, fileSize: number}[]> => {
    try {
      const formData = new FormData()
      attachmentFiles.forEach(file => {
        formData.append('files', file)
      })

      const response = await fetch('/api/upload-attachment', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error('Upload failed')
      }

      // Return only successful uploads
      return result.uploads
        .filter((upload: any) => !upload.error)
        .map((upload: any) => ({
          url: upload.url,
          public_id: upload.public_id,
          fileName: upload.fileName,
          fileSize: upload.fileSize
        }))
    } catch (error) {
      console.error('Error uploading attachments:', error)
      throw error
    }
  }
  // Save campaign data to Firebase  // Save campaign data to Firebase
  const saveCampaignData = async (emailData: any[], sendResults: SendStatus[], attachmentData: {url: string, public_id: string, fileName: string, fileSize: number}[]) => {
    if (!session?.user?.email || campaignSaved) return // Prevent duplicate saves
    
    setCampaignSaved(true) // Mark as saved
    
    try {
      const campaignsRef = collection(db, "email_campaigns")
      
      // Count successful and failed sends
      const sentCount = sendResults.filter(result => result.status === "success").length
      const failedCount = sendResults.filter(result => result.status === "error").length
      
      // Prepare recipient list (email addresses) - ensure we get the email from each data structure
      const recipients = emailData.map(item => {
        if (typeof item === 'string') return item
        if (item.email) return item.email
        if (item.to) return item.to
        return ''
      }).filter(Boolean)
      
      // Prepare attachment data with Cloudinary info
      const attachmentInfo = attachmentData.map((attachment) => ({
        fileName: attachment.fileName,
        fileUrl: attachment.url,
        fileSize: attachment.fileSize,
        cloudinary_public_id: attachment.public_id
      }))
      
      const campaignData = {
        subject: subject.trim(),
        content: message.trim(),
        recipients: recipients,
        sent: sentCount,
        failed: failedCount,
        status: failedCount > 0 ? (sentCount > 0 ? "completed" : "failed") : "completed",
        user_email: session.user.email,
        created_at: serverTimestamp(),
        campaign_type: activeTab === "csv" ? "bulk" : activeTab === "contacts" ? "contact_list" : "manual",
        attachments: attachmentInfo.length > 0 ? attachmentInfo : undefined,
        send_results: sendResults // Store detailed results
      }
      
      console.log("Saving campaign data:", {
        subject: campaignData.subject,
        recipients: `Array of ${recipients.length} emails`,
        sent: sentCount,
        failed: failedCount,
        status: campaignData.status,
        content: campaignData.content.substring(0, 100) + "..."
      })
      
      // Validate data before saving
      if (recipients.length === 0) {
        console.error("Cannot save campaign: No recipients found")
        return
      }
      
      if (!campaignData.subject.trim()) {
        console.error("Cannot save campaign: No subject")
        return
      }
      
      await addDoc(campaignsRef, campaignData)
      console.log("Campaign data saved successfully to Firebase")
    } catch (error) {
      console.error("Error saving campaign data:", error)
    }
  }// Fetch contacts from Firebase
  useEffect(() => {
    if (!session?.user?.email) return

    // Set up real-time listener for contacts
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
      
      // Sort contacts client-side by name
      contactsData.sort((a, b) => {
        const nameA = (a.name || a.email || "").toLowerCase()
        const nameB = (b.name || b.email || "").toLowerCase()
        return nameA.localeCompare(nameB)
      })
      
      setContacts(contactsData)
    }, (error) => {
      console.error("Error fetching contacts:", error)
    })
    
    return () => unsubscribe()
  }, [session])

  // Contact selection functions
  const toggleContactSelection = (contact: Contact) => {
    setSelectedContacts(prev => {
      const isSelected = prev.find(c => c.id === contact.id)
      if (isSelected) {
        return prev.filter(c => c.id !== contact.id)
      } else {
        return [...prev, contact]
      }
    })
  }

  const selectAllFilteredContacts = () => {
    const filtered = getFilteredContacts()
    setSelectedContacts(prev => {
      const newSelections = filtered.filter(contact => !prev.find(c => c.id === contact.id))
      return [...prev, ...newSelections]
    })
  }

  const clearContactSelection = () => {
    setSelectedContacts([])
  }

  const getFilteredContacts = () => {
    return contacts.filter(contact =>
      contact.email.toLowerCase().includes(contactSearch.toLowerCase()) ||
      (contact.name && contact.name.toLowerCase().includes(contactSearch.toLowerCase())) ||
      (contact.company && contact.company.toLowerCase().includes(contactSearch.toLowerCase()))
    )
  }

  const handleFileAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments((prev) => [...prev, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const addManualEmail = () => {
    setManualEmails((prev) => [...prev, { email: "", name: "" }])
  }

  const removeManualEmail = (index: number) => {
    setManualEmails((prev) => prev.filter((_, i) => i !== index))
  }
  const updateManualEmail = (index: number, field: string, value: string) => {
    setManualEmails((prev) => prev.map((email, i) => (i === index ? { ...email, [field]: value } : email)))
  }

  const generatePersonalizedEmails = async (): Promise<PersonalizedEmail[]> => {
    const attachmentData: AttachmentData[] = []
    for (const file of attachments) {
      try {
        const base64Attachment = await fileToBase64(file)
        attachmentData.push(base64Attachment)
      } catch (error) {
        console.error(`Failed to convert file ${file.name} to base64:`, error)
      }
    }

    let emailData: any[] = []
    if (activeTab === "csv") {
      emailData = csvData || []
    } else if (activeTab === "manual") {
      emailData = (manualEmails || []).filter((email) => email.email.trim())
    } else if (activeTab === "contacts") {
      emailData = (selectedContacts || []).map(contact => ({
        email: contact.email,
        name: contact.name || "",
        company: contact.company || ""
      }))
    }

    // Ensure emailData is always an array before mapping
    if (!Array.isArray(emailData)) {
      emailData = []
    }

    return emailData.map((row) => ({
      to: row.email,
      subject: replacePlaceholders(subject, row),
      message: replacePlaceholders(message, row),
      originalRowData: row,
      attachments: attachmentData,
    }))
  }
  const handlePreview = async () => {
    let emailData: any[] = []
    if (activeTab === "csv") {
      emailData = csvData || []
    } else if (activeTab === "manual") {
      emailData = (manualEmails || []).filter((email) => email.email.trim())
    } else if (activeTab === "contacts") {
      emailData = selectedContacts || []
    }

    if (emailData.length === 0) {
      alert("Please add email recipients first")
      return
    }
    if (!subject.trim() || !message.trim()) {
      alert("Please fill in subject and message")
      return    }
    setShowPreview(true)
  }
  
  const handleSend = async () => {
    if (isLoading) return // Prevent duplicate calls
    
    setIsLoading(true)
    setSendStatus([])
    setShowSuccess(false)
    setSendProgress(0)

    try {
      const personalizedEmails = await generatePersonalizedEmails()

      const initialStatus = personalizedEmails.map((email) => ({
        email: email.to,
        status: "pending" as const,
      }))
      setSendStatus(initialStatus)      // Upload attachments to Cloudinary first
      let attachmentData: {url: string, public_id: string, fileName: string, fileSize: number}[] = []
      if (attachments.length > 0) {
        setSendProgress(10) // 10% for uploading attachments
        attachmentData = await uploadAttachments(attachments)
        setSendProgress(30) // 30% after attachments uploaded
      }

      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },        body: JSON.stringify({
          personalizedEmails,
        }),
      })

      const data = await response.json()
      const results = data.results || []
      setSendStatus(results)

      console.log("Email sending results:", {
        totalEmails: personalizedEmails.length,
        results: results,
        summary: data.summary
      })

      const successCount = results.filter((result: SendStatus) => result.status === "success").length
      const totalCount = results.length
      setSendProgress(90) // 90% after emails sent

      // Use personalizedEmails to get the actual recipient list for campaign storage
      const recipientData = personalizedEmails.map(email => ({
        email: email.to,
        originalData: email.originalRowData
      }))

      // Save campaign data to Firebase
      await saveCampaignData(recipientData, results, attachmentData)
      setSendProgress(100) // 100% after saving campaign data

      if (successCount === totalCount) {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 5000)
      }
    } catch (error) {
      console.error("Failed to send emails:", error)
      setSendStatus((prev) =>
        (prev || []).map((status) => ({
          ...status,
          status: "error" as const,
          error: "Network error",
        }))
      )
    } finally {
      setIsLoading(false)
      setShowPreview(false)
    }
  }
  
  const getPersonalizedEmailsForPreview = (): PersonalizedEmail[] => {
    let emailData: any[] = []
    if (activeTab === "csv") {
      emailData = csvData || []
    } else if (activeTab === "manual") {
      emailData = (manualEmails || []).filter((email) => email.email.trim())
    } else if (activeTab === "contacts") {
      emailData = (selectedContacts || []).map(contact => ({
        email: contact.email,
        name: contact.name || "",
        company: contact.company || ""
      }))
    }

    // Ensure emailData is always an array before mapping
    if (!Array.isArray(emailData)) {
      emailData = []
    }

    return emailData.map((row) => ({
      to: row.email,
      subject: replacePlaceholders(subject, row),
      message: replacePlaceholders(message, row),
      originalRowData: row,
      attachments: (attachments || []).map((file) => ({
        name: file.name,
        type: file.type,
        data: "",
      })),
    }))
  }
  
  const personalizedEmailsForPreview = getPersonalizedEmailsForPreview()
  const successCount = (sendStatus || []).filter((status) => status.status === "success").length
  const errorCount = (sendStatus || []).filter((status) => status.status === "error").length
  
  let emailData: any[] = []
  if (activeTab === "csv") {
    emailData = csvData || []
  } else if (activeTab === "manual") {
    emailData = (manualEmails || []).filter((email) => email.email.trim())
  } else if (activeTab === "contacts") {
    emailData = selectedContacts || []
  }
  
  const canSend = subject.trim() && message.trim() && emailData.length > 0

  return (
    <div className="space-y-3 w-full max-w-2xl mx-auto px-2">
      {/* Success Alert */}
      {showSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">All emails sent successfully! 🎉</AlertDescription>
        </Alert>
      )}

      {/* Main Compose Card */}
      <Card className="shadow-lg w-full">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b p-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-4 w-4 text-blue-600" />
            Compose Email
          </CardTitle>
          <p className="text-xs text-gray-600 mt-1">Create personalized emails for your recipients</p>
        </CardHeader>
        <CardContent className="space-y-4 p-3">
          {/* Subject Field */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-sm font-medium">
              Subject Line
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject (use {{placeholders}} for personalization)"
              className="text-sm w-full"
            />
            <p className="text-xs text-gray-500">
              Example: "Hello {`{{name}}`}, special offer for {`{{company}}`}"
            </p>
          </div>

          {/* Message Field */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium">
              Email Message
            </Label>
            <RichTextEditor content={message} onChange={setMessage} />
            <div className="bg-blue-50 p-2 rounded-lg">
              <p className="text-xs text-blue-800">
                💡 <strong>Pro Tip:</strong> Use placeholders like {`{{name}}`}, {`{{company}}`}, or {`{{email}}`} to
                personalize your emails based on your recipient data.
              </p>
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label htmlFor="attachments" className="text-sm font-medium">
              Attachments
            </Label>
            <div className="flex flex-col gap-2 w-full">
              <input type="file" id="attachments" multiple onChange={handleFileAttachment} className="hidden" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-8"
                onClick={() => document.getElementById("attachments")?.click()}
              >
                <Paperclip className="h-3 w-3 mr-2" />
                Add Attachment
              </Button>
              <div className="flex flex-wrap gap-1">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1 text-xs">
                    <FileText className="h-3 w-3" />
                    <span className="max-w-20 truncate">{file.name}</span>
                    <button type="button" onClick={() => removeAttachment(idx)}>
                      <X className="h-3 w-3 ml-1 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recipients Section */}
          <Card className="shadow-sm w-full">
            <CardHeader className="p-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                Recipients
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>                <TabsList className="grid w-full grid-cols-3 h-8">
                  <TabsTrigger value="csv" className="text-xs">CSV Upload</TabsTrigger>
                  <TabsTrigger value="manual" className="text-xs">Manual Entry</TabsTrigger>
                  <TabsTrigger value="contacts" className="text-xs">Contacts</TabsTrigger>
                </TabsList>
                <TabsContent value="csv" className="mt-3">
                  <CSVUpload onDataLoad={setCsvData} csvData={csvData} />
                </TabsContent>
                <TabsContent value="manual" className="mt-3">
                  <div className="space-y-2">
                    {manualEmails.map((email, idx) => (
                      <div key={idx} className="flex flex-col gap-2 w-full">
                        <div className="flex gap-2">
                          <Input
                            type="email"
                            placeholder="Email"
                            value={email.email}
                            onChange={(e) => updateManualEmail(idx, "email", e.target.value)}
                            className="flex-1 text-xs h-8"
                          />
                          <Input
                            type="text"
                            placeholder="Name"
                            value={email.name}
                            onChange={(e) => updateManualEmail(idx, "name", e.target.value)}
                            className="flex-1 text-xs h-8"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeManualEmail(idx)}
                            className="text-red-500 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={addManualEmail} size="sm" className="w-full h-8 text-xs">
                      <Plus className="h-3 w-3 mr-1" /> Add Recipient
                    </Button>
                  </div>
                  {manualEmails.filter((email) => email.email.trim()).length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      📧 {manualEmails.filter((email) => email.email.trim()).length} recipient(s) ready to send
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="contacts" className="mt-3">
                  <div className="space-y-2">
                    {/* Search Bar */}
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Search contacts..."
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        className="flex-1 text-xs h-8"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllFilteredContacts}
                        className="h-8"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearContactSelection}
                        className="h-8"
                      >
                        Clear
                      </Button>
                    </div>                    {/* Contact List */}
                    <div className="max-h-60 overflow-y-auto">
                      {getFilteredContacts().length === 0 ? (
                        <p className="text-xs text-gray-500 py-2 text-center">No contacts found</p>
                      ) : (
                        getFilteredContacts().map((contact) => (
                          <div
                            key={contact.id}
                            className={`flex items-center justify-between gap-2 p-2 rounded-lg cursor-pointer
                            ${selectedContacts.find(c => c.id === contact.id) ? "bg-blue-50" : "hover:bg-gray-100"}`}
                            onClick={() => toggleContactSelection(contact)}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{contact.name || "Unnamed Contact"}</p>
                              <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                            </div>
                            {selectedContacts.find(c => c.id === contact.id) && (
                              <CheckCircle className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={handlePreview}
              disabled={!canSend || isLoading}
              className="w-full h-10 text-sm"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview & Send
            </Button>
          </div>

          {/* Send Progress */}
          {isLoading && (
            <Card>
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Sending Emails...</h3>
                    <span className="text-xs text-gray-500">{sendProgress}%</span>
                  </div>
                  <Progress value={sendProgress} className="w-full h-2" />
                  <p className="text-xs text-gray-600">Please wait while we send your emails.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Send Status */}
          {sendStatus.length > 0 && (
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="flex items-center gap-2 flex-wrap text-sm">
                  <Users className="h-4 w-4" />
                  Send Results
                  {successCount > 0 && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">{successCount} sent</span>
                  )}
                  {errorCount > 0 && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">{errorCount} failed</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="space-y-2 max-h-48 overflow-y-auto">                  {sendStatus.map((status, index) => (
                    <div key={index} className="flex flex-col gap-1 p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {status.status === "success" ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : status.status === "error" ? (
                            <AlertCircle className="h-3 w-3 text-red-600" />
                          ) : (
                            <div className="h-3 w-3 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                          )}
                          <span className="text-xs font-medium truncate flex-1">{status.email}</span>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            status.status === "success"
                              ? "bg-green-100 text-green-800"
                              : status.status === "error"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {status.status === "success" ? "Sent" : status.status === "error" ? "Failed" : "Sending..."}
                        </span>
                      </div>
                      {status.error && <p className="text-xs text-red-600 mt-1">{status.error}</p>}
                      {status.status === "success" && (
                        <p className="text-xs text-green-600 mt-1">
                          ✅ Email queued successfully. Check recipient's inbox/spam folder.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Email Delivery Notes */}
          {successCount > 0 && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">📧 Email Delivery Notes:</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Emails have been sent through Gmail API and are being delivered</li>
                <li>• Recipients should check their spam/junk folders if emails aren't in inbox</li>
                <li>• Delivery can take a few minutes depending on recipient's email provider</li>
                <li>• <a href="/test-email-delivery" className="underline">Test email delivery</a> if issues persist</li>
              </ul>
            </div>
          )}

          {/* Email Preview Modal */}
          {showPreview && (
            <EmailPreview
              emails={personalizedEmailsForPreview}
              onSend={handleSend}
              onClose={() => setShowPreview(false)}
              isLoading={isLoading}
            />
          )}
        </CardContent>
      </Card>
    </div>  )
}
