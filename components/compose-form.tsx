"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RichTextEditor } from "@/components/rich-text-editor"
import { CSVUpload } from "@/components/csv-upload"
import { contactsService, campaignsService, templatesService, contactGroupsService, draftEmailsService, signaturesService, unsubscribesService, type EmailTemplate, type ContactGroup, type EmailSignature } from "@/lib/appwrite"
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
  Pen,
  FileCode,
  StopCircle,
  Play,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  User,
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

// File size threshold for immediate Appwrite upload (5MB)
const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024

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
  const searchParams = useSearchParams()
  
  // Form state
  const [subject, setSubject] = useState("")
  const [content, setContent] = useState("")
  const [recipients, setRecipients] = useState<string[]>([])
  const [attachments, setAttachments] = useState<any[]>([])
  const [isUploading, setIsUploading] = useState(false)
  
  // Editing draft email state
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  
  // Manual email entry state
  const [manualEmail, setManualEmail] = useState("")
  const [manualName, setManualName] = useState("")
  const [manualEntries, setManualEntries] = useState<{email: string, name: string}[]>([])
  
  // Draft state (toggle to save as draft instead of sending immediately)
  const [saveAsDraft, setSaveAsDraft] = useState(false)
  
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
  
  // Preview state
  const [previewRecipientIndex, setPreviewRecipientIndex] = useState(0)
  
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
    isStopping,
    isPaused,
    isOffline,
    error: sendError,
    failedEmails,
    hasPendingRetries,
    retryFailedEmails,
    stopSending,
    resumeCampaign,
    clearSavedCampaign,
    hasSavedCampaign,
    savedCampaignInfo,
    quotaInfo,
  } = useEmailSend()

  // Load draft on mount
  useEffect(() => {
    const loadDraft = () => {
      try {
        // First check if we're editing a draft
        const editMode = searchParams.get('edit')
        if (editMode === 'draft') {
          const draftData = sessionStorage.getItem('editDraftEmail')
          if (draftData) {
            const draft = JSON.parse(draftData)
            setEditingDraftId(draft.id)
            setSubject(draft.subject || "")
            setContent(draft.content || "")
            setRecipients(draft.recipients || [])
            setSaveAsDraft(true) // Keep it as draft mode when editing
            
            // Handle attachments
            if (draft.attachments && draft.attachments.length > 0) {
              const parsedAttachments = draft.attachments.map((a: any) => ({
                name: a.fileName,
                type: 'application/octet-stream',
                data: a.fileUrl,
                appwriteUrl: a.fileUrl,
                appwriteFileId: a.appwrite_file_id,
                fileSize: a.fileSize,
              }))
              setAttachments(parsedAttachments)
            }
            
            // Handle CSV data for personalization
            if (draft.csv_data) {
              try {
                const csvDataParsed = typeof draft.csv_data === 'string' 
                  ? JSON.parse(draft.csv_data) 
                  : draft.csv_data
                if (Array.isArray(csvDataParsed) && csvDataParsed.length > 0) {
                  setCsvData(csvDataParsed)
                  // Extract headers from the first row
                  const headers = Object.keys(csvDataParsed[0])
                  setCsvHeaders(headers)
                }
              } catch (e) {
                console.error("Error parsing csv_data:", e)
              }
            }
            
            sessionStorage.removeItem('editDraftEmail')
            toast.success("Editing draft")
            return
          }
        }
        
        // Check if there's a template from the templates page
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
  }, [searchParams])

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

  // Handle file upload with smart sizing:
  // - Small files (<5MB): Keep as base64 in memory for fast sending
  // - Large files (>=5MB): Upload to Appwrite immediately
  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return
    
    setIsUploading(true)
    const newAttachments: any[] = []
    const largeFiles: File[] = []
    
    // Process files based on size
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      if (file.size < LARGE_FILE_THRESHOLD) {
        // Small file: convert to base64 and keep in memory
        try {
          const base64 = await fileToBase64(file)
          newAttachments.push({
            name: file.name,
            type: file.type || 'application/octet-stream',
            data: base64, // Direct base64 data
            fileSize: file.size,
          })
        } catch (error) {
          console.error(`Error reading file ${file.name}:`, error)
          toast.error(`Failed to read ${file.name}`)
        }
      } else {
        // Large file: queue for Appwrite upload
        largeFiles.push(file)
      }
    }
    
    // Upload large files to Appwrite
    if (largeFiles.length > 0) {
      const formData = new FormData()
      largeFiles.forEach(file => formData.append('files', file))
      
      try {
        const response = await fetch('/api/upload-attachment', {
          method: 'POST',
          body: formData,
        })
        
        const result = await response.json()
        
        if (result.success) {
          result.uploads
            .filter((u: any) => !u.error)
            .forEach((u: any) => {
              newAttachments.push({
                name: u.fileName,
                type: u.fileType,
                data: 'appwrite', // Placeholder - will be fetched once before sending
                appwriteFileId: u.appwrite_file_id,
                appwriteUrl: u.url,
                fileSize: u.fileSize,
              })
            })
        } else {
          toast.error("Failed to upload large files")
        }
      } catch (error) {
        console.error("Upload error:", error)
        toast.error("Failed to upload large files")
      }
    }
    
    if (newAttachments.length > 0) {
      setAttachments([...attachments, ...newAttachments])
      const smallCount = newAttachments.filter(a => a.data !== 'appwrite').length
      const largeCount = newAttachments.filter(a => a.data === 'appwrite').length
      if (smallCount > 0 && largeCount > 0) {
        toast.success(`${smallCount} file(s) ready, ${largeCount} large file(s) uploaded`)
      } else {
        toast.success(`${newAttachments.length} file(s) added`)
      }
    }
    
    setIsUploading(false)
  }
  
  // Helper function to convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = error => reject(error)
    })
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

  // Add manual email entry (email + name)
  const addManualEntry = () => {
    const email = manualEmail.trim().toLowerCase()
    const name = manualName.trim()
    
    if (!email || !email.includes('@') || !email.includes('.')) {
      toast.error("Please enter a valid email address")
      return
    }
    
    if (recipients.includes(email)) {
      toast.error("This email is already added")
      return
    }
    
    // Add to recipients
    setRecipients([...recipients, email])
    
    // Add to manual entries for display
    setManualEntries([...manualEntries, { email, name }])
    
    // Add to CSV data for personalization
    const data: Record<string, string> = { email }
    if (name) data.name = name
    setCsvData(prev => [...prev, data])
    if (csvHeaders.length === 0) {
      setCsvHeaders(['email', 'name'])
    }
    
    // Clear inputs
    setManualEmail("")
    setManualName("")
    toast.success("Recipient added")
  }

  // Remove a recipient
  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r !== email))
    // Also remove from manual entries
    setManualEntries(prev => prev.filter(e => e.email !== email))
    // Also remove from CSV data
    setCsvData(prev => prev.filter(row => row.email !== email))
    // Also update selected contacts if it was from contacts
    const contact = contacts.find(c => c.email === email)
    if (contact) {
      const newSelected = new Set(selectedContacts)
      newSelected.delete(contact.$id)
      setSelectedContacts(newSelected)
    }
  }

  // Replace placeholders in text with recipient data
  const replacePlaceholders = (text: string, data: Record<string, string>): string => {
    // Support both {{placeholder}} and {placeholder} formats
    return text
      .replace(/\{\{(\w+)\}\}/g, (match, key) => data[key.toLowerCase()] || data[key] || match)
      .replace(/\{(\w+)\}/g, (match, key) => data[key.toLowerCase()] || data[key] || match)
  }

  // Get personalized content for a specific recipient
  const getPersonalizedContent = (recipientIndex: number) => {
    if (recipients.length === 0) {
      return { email: "recipient@example.com", subject: subject || "(No subject)", content: content || "<p>Your email content will appear here...</p>" }
    }

    const recipientEmail = recipients[recipientIndex] || recipients[0]
    
    // Find data for this recipient from CSV data or manual entries
    const csvRow = csvData.find(row => row.email === recipientEmail) || {}
    const manualEntry = manualEntries.find(e => e.email === recipientEmail)
    
    // Merge data sources (CSV takes precedence, then manual entry)
    const recipientData: Record<string, string> = {
      email: recipientEmail,
      name: manualEntry?.name || '',
      ...csvRow,
    }

    // Apply personalization
    const personalizedSubject = replacePlaceholders(subject, recipientData)
    const personalizedContent = replacePlaceholders(content, recipientData)

    return {
      email: recipientEmail,
      subject: personalizedSubject || "(No subject)",
      content: personalizedContent || "<p>Your email content will appear here...</p>",
      data: recipientData
    }
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
    
    // No date/time validation needed for drafts - saved immediately
    
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
    
    // Handle saving as draft
    if (saveAsDraft && session?.user?.email) {
      // Use current time for draft save timestamp
      const savedAt = new Date().toISOString()
      
      setIsSavingDraft(true)
      try {
        // Upload any base64 attachments to Appwrite for draft persistence
        const processedAttachments = await Promise.all(
          attachments.map(async (a) => {
            // If it's already in Appwrite, use existing reference
            if (a.appwriteFileId) {
              return {
                fileName: a.name,
                fileUrl: a.appwriteUrl || '',
                fileSize: a.fileSize || 0,
                appwrite_file_id: a.appwriteFileId,
              }
            }
            
            // If it has base64 data, upload to Appwrite now for draft persistence
            if (a.data && a.data !== 'appwrite') {
              try {
                // Convert base64 back to blob for upload
                const byteCharacters = atob(a.data)
                const byteNumbers = new Array(byteCharacters.length)
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i)
                }
                const byteArray = new Uint8Array(byteNumbers)
                const blob = new Blob([byteArray], { type: a.type })
                const file = new File([blob], a.name, { type: a.type })
                
                const formData = new FormData()
                formData.append('files', file)
                
                const response = await fetch('/api/upload-attachment', {
                  method: 'POST',
                  body: formData,
                })
                
                const result = await response.json()
                
                if (result.success && result.uploads[0] && !result.uploads[0].error) {
                  const upload = result.uploads[0]
                  return {
                    fileName: upload.fileName,
                    fileUrl: upload.url,
                    fileSize: upload.fileSize,
                    appwrite_file_id: upload.appwrite_file_id,
                  }
                }
              } catch (uploadError) {
                console.error(`Error uploading attachment ${a.name} for draft:`, uploadError)
              }
            }
            
            // Fallback: save reference without Appwrite (attachment may be lost)
            return {
              fileName: a.name,
              fileUrl: '',
              fileSize: a.fileSize || 0,
              appwrite_file_id: '',
            }
          })
        )
        
        // Build personalization data for each recipient
        const recipientCsvData = filteredRecipients.map(recipientEmail => {
          // Find CSV row with case-insensitive email matching
          const csvRow = csvData.find(row => {
            const rowEmail = row.email || row.Email || row.EMAIL || ''
            return rowEmail.toLowerCase() === recipientEmail.toLowerCase()
          }) || {}
          const manualEntry = manualEntries.find(e => e.email.toLowerCase() === recipientEmail.toLowerCase())
          return {
            email: recipientEmail,
            name: manualEntry?.name || csvRow.name || csvRow.Name || csvRow.NAME || '',
            ...csvRow,
          }
        })

        const draftEmailData = {
          subject,
          content: finalContent,
          recipients: filteredRecipients,
          saved_at: savedAt,
          attachments: processedAttachments.filter(a => a.appwrite_file_id), // Only save attachments that were uploaded
          csv_data: recipientCsvData,
        }
        
        if (editingDraftId) {
          // Update existing draft
          await draftEmailsService.update(editingDraftId, draftEmailData)
          clearDraft()
          toast.success("Draft updated")
        } else {
          // Create new draft
          await draftEmailsService.create(draftEmailData)
          clearDraft()
          toast.success("Draft saved — send it when you're ready!")
        }
        
        router.push('/draft')
        return
      } catch (error) {
        console.error("Error saving draft:", error)
        toast.error("Failed to save draft")
        return
      } finally {
        setIsSavingDraft(false)
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
      
      // Save campaign to Appwrite (user_email is set server-side)
      if (session?.user?.email) {
        await campaignsService.create({
          subject,
          content,
          recipients,
          sent: successCount,
          failed: failCount,
          status: failCount === 0 ? "completed" : "completed",
          campaign_type: csvData.length > 0 ? "bulk" : "contact_list",
          attachments: attachments.map(a => ({
            fileName: a.name,
            fileUrl: a.appwriteUrl || a.data,
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
      {/* Resume Campaign Banner */}
      {hasSavedCampaign && savedCampaignInfo && (
        <div className="flex items-center justify-between p-4 bg-warning/10 border border-warning/30 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-warning" />
            <div>
              <p className="font-medium text-sm">Incomplete Campaign Found</p>
              <p className="text-xs text-muted-foreground">
                {savedCampaignInfo.subject ? `"${savedCampaignInfo.subject}" - ` : ""}
                {savedCampaignInfo.remaining} of {savedCampaignInfo.total} emails remaining
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm("Discard the incomplete campaign?")) {
                  clearSavedCampaign()
                  toast.success("Campaign cleared")
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Discard
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                setShowSendingDialog(true)
                await resumeCampaign()
              }}
            >
              <Play className="h-4 w-4 mr-1" />
              Resume
            </Button>
          </div>
        </div>
      )}

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
              <span className="text-xs text-muted-foreground font-normal">(max 50MB per file)</span>
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
                  {file.fileSize && (
                    <span className="text-xs text-muted-foreground">
                      ({(file.fileSize / 1024 / 1024).toFixed(1)}MB)
                    </span>
                  )}
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

          {/* Save as Draft */}
          <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
            <input
              type="checkbox"
              id="draft-toggle"
              checked={saveAsDraft}
              onChange={(e) => setSaveAsDraft(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <div>
              <Label htmlFor="draft-toggle" className="flex items-center gap-2 cursor-pointer">
                <Save className="h-4 w-4" />
                Save as Draft
              </Label>
              <p className="text-xs text-muted-foreground">
                Save without sending. You can send it later from the Drafts page.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Recipients Tab */}
        <TabsContent value="recipients" className="space-y-6">
          {/* Manual Email Entry */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4" />
                Add Recipients Manually
              </CardTitle>
              <CardDescription>
                Add recipients one by one with their name for personalization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Input Row */}
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="manual-email" className="text-xs">Email *</Label>
                  <Input
                    id="manual-email"
                    type="email"
                    placeholder="john@example.com"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addManualEntry()
                      }
                    }}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="manual-name" className="text-xs">Name (optional)</Label>
                  <Input
                    id="manual-name"
                    type="text"
                    placeholder="John Doe"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addManualEntry()
                      }
                    }}
                  />
                </div>
                <Button 
                  type="button"
                  onClick={addManualEntry}
                  disabled={!manualEmail.trim()}
                >
                  Add
                </Button>
              </div>

              {/* Added entries preview */}
              {manualEntries.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Added manually:</Label>
                  <div className="flex flex-wrap gap-2">
                    {manualEntries.map((entry, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        {entry.name ? `${entry.name} <${entry.email}>` : entry.email}
                        <button
                          onClick={() => removeRecipient(entry.email)}
                          className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* CSV Import with visual cue */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSpreadsheet className="h-4 w-4" />
                Import from CSV
                <Badge variant="secondary" className="ml-2">Recommended for bulk</Badge>
              </CardTitle>
              <CardDescription>
                Need more fields like company, title, or custom data? Use a CSV file for full personalization with placeholders like {"{name}"}, {"{company}"}, etc.
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">
                  {recipients.length} Recipients Selected
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setRecipients([])
                    setSelectedContacts(new Set())
                    setSelectedGroups(new Set())
                    toast.success("All recipients cleared")
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {recipients.map((email, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      {email}
                      <button
                        onClick={() => removeRecipient(email)}
                        className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
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
                Preview personalized emails for each recipient
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Recipient Selector */}
              {recipients.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setPreviewRecipientIndex(Math.max(0, previewRecipientIndex - 1))}
                    disabled={previewRecipientIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      Recipient {previewRecipientIndex + 1} of {recipients.length}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setPreviewRecipientIndex(Math.min(recipients.length - 1, previewRecipientIndex + 1))}
                    disabled={previewRecipientIndex >= recipients.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Personalization Info */}
              {(() => {
                const preview = getPersonalizedContent(previewRecipientIndex)
                const hasPlaceholders = (subject + content).match(/\{\{?\w+\}?\}/)
                const csvRow = csvData.find(row => row.email === preview.email)
                const manualEntry = manualEntries.find(e => e.email === preview.email)
                
                return (
                  <>
                    {hasPlaceholders && (csvRow || manualEntry) && (
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <p className="text-sm font-medium text-primary mb-2">Personalization Data:</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(preview.data || {}).filter(([key, value]) => value && key !== 'email').map(([key, value]) => (
                            <Badge key={key} variant="outline" className="text-xs">
                              {key}: {value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="border rounded-lg p-4 bg-white dark:bg-zinc-900">
                      <div className="border-b pb-3 mb-3">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">To:</span> {preview.email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Subject:</span> {preview.subject}
                        </p>
                      </div>
                      <div 
                        className="prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: preview.content }}
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
                  </>
                )
              })()}

              {recipients.length === 0 && (
                <div className="border rounded-lg p-4 bg-white dark:bg-zinc-900">
                  <div className="border-b pb-3 mb-3">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">To:</span> recipient@example.com
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Subject:</span> {subject || "(No subject)"}
                    </p>
                  </div>
                  <div 
                    className="prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: content || "<p>Your email content will appear here...</p>" }}
                  />
                </div>
              )}
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
          disabled={isSending || isSavingDraft || isUploading || !subject || !content || recipients.length === 0}
          size="lg"
        >
          {saveAsDraft ? (
            isSavingDraft ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving Draft...
              </>
            ) : isUploading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Uploading Files...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save as Draft ({recipients.length} {recipients.length === 1 ? "recipient" : "recipients"})
              </>
            )
          ) : isUploading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Uploading Files...
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
      <Dialog open={showSendingDialog} onOpenChange={(open) => {
        // Prevent closing while sending unless stopped
        if (!open && isSending && !isStopping) {
          return
        }
        setShowSendingDialog(open)
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isStopping ? (
                <StopCircle className="h-5 w-5 text-warning animate-pulse" />
              ) : isSending ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : progress.percentage === 100 && !sendError ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : sendError || hasPendingRetries ? (
                <AlertCircle className="h-5 w-5 text-warning" />
              ) : null}
              {isStopping ? "Stopping..." : isSending ? "Sending Emails..." : "Campaign Status"}
            </DialogTitle>
            <DialogDescription>
              {progress.status}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Progress value={progress.percentage} className="h-3" />
            
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-success/10 rounded-lg">
                <div className="text-xl font-bold text-success">
                  {sendStatus.filter(s => s.status === "success").length}
                </div>
                <div className="text-xs text-muted-foreground">Sent</div>
              </div>
              <div className="text-center p-3 bg-destructive/10 rounded-lg">
                <div className="text-xl font-bold text-destructive">
                  {sendStatus.filter(s => s.status === "error").length}
                </div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
              <div className="text-center p-3 bg-warning/10 rounded-lg">
                <div className="text-xl font-bold text-warning">
                  {sendStatus.filter(s => s.status === "skipped" || s.status === "cancelled" || s.status === "pending").length}
                </div>
                <div className="text-xs text-muted-foreground">Remaining</div>
              </div>
            </div>

            {sendError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{sendError}</p>
              </div>
            )}

            {/* Stop Button - visible while sending */}
            {isSending && !isStopping && (
              <Button 
                onClick={stopSending} 
                variant="destructive" 
                className="w-full"
              >
                <StopCircle className="h-4 w-4 mr-2" />
                Stop Sending
              </Button>
            )}

            {/* Network status indicator */}
            {isOffline && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
                <WifiOff className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">Network disconnected. Waiting for connection...</p>
              </div>
            )}

            {/* Paused indicator (rate limit or network) */}
            {isPaused && !isOffline && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning animate-pulse" />
                <p className="text-sm text-warning">Paused - waiting to resume...</p>
              </div>
            )}

            {/* Stopping indicator */}
            {isStopping && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg text-center">
                <p className="text-sm text-warning">Stopping after current email completes...</p>
              </div>
            )}

            {/* Retry/Resume buttons - visible when not sending */}
            {hasPendingRetries && !isSending && (
              <Button onClick={retryFailedEmails} variant="outline" className="w-full">
                <Play className="h-4 w-4 mr-2" />
                Resume Sending ({failedEmails.length} remaining)
              </Button>
            )}

            {!isSending && (
              <Button onClick={() => setShowSendingDialog(false)} className="w-full">
                {progress.percentage === 100 && !sendError ? "Done" : "Close"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
