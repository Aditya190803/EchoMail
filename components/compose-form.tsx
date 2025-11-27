"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Paperclip, Eye, X, Send, CheckCircle, AlertCircle, Users, FileText, Plus, Trash2, Search, XCircle, RefreshCw, Clock, Gauge, Settings, Mail } from "lucide-react"
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
import { replacePlaceholders } from "@/lib/gmail"
import type { CSVRow, PersonalizedEmail, SendStatus, AttachmentData } from "@/types/email"
import { toast } from "sonner"

import { useEmailSend } from "@/hooks/useEmailSend"
import { v4 as uuidv4 } from 'uuid';

interface Contact {
  id: string
  email: string
  name?: string
  company?: string
}

interface ManualEmail {
  email: string
  name: string
  [key: string]: string
}

// Helper function to sanitize text input for proper UTF-8 handling
const sanitizeInput = (text: string): string => {
  // Normalize Unicode characters and replace problematic characters
  return text
    .normalize('NFC')
    .replace(/[\u2018\u2019]/g, "'") // Replace smart quotes
    .replace(/[\u201C\u201D]/g, '"') // Replace smart double quotes
    .replace(/[\u2013\u2014]/g, '-') // Replace en-dash and em-dash
    .replace(/[\u2026]/g, '...') // Replace ellipsis
}

