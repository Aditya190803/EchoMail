"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RichTextEditor } from "@/components/rich-text-editor"
import { CSVUpload } from "@/components/csv-upload"
import { contactsService, campaignsService, templatesService, contactGroupsService, scheduledEmailsService, signaturesService, unsubscribesService, type EmailTemplate, type ContactGroup, type EmailSignature } from "@/lib/appwrite"
import { useEmailSend } from "@/hooks/useEmailSend"
import { toast } from "sonner"
import type { CSVRow } from "@/types/email"
import {
  Send,
  Paperclip,
  Upload,
  X,
  Users,
  FileSpreadsheet,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Save,
  Trash2,
  RefreshCw,
  FileText,
  Tag,
  Calendar,
  Pen,
  FileCode,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"

// Draft storage key
const DRAFT_STORAGE_KEY = 'echomail_draft'

interface EmailDraft {
  subject: string
  content: string
  recipients: string[]
  attachments: any[]
  savedAt: string
}

interface Contact {
  $id: string
  email: string
  name?: string
}

export function ComposeForm() {
  const { data: session } = useSession()
  const router = useRouter()
  
  // Form state
  const [subject, setSubject] = useState("")
  const [content, setContent] = useState("")
  const [recipients, setRecipients] = useState<string[]>([])
  const [attachments, setAttachments] = useState<any[]>([])
  const [isUploading, setIsUploading] = useState(false)
  
  // Scheduling state
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")
  
  // Signature state
  const [signatures, setSignatures] = useState<EmailSignature[]>([])
  const [selectedSignature, setSelectedSignature] = useState<string | null>(null)
  const [showSignatureDialog, setShowSignatureDialog] = useState(false)
  
  // HTML import state
  const [showHtmlImport, setShowHtmlImport] = useState(false)
  const [htmlImportCode, setHtmlImportCode] = useState("")
  
  // UI state
  const [activeTab, setActiveTab] = useState("compose")
  const [showPreview, setShowPreview] = useState(false)
  const [showSendingDialog, setShowSendingDialog] = useState(false)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [groups, setGroups] = useState<ContactGroup[]>([])
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  
  // CSV data
  const [csvData, setCsvData] = useState<any[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  
  // Draft state
  const [hasDraft, setHasDraft] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  
  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Email send hook
  const {
    sendEmails,
    progress,
    sendStatus,
    isLoading: isSending,
    error: sendError,
    failedEmails,
    hasPendingRetries,
    retryFailedEmails,
    quotaInfo,
  } = useEmailSend()

  // Load draft on mount
  useEffect(() => {
    const loadDraft = () => {
      try {
        // First check if there's a template from the templates page
        const templateData = sessionStorage.getItem('selectedTemplate')
        if (templateData) {
          const template = JSON.parse(templateData)
          setSubject(template.subject || "")
          setContent(template.content || "")
          sessionStorage.removeItem('selectedTemplate')
          toast.success("Template loaded!")
          return // Don't load draft if template was selected
        }
        
        const saved = localStorage.getItem(DRAFT_STORAGE_KEY)
        if (saved) {
          const draft: EmailDraft = JSON.parse(saved)
          setHasDraft(true)
          
          // Ask user if they want to restore the draft
          const savedTime = new Date(draft.savedAt)
          const timeAgo = getTimeAgo(savedTime)
          
          if (confirm(`You have an unsaved draft from ${timeAgo}. Would you like to restore it?`)) {
            setSubject(draft.subject || "")
            setContent(draft.content || "")
            setRecipients(draft.recipients || [])
            setAttachments(draft.attachments || [])
            setLastSaved(savedTime)
            toast.success("Draft restored!")
          } else {
            clearDraft()
          }
        }
      } catch (e) {
        console.error("Error loading draft:", e)
      }
    }
    
    loadDraft()
  }, [])

  // Auto-save draft when content changes
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    
    // Only auto-save if there's content
    if (subject || content || recipients.length > 0) {
      autoSaveTimerRef.current = setTimeout(() => {
        saveDraft()
      }, 3000) // Save after 3 seconds of inactivity
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [subject, content, recipients])

  // Load contacts, groups, and signatures
  useEffect(() => {
    const loadContactsGroupsAndSignatures = async () => {
      if (!session?.user?.email) return
      
      try {
        const [contactsResponse, groupsResponse, signaturesResponse] = await Promise.all([
          contactsService.listByUser(session.user.email),
          contactGroupsService.listByUser(session.user.email),
          signaturesService.listByUser(session.user.email),
        ])
        setContacts(contactsResponse.documents as any[])
        setGroups(groupsResponse.documents)
        setSignatures(signaturesResponse.documents)
        
        // Set default signature if available
        const defaultSig = signaturesResponse.documents.find(s => s.is_default)
        if (defaultSig) {
          setSelectedSignature(defaultSig.$id!)
        }
      } catch (error) {
        console.error("Error loading contacts/groups/signatures:", error)
      }
    }
    
    loadContactsGroupsAndSignatures()
  }, [session?.user?.email])

  // Load templates
  const loadTemplates = useCallback(async () => {
    if (!session?.user?.email) return
    
    setIsLoadingTemplates(true)
    try {
      const response = await templatesService.listByUser(session.user.email)
      setTemplates(response.documents.map(doc => ({
        $id: doc.$id,
        name: (doc as any).name,
        subject: (doc as any).subject,
        content: (doc as any).content,
        category: (doc as any).category,
        user_email: (doc as any).user_email,
      })) as EmailTemplate[])
    } catch (error) {
      console.error("Error loading templates:", error)
    }
    setIsLoadingTemplates(false)
  }, [session?.user?.email])

  // Apply template to form
  const applyTemplate = (template: EmailTemplate) => {
    setSubject(template.subject)
    setContent(template.content)
    setShowTemplateDialog(false)
    toast.success(`Template "${template.name}" applied!`)
  }

  // Helper function to get time ago string
  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    
    if (seconds < 60) return "just now"
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
    return `${Math.floor(seconds / 86400)} days ago`
  }

  // Save draft to localStorage
  const saveDraft = useCallback(() => {
    try {
      setIsSavingDraft(true)
      const draft: EmailDraft = {
        subject,
        content,
        recipients,
        attachments,
        savedAt: new Date().toISOString(),
      }
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
      setLastSaved(new Date())
      setHasDraft(true)
      setIsSavingDraft(false)
    } catch (e) {
      console.error("Error saving draft:", e)
      setIsSavingDraft(false)
    }
  }, [subject, content, recipients, attachments])

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
      setHasDraft(false)
      setLastSaved(null)
    } catch (e) {
      console.error("Error clearing draft:", e)
    }
  }, [])

  // Handle file upload
  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return
    
    setIsUploading(true)
    const formData = new FormData()
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i])
    }
    
    try {
      const response = await fetch('/api/upload-attachment', {
        method: 'POST',
        body: formData,
      })
      
      const result = await response.json()
      
      if (result.success) {
        const newAttachments = result.uploads
          .filter((u: any) => !u.error)
          .map((u: any) => ({
            name: u.fileName,
            type: u.fileType,
            data: u.url,
            cloudinaryUrl: u.url,
            appwriteFileId: u.appwrite_file_id,
            appwriteUrl: u.url,
            fileSize: u.fileSize,
          }))
        
        setAttachments([...attachments, ...newAttachments])
        toast.success(`${newAttachments.length} file(s) uploaded`)
      } else {
        toast.error("Failed to upload files")
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast.error("Failed to upload files")
    }
    
    setIsUploading(false)
  }

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  // Handle CSV data
  const handleCsvData = (data: CSVRow[]) => {
    setCsvData(data)
    
    // Extract headers from first row
    if (data.length > 0) {
      const headers = Object.keys(data[0])
      setCsvHeaders(headers)
    }
    
    // Extract emails from CSV
    const emails = data
      .map(row => row.email)
      .filter(email => email && email.includes('@'))
    
    if (emails.length > 0) {
      setRecipients(emails)
      toast.success(`Found ${emails.length} recipients`)
    } else {
      toast.error("No valid emails found in CSV")
    }
  }

  // Toggle contact selection
  const toggleContact = (contactId: string, email: string) => {
    const newSelected = new Set(selectedContacts)
    
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId)
      setRecipients(recipients.filter(r => r !== email))
    } else {
      newSelected.add(contactId)
      if (!recipients.includes(email)) {
        setRecipients([...recipients, email])
      }
    }
    
    setSelectedContacts(newSelected)
  }

  // Toggle group selection
  const toggleGroup = (groupId: string) => {
    const group = groups.find(g => g.$id === groupId)
    if (!group) return

    const newSelectedGroups = new Set(selectedGroups)
    const newSelectedContacts = new Set(selectedContacts)
    let newRecipients = [...recipients]

    // Get emails for contacts in this group
    const groupContactEmails = contacts
      .filter(c => group.contact_ids.includes(c.$id))
      .map(c => c.email)

    if (newSelectedGroups.has(groupId)) {
      // Deselect group
      newSelectedGroups.delete(groupId)
      // Remove contacts that are only in this group
      group.contact_ids.forEach(contactId => {
        const contact = contacts.find(c => c.$id === contactId)
        if (contact) {
          const isInOtherSelectedGroup = groups.some(g => 
            g.$id !== groupId && 
            newSelectedGroups.has(g.$id!) && 
            g.contact_ids.includes(contactId)
          )
          if (!isInOtherSelectedGroup) {
            newSelectedContacts.delete(contactId)
            newRecipients = newRecipients.filter(r => r !== contact.email)
          }
        }
      })
    } else {
      // Select group
      newSelectedGroups.add(groupId)
      // Add all contacts from this group
      group.contact_ids.forEach(contactId => {
        const contact = contacts.find(c => c.$id === contactId)
        if (contact) {
          newSelectedContacts.add(contactId)
          if (!newRecipients.includes(contact.email)) {
            newRecipients.push(contact.email)
          }
        }
      })
    }

    setSelectedGroups(newSelectedGroups)
    setSelectedContacts(newSelectedContacts)
    setRecipients(newRecipients)
  }

  // Send emails
  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error("Please enter a subject")
      return
    }
    
    if (!content.trim()) {
      toast.error("Please enter email content")
      return
    }
    
    if (recipients.length === 0) {
      toast.error("Please add at least one recipient")
      return
    }
    
    // Validate scheduling
    if (isScheduled) {
      if (!scheduledDate || !scheduledTime) {
        toast.error("Please select a date and time for scheduling")
        return
      }
      
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`)
      if (scheduledDateTime <= new Date()) {
        toast.error("Scheduled time must be in the future")
        return
      }
    }
    
    // Filter out unsubscribed emails
    let filteredRecipients = recipients
    if (session?.user?.email) {
      try {
        filteredRecipients = await unsubscribesService.filterUnsubscribed(session.user.email, recipients)
        if (filteredRecipients.length < recipients.length) {
          const skipped = recipients.length - filteredRecipients.length
          toast.info(`${skipped} unsubscribed email(s) will be skipped`)
        }
      } catch (error) {
        console.error("Error filtering unsubscribes:", error)
      }
    }
    
    // Append signature if selected
    let finalContent = content
    if (selectedSignature) {
      const signature = signatures.find(s => s.$id === selectedSignature)
      if (signature) {
        finalContent = `${content}<br/><br/>${signature.content}`
      }
    }
    
    // Handle scheduled sending
    if (isScheduled && session?.user?.email) {
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`)
      
      try {
        await scheduledEmailsService.create({
          subject,
          content: finalContent,
          recipients: filteredRecipients,
          scheduled_at: scheduledDateTime.toISOString(),
          status: 'pending',
          user_email: session.user.email,
          attachments: attachments.map(a => ({
            fileName: a.name,
            fileUrl: a.data || a.cloudinaryUrl || a.appwriteUrl,
            fileSize: a.fileSize || 0,
            appwrite_file_id: a.appwriteFileId,
          })),
        })
        
        clearDraft()
        toast.success(`Email scheduled for ${scheduledDateTime.toLocaleString()}`)
        router.push('/scheduled')
        return
      } catch (error) {
        console.error("Error scheduling email:", error)
        toast.error("Failed to schedule email")
        return
      }
    }
    
    setShowSendingDialog(true)
    
    // Prepare personalized emails
    const personalizedEmails = filteredRecipients.map((email, index) => {
      const csvRow = csvData[index] || {}
      
      return {
        to: email,
        subject,
        message: finalContent,
        originalRowData: csvRow,
        attachments,
      }
    })
    
    try {
      const results = await sendEmails(personalizedEmails)
      
      const successCount = results.filter(r => r.status === "success").length
      const failCount = results.filter(r => r.status === "error").length
      
      // Save campaign to Appwrite
      if (session?.user?.email) {
        await campaignsService.create({
          subject,
          content,
          recipients,
          sent: successCount,
          failed: failCount,
          status: failCount === 0 ? "completed" : "completed",
          user_email: session.user.email,
          campaign_type: csvData.length > 0 ? "bulk" : "contact_list",
          attachments: attachments.map(a => ({
            fileName: a.name,
            fileUrl: a.data || a.cloudinaryUrl || a.appwriteUrl,
            fileSize: a.fileSize || 0,
            appwrite_file_id: a.appwriteFileId,
          })),
          send_results: results.map(r => ({
            email: r.email,
            status: r.status === 'skipped' ? 'error' as const : r.status as 'success' | 'error',
            error: r.error,
          })),
        })
      }
      
      // Clear draft after successful send
      clearDraft()
      
      toast.success(`Campaign complete! ${successCount} sent, ${failCount} failed`)
      
    } catch (error) {
      console.error("Send error:", error)
      toast.error("Failed to send emails")
    }
  }

  return (
    <div className="space-y-6">
      {/* Draft Status Bar */}
      {(hasDraft || lastSaved) && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isSavingDraft ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving draft...
              </>
            ) : lastSaved ? (
              <>
                <Save className="h-4 w-4" />
                Draft saved {getTimeAgo(lastSaved)}
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={saveDraft}
              disabled={isSavingDraft}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Now
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm("Are you sure you want to clear this draft?")) {
                  setSubject("")
                  setContent("")
                  setRecipients([])
                  setAttachments([])
                  clearDraft()
                  toast.success("Draft cleared")
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="compose" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="recipients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Recipients
            {recipients.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {recipients.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        {/* Compose Tab */}
        <TabsContent value="compose" className="space-y-4">
          {/* Template & HTML Import */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-muted-foreground">
              Start from scratch or use a template
            </div>
            <div className="flex gap-2">
              <Dialog open={showHtmlImport} onOpenChange={setShowHtmlImport}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FileCode className="h-4 w-4 mr-2" />
                    Import HTML
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Import HTML Template</DialogTitle>
                    <DialogDescription>
                      Paste your HTML code to use as email content
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <textarea
                      value={htmlImportCode}
                      onChange={(e) => setHtmlImportCode(e.target.value)}
                      placeholder="Paste your HTML code here..."
                      className="w-full h-64 p-3 rounded-md border bg-muted/50 font-mono text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          if (htmlImportCode.trim()) {
                            setContent(htmlImportCode)
                            setShowHtmlImport(false)
                            setHtmlImportCode("")
                            toast.success("HTML template imported!")
                          }
                        }}
                        disabled={!htmlImportCode.trim()}
                        className="flex-1"
                      >
                        Import
                      </Button>
                      <Button variant="outline" onClick={() => setShowHtmlImport(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={showTemplateDialog} onOpenChange={(open) => {
                setShowTemplateDialog(open)
                if (open) loadTemplates()
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Choose a Template</DialogTitle>
                    <DialogDescription>
                      Select a template to use as a starting point
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 pt-4">
                    {isLoadingTemplates ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : templates.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground mb-4">No templates yet</p>
                        <Button variant="outline" onClick={() => {
                          setShowTemplateDialog(false)
                          router.push('/templates')
                        }}>
                          Create Template
                        </Button>
                      </div>
                    ) : (
                      templates.map((template) => (
                        <button
                          key={template.$id}
                          onClick={() => applyTemplate(template)}
                          className="w-full text-left p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="font-medium mb-1">{template.name}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {template.subject}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Enter email subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Email Body</Label>
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Compose your email..."
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Attachments
            </Label>
            
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-2 py-2"
                >
                  <Paperclip className="h-3 w-3" />
                  {file.name}
                  <button
                    onClick={() => removeAttachment(index)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  disabled={isUploading}
                />
                <Badge
                  variant="outline"
                  className="flex items-center gap-2 py-2 cursor-pointer hover:bg-muted"
                >
                  {isUploading ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3" />
                  )}
                  Add Files
                </Badge>
              </label>
            </div>
          </div>

          {/* Email Signature */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Pen className="h-4 w-4" />
              Email Signature
            </Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedSignature === null ? "secondary" : "outline"}
                size="sm"
                onClick={() => setSelectedSignature(null)}
              >
                No Signature
              </Button>
              {signatures.map((sig) => (
                <Button
                  key={sig.$id}
                  variant={selectedSignature === sig.$id ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSignature(sig.$id!)}
                >
                  {sig.name}
                  {sig.is_default && (
                    <Badge variant="secondary" className="ml-1 text-xs">Default</Badge>
                  )}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/settings/signatures')}
              >
                Manage Signatures
              </Button>
            </div>
          </div>

          {/* Schedule Email */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="schedule-toggle"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="schedule-toggle" className="flex items-center gap-2 cursor-pointer">
                <Calendar className="h-4 w-4" />
                Schedule for later
              </Label>
            </div>
            
            {isScheduled && (
              <div className="flex flex-wrap gap-4 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="schedule-date" className="text-sm">Date</Label>
                  <Input
                    type="date"
                    id="schedule-date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-auto"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="schedule-time" className="text-sm">Time</Label>
                  <Input
                    type="time"
                    id="schedule-time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-auto"
                  />
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Recipients Tab */}
        <TabsContent value="recipients" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSpreadsheet className="h-4 w-4" />
                Import from CSV
              </CardTitle>
              <CardDescription>
                Upload a CSV file with recipient emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CSVUpload onDataLoad={handleCsvData} csvData={csvData} />
              {csvData.length > 0 && (
                <div className="mt-4">
                  <Badge variant="success">
                    {csvData.length} rows loaded
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Groups */}
          {groups.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Tag className="h-4 w-4" />
                  Select Contact Groups
                </CardTitle>
                <CardDescription>
                  Quickly add all contacts from a group
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {groups.map((group) => (
                    <button
                      key={group.$id}
                      onClick={() => toggleGroup(group.$id!)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                        selectedGroups.has(group.$id!)
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        group.color === 'blue' ? 'bg-blue-500' :
                        group.color === 'green' ? 'bg-green-500' :
                        group.color === 'purple' ? 'bg-purple-500' :
                        group.color === 'orange' ? 'bg-orange-500' :
                        group.color === 'pink' ? 'bg-pink-500' :
                        group.color === 'red' ? 'bg-red-500' :
                        group.color === 'yellow' ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }`} />
                      <span className="font-medium">{group.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {group.contact_ids.length}
                      </Badge>
                      {selectedGroups.has(group.$id!) && (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Select from Contacts
              </CardTitle>
              <CardDescription>
                Choose from your saved contacts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No contacts found. Add contacts from the Contacts page.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {contacts.map((contact) => (
                    <label
                      key={contact.$id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedContacts.has(contact.$id)
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedContacts.has(contact.$id)}
                        onChange={() => toggleContact(contact.$id, contact.email)}
                        className="sr-only"
                      />
                      <div className="flex-1 min-w-0">
                        {contact.name && (
                          <p className="font-medium truncate">{contact.name}</p>
                        )}
                        <p className="text-sm text-muted-foreground truncate">
                          {contact.email}
                        </p>
                      </div>
                      {selectedContacts.has(contact.$id) && (
                        <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Recipients Summary */}
          {recipients.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {recipients.length} Recipients Selected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {recipients.slice(0, 10).map((email, index) => (
                    <Badge key={index} variant="secondary">
                      {email}
                    </Badge>
                  ))}
                  {recipients.length > 10 && (
                    <Badge variant="outline">
                      +{recipients.length - 10} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Email Preview
              </CardTitle>
              <CardDescription>
                This is how your email will appear to recipients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg p-4 bg-white dark:bg-zinc-900">
                <div className="border-b pb-3 mb-3">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">To:</span> {recipients[0] || "recipient@example.com"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Subject:</span> {subject || "(No subject)"}
                  </p>
                </div>
                <div 
                  className="prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: content || "<p>Your email content will appear here...</p>" }}
                />
                {attachments.length > 0 && (
                  <div className="border-t pt-3 mt-4">
                    <p className="text-sm font-medium mb-2">Attachments:</p>
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((att, i) => (
                        <Badge key={i} variant="secondary">
                          <Paperclip className="h-3 w-3 mr-1" />
                          {att.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Send Button */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          {quotaInfo.estimatedRemaining < 100 && (
            <span className="text-warning">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              ~{quotaInfo.estimatedRemaining} emails remaining today
            </span>
          )}
        </div>
        
        <Button
          onClick={handleSend}
          disabled={isSending || !subject || !content || recipients.length === 0 || (isScheduled && (!scheduledDate || !scheduledTime))}
          size="lg"
        >
          {isScheduled ? (
            <>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule to {recipients.length} {recipients.length === 1 ? "recipient" : "recipients"}
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send to {recipients.length} {recipients.length === 1 ? "recipient" : "recipients"}
            </>
          )}
        </Button>
      </div>

      {/* Sending Dialog */}
      <Dialog open={showSendingDialog} onOpenChange={setShowSendingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isSending ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : progress.percentage === 100 ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : sendError ? (
                <XCircle className="h-5 w-5 text-destructive" />
              ) : null}
              {isSending ? "Sending Emails..." : "Campaign Status"}
            </DialogTitle>
            <DialogDescription>
              {progress.status}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Progress value={progress.percentage} className="h-3" />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-success/10 rounded-lg">
                <div className="text-2xl font-bold text-success">
                  {sendStatus.filter(s => s.status === "success").length}
                </div>
                <div className="text-sm text-muted-foreground">Sent</div>
              </div>
              <div className="text-center p-4 bg-destructive/10 rounded-lg">
                <div className="text-2xl font-bold text-destructive">
                  {sendStatus.filter(s => s.status === "error" || s.status === "skipped").length}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>

            {sendError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{sendError}</p>
              </div>
            )}

            {hasPendingRetries && !isSending && (
              <Button onClick={retryFailedEmails} variant="outline" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Failed Emails ({failedEmails.length})
              </Button>
            )}

            {!isSending && (
              <Button onClick={() => setShowSendingDialog(false)} className="w-full">
                {progress.percentage === 100 ? "Done" : "Close"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