export function ComposeForm() {
  const { data: session } = useSession()
  
  // Use the simplified email sending hook with retry functionality
  const { 
    sendEmails, 
    retryFailedEmails,
    progress, 
    sendStatus: hookSendStatus, 
    isLoading: emailSendingLoading, 
    error: emailSendingError,
    failedEmails,
    hasPendingRetries,
    stoppedDueToError,
    quotaInfo,
    resetDailyQuota
  } = useEmailSend()
  
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [csvData, setCsvData] = useState<CSVRow[]>([])
  const [manualEmails, setManualEmails] = useState<ManualEmail[]>([{ email: "", name: "" }])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([])
  const [contactSearch, setContactSearch] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [showSendingScreen, setShowSendingScreen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [sendStatus, setSendStatus] = useState<SendStatus[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [sendProgress, setSendProgress] = useState(0)
  const [activeSources, setActiveSources] = useState<string[]>(["csv"])
  const [campaignSaved, setCampaignSaved] = useState(false)
  const [campaignId, setCampaignId] = useState<string | null>(null);
  
  // Configurable delay between emails (in seconds)
  const [emailDelay, setEmailDelay] = useState(1) // Default 1 second
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  
  // Track sending phase for UI feedback
  const [sendingPhase, setSendingPhase] = useState<'idle' | 'preparing' | 'uploading' | 'sending' | 'complete' | 'error'>('idle')

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
  const saveCampaignData = async (emailData: any[], sendResults: SendStatus[], attachmentData: {url: string, public_id: string, fileName: string, fileSize: number, type: string}[]) => {
    console.log("saveCampaignData called with:", {
      hasSession: !!session,
      hasUserEmail: !!session?.user?.email,
      userEmail: session?.user?.email,
      campaignSaved: campaignSaved,
      emailDataLength: emailData.length,
      sendResultsLength: sendResults.length,
      attachmentDataLength: attachmentData.length
    })
    
    if (!session?.user?.email) {
      console.error("Cannot save campaign: No session or user email")
      return
    }
    
    if (campaignSaved) {
      console.log("Campaign already saved, skipping...")
      return
    }
    
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
        campaign_type: getCampaignType(),
        ...(attachmentInfo.length > 0 && { attachments: attachmentInfo }),
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
      console.error("Error details:", {
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        errorStack: error instanceof Error ? error.stack : undefined,
        campaignDataInfo: {
          subject: subject.trim(),
          emailDataLength: emailData.length,
          hasUserEmail: !!session?.user?.email
        }      })
      // Don't throw the error, just log it so email sending continues
    }
  }
  
  // Fetch contacts from Firebase
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

  // Helper function to toggle source selection
  const toggleSource = (source: string) => {
    setActiveSources(prev => {
      if (prev.includes(source)) {
        return prev.filter(s => s !== source)
      } else {
        return [...prev, source]
      }
    })
  }

  // Helper function to get all email data from active sources
  const getAllEmailData = (): any[] => {
    const allEmailData: any[] = []
    
    if (activeSources.includes("csv")) {
      allEmailData.push(...(csvData || []))
    }
    
    if (activeSources.includes("manual")) {
      const validManualEmails = (manualEmails || []).filter((email) => email.email.trim())
      allEmailData.push(...validManualEmails)
    }
    
    if (activeSources.includes("contacts")) {
      const contactEmails = (selectedContacts || []).map(contact => ({
        email: contact.email,
        name: contact.name || "",
        company: contact.company || ""
      }))
      allEmailData.push(...contactEmails)
    }
    
    return allEmailData
  }

  // Helper function to determine campaign type
  const getCampaignType = (): string => {
    if (activeSources.length > 1) return "mixed"
    if (activeSources.includes("csv")) return "bulk"
    if (activeSources.includes("contacts")) return "contact_list"
    if (activeSources.includes("manual")) return "manual"
    return "unknown"
  }

  const getFilteredContacts = () => {
    return contacts.filter(contact =>
      contact.email.toLowerCase().includes(contactSearch.toLowerCase()) ||
      (contact.name && contact.name.toLowerCase().includes(contactSearch.toLowerCase())) ||
      (contact.company && contact.company.toLowerCase().includes(contactSearch.toLowerCase()))
    )
  }

  // Maximum file size for Cloudinary free tier (10MB)
  const MAX_FILE_SIZE_MB = 10
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

  const handleFileAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    // Check file sizes before adding
    const oversizedFiles: string[] = []
    const validFiles: File[] = []
    
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        oversizedFiles.push(`${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`)
      } else {
        validFiles.push(file)
      }
    }
    
    if (oversizedFiles.length > 0) {
      alert(`The following files exceed the ${MAX_FILE_SIZE_MB}MB limit and were not added:\n\n${oversizedFiles.join('\n')}\n\nPlease compress or split large files.`)
    }
    
    if (validFiles.length > 0) {
      setAttachments((prev) => [...prev, ...validFiles])
    }
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
    // Note: Attachments will be handled separately via Cloudinary upload
    // This function no longer processes attachments to reduce payload size
    const emailData = getAllEmailData()

    // Ensure emailData is always an array before mapping
    if (!Array.isArray(emailData)) {
      return []
    }

    return emailData.map((row) => ({
      to: row.email,
      subject: replacePlaceholders(subject, row),
      message: replacePlaceholders(message, row),
      originalRowData: row,
      attachments: [], // Will be populated later with Cloudinary URLs
    }))
  }

  const handlePreview = async () => {
    const emailData = getAllEmailData()
    
    if (emailData.length === 0) {
      alert("Please add email recipients first")
      return
    }
    
    if (!subject.trim() || !message.trim()) {
      alert("Please fill in subject and message")
      return
    }
    setShowPreview(true)
  }

  const handleSend = async () => {
    if (isLoading || emailSendingLoading) return // Prevent duplicate calls
    
    // Close preview and show sending screen
    setShowPreview(false)
    setShowSendingScreen(true)
    setSendingPhase('preparing')
    
    setIsLoading(true)
    setSendStatus([])
    setShowSuccess(false)
    setSendProgress(0)
    setCampaignSaved(false)

    try {
      const personalizedEmails = await generatePersonalizedEmails()
      const totalEmails = personalizedEmails.length
      
      // Process attachments if any - Upload to Cloudinary and use URLs to avoid payload size issues
      let attachmentData: {url: string, public_id: string, fileName: string, fileSize: number, type: string}[] = []
      if (attachments.length > 0) {
        setSendingPhase('uploading')
        console.log("☁️ Uploading attachments to Cloudinary to avoid 413 payload errors...")
        
        try {
          // Upload to Cloudinary (files are stored there, not in the request payload)
          const cloudinaryData = await uploadAttachments(attachments)
          
          // Check if any uploads failed
          if (cloudinaryData.length === 0 && attachments.length > 0) {
            throw new Error('All attachment uploads failed. Please check file sizes (max 10MB each).')
          }
          
          if (cloudinaryData.length < attachments.length) {
            console.warn(`⚠️ Only ${cloudinaryData.length}/${attachments.length} attachments uploaded successfully`)
          }
          
          attachmentData = cloudinaryData.map((cloudAtt, index) => ({
            url: cloudAtt.url,
            public_id: cloudAtt.public_id,
            fileName: cloudAtt.fileName,
            fileSize: cloudAtt.fileSize,
            type: attachments[index]?.type || 'application/octet-stream'
          }))
        } catch (uploadError) {
          console.error('Attachment upload failed:', uploadError)
          setSendingPhase('error')
          setIsLoading(false)
          alert(`Failed to upload attachments: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}\n\nPlease ensure all files are under 10MB and try again.`)
          return
        }
        
        // Add Cloudinary URLs to each email - server will fetch the actual file content
        // This keeps the payload small (just URLs instead of base64 data)
        personalizedEmails.forEach(email => {
          email.attachments = attachmentData.map(att => ({
            name: att.fileName,
            type: att.type,
            data: 'cloudinary', // Placeholder - server will fetch from URL
            cloudinaryUrl: att.url // Server uses this to fetch the actual file
          }))
        })
        
        console.log(`✅ Added ${attachmentData.length} Cloudinary URLs to ${personalizedEmails.length} emails (no base64 in payload!)`)
        
        // Debug: Log attachment URLs
        if (personalizedEmails.length > 0 && personalizedEmails[0].attachments) {
          console.log("🔍 Attachment setup (Cloudinary URLs - minimal payload):", {
            attachmentCount: personalizedEmails[0].attachments.length,
            attachments: personalizedEmails[0].attachments.map(att => ({
              name: att.name,
              type: att.type,
              cloudinaryUrl: att.cloudinaryUrl
            }))
          })
        }
      } else {
        console.log("ℹ️ No attachments to process")
      }

      setSendingPhase('sending')
      console.log(`🚀 Sending ${totalEmails} emails sequentially with ${emailDelay}s delay between emails`)
      
      // Use the simple sequential email sending hook with configurable delay
      const results = await sendEmails(personalizedEmails, {
        delayBetweenEmails: emailDelay * 1000 // Convert seconds to milliseconds
      })
      
      // Update our local state with the results
      setSendStatus(results)
      
      const successCount = results.filter(r => r.status === "success").length
      const failedCount = results.filter(r => r.status === "error").length
      
      console.log("✅ Email sending completed:", {
        totalEmails: personalizedEmails.length,
        successCount,
        failedCount
      })
      
      // Save campaign data to Firebase
      const recipientData = personalizedEmails.map(email => ({
        email: email.to,
        originalData: email.originalRowData
      }))

      await saveCampaignData(recipientData, results, attachmentData)

      if (successCount === results.length) {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 5000)
      }
      
      setSendingPhase('complete')
      
    } catch (error) {
      console.error("Failed to send emails:", error)
      setSendingPhase('error')
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
      
      // Hide sending screen after a short delay to show final results
      setTimeout(() => {
        setShowSendingScreen(false)
        setSendingPhase('idle')
      }, 3000)
    }
  }

  // Clean up campaign state after sending
  useEffect(() => {
    if (!showSendingScreen && campaignId) {
      setCampaignId(null)
    }
  }, [showSendingScreen, campaignId])

  const getPersonalizedEmailsForPreview = (): PersonalizedEmail[] => {
    const emailData = getAllEmailData()

    // Ensure emailData is always an array before mapping
    if (!Array.isArray(emailData)) {
      return []
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
  
  const emailData = getAllEmailData()
  
  const canSend = subject.trim() && message.trim() && emailData.length > 0

  return (
    <>
      {/* Real-time Sending Screen - Full Screen Overlay */}
      {showSendingScreen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    {(sendingPhase === 'preparing' || sendingPhase === 'uploading' || sendingPhase === 'sending' || emailSendingLoading) ? (
                      <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    ) : stoppedDueToError || sendingPhase === 'error' ? (
                      <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-warning" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-success" />
                      </div>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold mb-2">
                    {sendingPhase === 'preparing' 
                      ? "Preparing Campaign..." 
                      : sendingPhase === 'uploading' 
                        ? "Uploading Attachments..." 
                        : (sendingPhase === 'sending' || emailSendingLoading)
                          ? "Sending Your Campaign" 
                          : stoppedDueToError || sendingPhase === 'error'
                            ? "Campaign Paused" 
                            : "Campaign Complete"}
                  </h2>
                  <p className="text-muted-foreground">
                    {sendingPhase === 'preparing' 
                      ? "Getting everything ready..." 
                      : sendingPhase === 'uploading' 
                        ? "Uploading attachments to cloud storage..." 
                        : (sendingPhase === 'sending' || emailSendingLoading)
                          ? `Sending emails one by one with ${emailDelay}s delay` 
                          : stoppedDueToError || sendingPhase === 'error'
                            ? "Sending stopped due to an error. You can retry the remaining emails."
                            : "All emails have been processed"}
                  </p>
                </div>

                {/* Preparing/Uploading Phase */}
                {(sendingPhase === 'preparing' || sendingPhase === 'uploading') && (
                  <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <div>
                        <p className="font-medium text-sm">
                          {sendingPhase === 'preparing' ? 'Preparing emails...' : 'Uploading attachments...'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sendingPhase === 'preparing' 
                            ? 'Personalizing emails for each recipient' 
                            : 'This may take a moment for large files'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                {sendingPhase !== 'preparing' && sendingPhase !== 'uploading' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Overall Progress</span>
                      <span className="font-bold text-primary">{progress.percentage}%</span>
                    </div>
                    <Progress value={progress.percentage} className="h-3" />
                  </div>
                )}

                {/* Statistics */}
                {sendingPhase !== 'preparing' && sendingPhase !== 'uploading' && (
                  <div className="grid grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-success/10 rounded-xl border border-success/20">
                      <div className="text-2xl font-bold text-success">{hookSendStatus.filter(s => s.status === 'success').length}</div>
                      <div className="text-xs text-muted-foreground">Sent</div>
                    </div>
                    <div className="text-center p-3 bg-destructive/10 rounded-xl border border-destructive/20">
                      <div className="text-2xl font-bold text-destructive">{hookSendStatus.filter(s => s.status === 'error').length}</div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                    </div>
                    <div className="text-center p-3 bg-warning/10 rounded-xl border border-warning/20">
                      <div className="text-2xl font-bold text-warning">{hookSendStatus.filter(s => s.status === 'skipped').length}</div>
                      <div className="text-xs text-muted-foreground">Skipped</div>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-xl border border-primary/20">
                      <div className="text-2xl font-bold text-primary">{hookSendStatus.filter(s => s.status === 'pending' || s.status === 'retrying').length}</div>
                      <div className="text-xs text-muted-foreground">Pending</div>
                    </div>
                  </div>
                )}

                {/* Retrying indicator */}
                {hookSendStatus.some(s => s.status === 'retrying') && (
                  <div className="p-3 bg-warning/10 rounded-xl border border-warning/20">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full border-2 border-warning border-t-transparent animate-spin" />
                      <span className="text-sm text-warning font-medium">
                        Retrying failed email... (attempt {hookSendStatus.find(s => s.status === 'retrying')?.retryCount}/3)
                      </span>
                    </div>
                  </div>
                )}

                {/* Errors */}
                {hookSendStatus.filter(s => s.status === 'error').length > 0 && (
                  <div className="p-4 bg-destructive/5 rounded-xl border border-destructive/20">
                    <div className="text-sm font-semibold text-destructive mb-2">⚠️ Failed after 3 retries:</div>
                    <div className="max-h-24 overflow-y-auto space-y-1">
                      {hookSendStatus.filter(s => s.status === 'error').slice(0, 3).map((status, idx) => (
                        <div key={idx} className="text-xs text-destructive/80">
                          <span className="font-medium">{status.email}:</span> {status.error}
                        </div>
                      ))}
                      {hookSendStatus.filter(s => s.status === 'error').length > 3 && (
                        <div className="text-xs text-destructive font-medium">
                          ...and {hookSendStatus.filter(s => s.status === 'error').length - 3} more failed
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Skipped */}
                {hookSendStatus.filter(s => s.status === 'skipped').length > 0 && (
                  <div className="p-4 bg-warning/5 rounded-xl border border-warning/20">
                    <div className="text-sm font-semibold text-warning mb-2">
                      ⏭️ {hookSendStatus.filter(s => s.status === 'skipped').length} emails were skipped
                    </div>
                    <p className="text-xs text-muted-foreground">
                      These emails were not attempted because the campaign was stopped due to a persistent error.
                    </p>
                  </div>
                )}

                {/* Current Status */}
                <div className="text-center p-4 bg-muted/50 rounded-xl">
                  <p className="text-sm text-muted-foreground">{progress.status}</p>
                </div>

                {/* Quota Info */}
                <div className="p-3 bg-muted/30 rounded-xl">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Gauge className="h-3 w-3" />
                      Daily Quota Used
                    </span>
                    <span className={`font-medium ${quotaInfo.estimatedRemaining < 50 ? 'text-destructive' : quotaInfo.estimatedRemaining < 200 ? 'text-warning' : 'text-success'}`}>
                      {quotaInfo.estimatedUsed} / {quotaInfo.dailyLimit}
                    </span>
                  </div>
                </div>

                {/* Retry Button */}
                {!emailSendingLoading && hasPendingRetries && (
                  <div className="p-4 bg-warning/5 rounded-xl border border-warning/20">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-3">
                        <strong>{failedEmails.length} email(s)</strong> can be retried.
                      </p>
                      <Button onClick={() => retryFailedEmails()} variant="warning">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry {failedEmails.length} Failed Email(s)
                      </Button>
                    </div>
                  </div>
                )}

                {/* Close button */}
                {!emailSendingLoading && !isLoading && (
                  <div className="text-center">
                    <Button onClick={() => setShowSendingScreen(false)} variant="outline">
                      Close
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Compose Form */}
      {!showSendingScreen && (
        <div className="space-y-6 w-full max-w-3xl mx-auto">
      {/* Success Alert */}
      {showSuccess && (
        <Alert className="border-success/50 bg-success/10">
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">All emails sent successfully! 🎉</AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {emailSendingError && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            <div className="font-medium mb-1">Email Sending Failed</div>
            <div className="text-sm">{emailSendingError}</div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Compose Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Compose Email
          </CardTitle>
          <CardDescription>Create personalized emails for your recipients</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Subject Field */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject Line</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(sanitizeInput(e.target.value))}
              placeholder="Enter email subject (use {{placeholders}} for personalization)"
            />
            <p className="text-xs text-muted-foreground">
              Example: "Hello {`{{name}}`}, special offer for {`{{company}}`}"
            </p>
          </div>

          {/* Message Field */}
          <div className="space-y-2">
            <Label htmlFor="message">Email Message</Label>
            <RichTextEditor 
              content={message} 
              onChange={(content) => setMessage(sanitizeInput(content))} 
            />
            <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
              <p className="text-xs text-muted-foreground">
                💡 <strong>Pro Tip:</strong> Use placeholders like {`{{name}}`}, {`{{company}}`}, or {`{{email}}`} to
                personalize your emails based on your recipient data.
              </p>
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label htmlFor="attachments">Attachments</Label>
            <div className="space-y-2">
              <input type="file" id="attachments" multiple onChange={handleFileAttachment} className="hidden" />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById("attachments")?.click()}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Add Attachment (max {MAX_FILE_SIZE_MB}MB per file)
              </Button>
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((file, idx) => (
                    <Badge key={idx} variant="secondary" className="flex items-center gap-2 py-1.5 px-3">
                      <FileText className="h-3 w-3" />
                      <span className="max-w-32 truncate">{file.name}</span>
                      <span className="text-muted-foreground">({(file.size / 1024 / 1024).toFixed(1)}MB)</span>
                      <button type="button" onClick={() => removeAttachment(idx)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Advanced Settings */}
          <Card className="border-warning/30 bg-warning/5">
            <CardHeader className="p-4 cursor-pointer" onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}>
              <CardTitle className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-warning" />
                  <span>Sending Settings & Quota</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={quotaInfo.estimatedRemaining < 50 ? 'destructive' : quotaInfo.estimatedRemaining < 200 ? 'warning' : 'success'}>
                    ~{quotaInfo.estimatedRemaining} emails remaining
                  </Badge>
                  <span className="text-muted-foreground text-xs">{showAdvancedSettings ? '▼' : '▶'}</span>
                </div>
              </CardTitle>
            </CardHeader>
            {showAdvancedSettings && (
              <CardContent className="p-4 pt-0 space-y-4">
                {/* Delay Settings */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      Delay Between Emails
                    </Label>
                    <span className="font-bold text-primary">{emailDelay}s</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={emailDelay}
                    onChange={(e) => setEmailDelay(Number(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1s (faster)</span>
                    <span>10s (safer)</span>
                  </div>
                </div>

                {/* Quota Info */}
                <div className="space-y-2 pt-4 border-t">
                  <Label>Gmail Daily Quota</Label>
                  <Progress 
                    value={(quotaInfo.estimatedUsed / quotaInfo.dailyLimit) * 100} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{quotaInfo.estimatedUsed} used</span>
                    <span>{quotaInfo.dailyLimit} limit</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation()
                      resetDailyQuota()
                      toast.success("Quota count reset")
                    }}
                    className="text-xs h-7"
                  >
                    Reset Count
                  </Button>
                </div>

                {/* Estimated Time */}
                {getAllEmailData().length > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Estimated send time:</span>
                      <span className="font-medium text-primary">
                        ~{Math.ceil((getAllEmailData().length * emailDelay) / 60)} min
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Recipients Section */}
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Recipients
              </CardTitle>
              <CardDescription>Choose one or more recipient sources</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-4">
                {/* CSV Upload Source */}
                <div className={`border rounded-xl p-4 transition-colors ${activeSources.includes("csv") ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="csv-source"
                      checked={activeSources.includes("csv")}
                      onChange={() => toggleSource("csv")}
                      className="rounded border-border"
                    />
                    <label htmlFor="csv-source" className="text-sm font-medium cursor-pointer">CSV Upload</label>
                    {csvData.length > 0 && (
                      <Badge variant="secondary">{csvData.length} contacts</Badge>
                    )}
                  </div>
                  {activeSources.includes("csv") && (
                    <CSVUpload onDataLoad={setCsvData} csvData={csvData} />
                  )}
                </div>

                {/* Manual Entry Source */}
                <div className={`border rounded-xl p-4 transition-colors ${activeSources.includes("manual") ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="manual-source"
                      checked={activeSources.includes("manual")}
                      onChange={() => toggleSource("manual")}
                      className="rounded border-border"
                    />
                    <label htmlFor="manual-source" className="text-sm font-medium cursor-pointer">Manual Entry</label>
                    {manualEmails.filter((email) => email.email.trim()).length > 0 && (
                      <Badge variant="secondary">{manualEmails.filter((email) => email.email.trim()).length} contacts</Badge>
                    )}
                  </div>
                  {activeSources.includes("manual") && (
                    <div className="space-y-3">
                      {manualEmails.map((email, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            type="email"
                            placeholder="Email"
                            value={email.email}
                            onChange={(e) => updateManualEmail(idx, "email", e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            type="text"
                            placeholder="Name"
                            value={email.name}
                            onChange={(e) => updateManualEmail(idx, "name", e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeManualEmail(idx)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" onClick={addManualEmail} className="w-full">
                        <Plus className="h-4 w-4 mr-2" /> Add Recipient
                      </Button>
                    </div>
                  )}
                </div>

                {/* Contacts Source */}
                <div className={`border rounded-xl p-4 transition-colors ${activeSources.includes("contacts") ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="contacts-source"
                      checked={activeSources.includes("contacts")}
                      onChange={() => toggleSource("contacts")}
                      className="rounded border-border"
                    />
                    <label htmlFor="contacts-source" className="text-sm font-medium cursor-pointer">Contacts</label>
                    {selectedContacts.length > 0 && (
                      <Badge variant="secondary">{selectedContacts.length} selected</Badge>
                    )}
                  </div>
                  {activeSources.includes("contacts") && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          icon={<Search className="h-4 w-4" />}
                          placeholder="Search contacts..."
                          value={contactSearch}
                          onChange={(e) => setContactSearch(e.target.value)}
                          className="flex-1"
                        />
                        <Button variant="outline" size="sm" onClick={selectAllFilteredContacts}>
                          Add All
                        </Button>
                        <Button variant="outline" size="sm" onClick={clearContactSelection}>
                          Clear
                        </Button>
                      </div>
                      <div className="max-h-60 overflow-y-auto rounded-lg border">
                        {getFilteredContacts().length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">No contacts found</p>
                        ) : (
                          getFilteredContacts().map((contact) => (
                            <div
                              key={contact.id}
                              className={`flex items-center justify-between gap-2 p-3 cursor-pointer border-b last:border-b-0 transition-colors
                              ${selectedContacts.find(c => c.id === contact.id) ? "bg-primary/10" : "hover:bg-muted/50"}`}
                              onClick={() => toggleContactSelection(contact)}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{contact.name || "Unnamed"}</p>
                                <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                              </div>
                              {selectedContacts.find(c => c.id === contact.id) && (
                                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Summary */}
                {activeSources.length === 0 ? (
                  <div className="p-3 bg-warning/10 rounded-lg border border-warning/30">
                    <p className="text-sm text-warning">
                      ⚠️ Please select at least one recipient source
                    </p>
                  </div>
                ) : emailData.length > 0 ? (
                  <div className="p-3 bg-success/10 rounded-lg border border-success/30">
                    <p className="text-sm text-success">
                      📧 {emailData.length} recipient(s) ready from {activeSources.length} source(s)
                    </p>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Action Button */}
          <div className="sticky bottom-4 z-10">
            <Button
              onClick={handlePreview}
              disabled={!canSend || isLoading}
              className="w-full h-12 shadow-lg"
              size="xl"
            >
              <Eye className="h-5 w-5 mr-2" />
              Preview & Send
            </Button>
            {emailData.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Ready to send to {emailData.length} recipient(s)
              </p>
            )}
          </div>

          {/* Send Progress */}
          {(isLoading || emailSendingLoading) && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Sending Emails...</h3>
                    <span className="text-sm text-muted-foreground">{progress.percentage}%</span>
                  </div>
                  <Progress value={progress.percentage} className="h-2" />
                  <p className="text-sm text-muted-foreground">{progress.status}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Send Status Results */}
          {sendStatus.length > 0 && (
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-2 flex-wrap text-base">
                  <Users className="h-4 w-4" />
                  Send Results
                  {successCount > 0 && <Badge variant="success">{successCount} sent</Badge>}
                  {errorCount > 0 && <Badge variant="destructive">{errorCount} failed</Badge>}
                  {sendStatus.filter(s => s.status === 'skipped').length > 0 && (
                    <Badge variant="warning">{sendStatus.filter(s => s.status === 'skipped').length} skipped</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {sendStatus.map((status, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {status.status === "success" ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : status.status === "error" ? (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        ) : status.status === "skipped" ? (
                          <XCircle className="h-4 w-4 text-warning" />
                        ) : status.status === "retrying" ? (
                          <div className="h-4 w-4 border-2 border-warning border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
                        )}
                        <span className="text-sm font-medium truncate max-w-xs">{status.email}</span>
                      </div>
                      <Badge
                        variant={
                          status.status === "success" ? "success" :
                          status.status === "error" ? "destructive" :
                          status.status === "skipped" ? "warning" :
                          "secondary"
                        }
                      >
                        {status.status === "success" ? "Sent" : 
                          status.status === "error" ? "Failed" : 
                          status.status === "skipped" ? "Skipped" :
                          status.status === "retrying" ? `Retry ${status.retryCount}/3` :
                          "Pending"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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
    </div>
      )}
    </>
  )
}
