"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Paperclip, Eye, X, Send, CheckCircle, AlertCircle, Users, FileText, Plus, Trash2, Search, XCircle, RefreshCw, Clock, Gauge } from "lucide-react"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-white border-2 border-blue-200 max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    {(sendingPhase === 'preparing' || sendingPhase === 'uploading' || sendingPhase === 'sending' || emailSendingLoading) ? (
                      <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : stoppedDueToError || sendingPhase === 'error' ? (
                      <AlertCircle className="h-8 w-8 text-orange-600" />
                    ) : (
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    )}
                    <h2 className="text-2xl font-bold text-blue-900">
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
                  </div>
                  <p className="text-gray-600">
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

                {/* Preparing/Uploading Phase Indicator */}
                {(sendingPhase === 'preparing' || sendingPhase === 'uploading') && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          {sendingPhase === 'preparing' ? 'Preparing emails...' : 'Uploading attachments to Cloudinary...'}
                        </p>
                        <p className="text-xs text-blue-700">
                          {sendingPhase === 'preparing' 
                            ? 'Personalizing emails for each recipient' 
                            : 'This may take a moment for large files (max 10MB per file)'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Progress Bar - Only show after preparing phase */}
                {sendingPhase !== 'preparing' && sendingPhase !== 'uploading' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                      <span className="text-sm font-bold text-blue-600">{progress.percentage}%</span>
                    </div>
                    <Progress value={progress.percentage} className="w-full h-4 bg-blue-100" />
                  </div>
                )}

                {/* Real-time Statistics - Only show after preparing phase */}
                {sendingPhase !== 'preparing' && sendingPhase !== 'uploading' && (
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center p-3 bg-green-50 rounded-lg border-2 border-green-200">
                    <div className="text-2xl font-bold text-green-600 mb-1">{hookSendStatus.filter(s => s.status === 'success').length}</div>
                    <div className="text-xs font-medium text-green-800">Sent</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg border-2 border-red-200">
                    <div className="text-2xl font-bold text-red-600 mb-1">{hookSendStatus.filter(s => s.status === 'error').length}</div>
                    <div className="text-xs font-medium text-red-800">Failed</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                    <div className="text-2xl font-bold text-yellow-600 mb-1">{hookSendStatus.filter(s => s.status === 'skipped').length}</div>
                    <div className="text-xs font-medium text-yellow-800">Skipped</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <div className="text-2xl font-bold text-blue-600 mb-1">{hookSendStatus.filter(s => s.status === 'pending' || s.status === 'retrying').length}</div>
                    <div className="text-xs font-medium text-blue-800">Pending</div>
                  </div>
                </div>
                )}

                {/* Retrying indicator */}
                {hookSendStatus.some(s => s.status === 'retrying') && (
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-yellow-800 font-medium">
                        Retrying failed email... (attempt {hookSendStatus.find(s => s.status === 'retrying')?.retryCount}/3)
                      </span>
                    </div>
                  </div>
                )}

                {/* Show errors if any */}
                {hookSendStatus.filter(s => s.status === 'error').length > 0 && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-sm font-semibold text-red-900 mb-2">⚠️ Failed after 3 retries:</div>
                    <div className="max-h-24 overflow-y-auto space-y-1">
                      {hookSendStatus.filter(s => s.status === 'error').slice(0, 3).map((status, idx) => (
                        <div key={idx} className="text-xs text-red-700">
                          <span className="font-medium">{status.email}:</span> {status.error}
                        </div>
                      ))}
                      {hookSendStatus.filter(s => s.status === 'error').length > 3 && (
                        <div className="text-xs text-red-600 font-medium">
                          ...and {hookSendStatus.filter(s => s.status === 'error').length - 3} more failed
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Show skipped emails */}
                {hookSendStatus.filter(s => s.status === 'skipped').length > 0 && (
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="text-sm font-semibold text-yellow-900 mb-2">
                      ⏭️ {hookSendStatus.filter(s => s.status === 'skipped').length} emails were skipped
                    </div>
                    <p className="text-xs text-yellow-800">
                      These emails were not attempted because the campaign was stopped due to a persistent error.
                      You can retry them using the button below.
                    </p>
                  </div>
                )}

                {/* Current Email Status */}
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-700">{progress.status}</div>
                </div>

                {/* Quota Usage During Send */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Gauge className="h-3 w-3" />
                      Daily Quota Used
                    </span>
                    <span className={`font-medium ${quotaInfo.estimatedRemaining < 50 ? 'text-red-600' : quotaInfo.estimatedRemaining < 200 ? 'text-amber-600' : 'text-green-600'}`}>
                      {quotaInfo.estimatedUsed} / {quotaInfo.dailyLimit} (~{quotaInfo.estimatedRemaining} remaining)
                    </span>
                  </div>
                </div>

                {/* Retry Button - Show when there are failed/skipped emails */}
                {!emailSendingLoading && hasPendingRetries && (
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-center">
                      <p className="text-sm text-orange-800 mb-3">
                        <strong>{failedEmails.length} email(s)</strong> can be retried. 
                        If you hit a rate limit, wait a few minutes before retrying.
                      </p>
                      <Button 
                        onClick={async () => {
                          await retryFailedEmails()
                        }}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        🔄 Retry {failedEmails.length} Failed Email(s)
                      </Button>
                    </div>
                  </div>
                )}

                {/* Close button */}
                {!emailSendingLoading && !isLoading && (
                  <div className="text-center flex gap-3 justify-center">
                    <Button 
                      onClick={() => setShowSendingScreen(false)} 
                      variant="outline"
                      className="px-6 py-2"
                    >
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
        <div className="space-y-3 w-full max-w-2xl mx-auto px-2">
      {/* Success Alert */}
      {showSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">All emails sent successfully! 🎉</AlertDescription>
        </Alert>
      )}

      {/* Error Alert - Show user-friendly error message */}
      {emailSendingError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="font-medium mb-1">❌ Email Sending Failed</div>
            <div className="text-sm">{emailSendingError}</div>
            <div className="text-xs mt-2 text-red-700">
              <strong>What to try:</strong>
              <ul className="list-disc ml-4 mt-1">
                <li>If attachments are too large, reduce file sizes (max 5 MB each)</li>
                <li>If session expired, sign out and sign in again</li>
                <li>If rate limited, wait a few minutes before trying again</li>
              </ul>
            </div>
          </AlertDescription>
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
            </Label>            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(sanitizeInput(e.target.value))}
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
            <RichTextEditor 
              content={message} 
              onChange={(content) => setMessage(sanitizeInput(content))} 
            />
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
                Add Attachment (max {MAX_FILE_SIZE_MB}MB per file)
              </Button>
              <div className="flex flex-wrap gap-1">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1 text-xs">
                    <FileText className="h-3 w-3" />
                    <span className="max-w-20 truncate" title={file.name}>{file.name}</span>
                    <span className="text-gray-500">({(file.size / 1024 / 1024).toFixed(1)}MB)</span>
                    <button type="button" onClick={() => removeAttachment(idx)}>
                      <X className="h-3 w-3 ml-1 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
              {attachments.length > 0 && (
                <p className="text-xs text-gray-500">
                  Total: {(attachments.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(1)}MB
                </p>
              )}
            </div>
          </div>

          {/* Advanced Settings - Rate Limiting & Quota */}
          <Card className="shadow-sm w-full border-amber-200 bg-amber-50/50">
            <CardHeader className="p-3 cursor-pointer" onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}>
              <CardTitle className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-amber-600" />
                  <span>Sending Settings & Quota</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${quotaInfo.estimatedRemaining < 50 ? 'border-red-300 text-red-700 bg-red-50' : quotaInfo.estimatedRemaining < 200 ? 'border-amber-300 text-amber-700 bg-amber-50' : 'border-green-300 text-green-700 bg-green-50'}`}>
                    ~{quotaInfo.estimatedRemaining} emails remaining today
                  </Badge>
                  <span className="text-gray-400 text-xs">{showAdvancedSettings ? '▼' : '▶'}</span>
                </div>
              </CardTitle>
            </CardHeader>
            {showAdvancedSettings && (
              <CardContent className="p-3 pt-0 space-y-4">
                {/* Delay Between Emails */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-delay" className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      Delay Between Emails
                    </Label>
                    <span className="text-sm font-bold text-blue-600">{emailDelay}s</span>
                  </div>
                  <input
                    type="range"
                    id="email-delay"
                    min="1"
                    max="10"
                    step="1"
                    value={emailDelay}
                    onChange={(e) => setEmailDelay(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>1s (faster)</span>
                    <span>10s (safer)</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    💡 Increase delay if you're hitting Gmail rate limits. Recommended: 2-3s for large campaigns.
                  </p>
                </div>

                {/* Gmail Quota Info */}
                <div className="space-y-2 pt-2 border-t border-amber-200">
                  <Label className="text-sm font-medium">Gmail Daily Quota (Estimated)</Label>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Used today</span>
                      <span className="font-medium">{quotaInfo.estimatedUsed} / {quotaInfo.dailyLimit}</span>
                    </div>
                    <Progress 
                      value={(quotaInfo.estimatedUsed / quotaInfo.dailyLimit) * 100} 
                      className={`h-2 ${quotaInfo.estimatedRemaining < 50 ? 'bg-red-100' : quotaInfo.estimatedRemaining < 200 ? 'bg-amber-100' : 'bg-green-100'}`}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-600">
                      {quotaInfo.estimatedRemaining < 50 
                        ? '⚠️ Low quota! Consider waiting until tomorrow.' 
                        : quotaInfo.estimatedRemaining < 200 
                          ? '⚡ Moderate quota remaining. Use wisely!' 
                          : '✅ Plenty of quota available.'}
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation()
                        resetDailyQuota()
                      }}
                      className="text-xs h-6 px-2"
                    >
                      Reset Count
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Note: This is an estimate. Free Gmail accounts have ~500/day limit, Workspace has ~2000/day.
                    {quotaInfo.lastUpdated && ` Last updated: ${quotaInfo.lastUpdated.toLocaleTimeString()}`}
                  </p>
                </div>

                {/* Estimated Time */}
                {getAllEmailData().length > 0 && (
                  <div className="pt-2 border-t border-amber-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Estimated send time:</span>
                      <span className="font-medium text-blue-600">
                        ~{Math.ceil((getAllEmailData().length * emailDelay) / 60)} min {((getAllEmailData().length * emailDelay) % 60)}s
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Recipients Section */}
          <Card className="shadow-sm w-full">
            <CardHeader className="p-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                Recipients
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              {/* Source Selection */}
              <div className="space-y-3">
                <div className="text-xs text-gray-600 mb-2">Choose one or more recipient sources:</div>
                <div className="grid grid-cols-1 gap-2">
                  {/* CSV Upload Source */}
                  <div className={`border rounded-lg p-3 ${activeSources.includes("csv") ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        id="csv-source"
                        checked={activeSources.includes("csv")}
                        onChange={() => toggleSource("csv")}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="csv-source" className="text-sm font-medium">CSV Upload</label>
                      {csvData.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {csvData.length} contacts
                        </Badge>
                      )}
                    </div>
                    {activeSources.includes("csv") && (
                      <CSVUpload onDataLoad={setCsvData} csvData={csvData} />
                    )}
                  </div>

                  {/* Manual Entry Source */}
                  <div className={`border rounded-lg p-3 ${activeSources.includes("manual") ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        id="manual-source"
                        checked={activeSources.includes("manual")}
                        onChange={() => toggleSource("manual")}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="manual-source" className="text-sm font-medium">Manual Entry</label>
                      {manualEmails.filter((email) => email.email.trim()).length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {manualEmails.filter((email) => email.email.trim()).length} contacts
                        </Badge>
                      )}
                    </div>
                    {activeSources.includes("manual") && (
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
                    )}
                  </div>

                  {/* Contacts Source */}
                  <div className={`border rounded-lg p-3 ${activeSources.includes("contacts") ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        id="contacts-source"
                        checked={activeSources.includes("contacts")}
                        onChange={() => toggleSource("contacts")}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="contacts-source" className="text-sm font-medium">Contacts</label>
                      {selectedContacts.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedContacts.length} selected
                        </Badge>
                      )}
                    </div>
                    {activeSources.includes("contacts") && (
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
                        </div>
                        {/* Contact List */}
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
                    )}
                  </div>

                {/* Summary */}
                {activeSources.length === 0 ? (
                  <div className="mt-3 p-2 bg-yellow-50 rounded-lg">
                    <p className="text-xs text-yellow-800">
                      ⚠️ Please select at least one recipient source above
                    </p>
                  </div>
                ) : emailData.length > 0 ? (
                  <div className="mt-3 p-2 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-800">
                      📧 Total: {emailData.length} recipient(s) ready to send from {activeSources.length} source(s)
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
            </CardContent>
          </Card>

          {/* Action Buttons - Sticky at bottom */}
          {!showSendingScreen && (
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg p-4">
              <div className="max-w-2xl mx-auto">
                <Button
                  onClick={handlePreview}
                  disabled={!canSend || isLoading}
                  className="w-full h-12 text-sm font-medium shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview & Send
                </Button>
                {/* Status indicators */}
                {activeSources.length === 0 && (
                  <p className="text-xs text-amber-600 mt-2 text-center">
                    ⚠️ Please select at least one recipient source above
                  </p>
                )}
                {emailData.length === 0 && activeSources.length > 0 && (
                  <p className="text-xs text-blue-600 mt-2 text-center">
                    📝 Add recipients to the selected source(s)
                  </p>
                )}
                {emailData.length > 0 && (
                  <p className="text-xs text-green-600 mt-2 text-center">
                    📧 Ready to send to {emailData.length} recipient(s)
                    <span className="ml-1 text-blue-600">
                      (� Will send one by one for maximum reliability)
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Send Progress */}
          {(isLoading || emailSendingLoading) && (
            <Card>
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Sending Emails...</h3>
                    <span className="text-xs text-gray-500">{progress.percentage}%</span>
                  </div>
                  <Progress value={progress.percentage} className="w-full h-2" />
                  <p className="text-xs text-gray-600">{progress.status}</p>
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
                  {sendStatus.filter(s => s.status === 'skipped').length > 0 && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                      {sendStatus.filter(s => s.status === 'skipped').length} skipped
                    </span>
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
                          ) : status.status === "skipped" ? (
                            <XCircle className="h-3 w-3 text-yellow-600" />
                          ) : status.status === "retrying" ? (
                            <div className="h-3 w-3 border-2 border-yellow-400 border-t-yellow-600 rounded-full animate-spin" />
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
                                : status.status === "skipped"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : status.status === "retrying"
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {status.status === "success" ? "Sent" 
                            : status.status === "error" ? "Failed" 
                            : status.status === "skipped" ? "Skipped"
                            : status.status === "retrying" ? `Retry ${status.retryCount}/3`
                            : "Pending"}
                        </span>
                      </div>
                      {status.error && (
                        <div className="mt-1 p-2 bg-red-50 rounded border border-red-200">
                          <p className="text-xs text-red-700 font-medium">❌ {status.error}</p>
                        </div>
                      )}
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

          {/* Troubleshooting for Failed Emails */}
          {errorCount > 0 && (
            <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <h4 className="text-sm font-medium text-red-900 mb-2">⚠️ Why Some Emails Failed:</h4>
              <ul className="text-xs text-red-800 space-y-1">
                <li><strong>Email too large (413 error):</strong> Attachments are too big. Keep each file under 5 MB and total under 10 MB.</li>
                <li><strong>Session expired (401 error):</strong> Sign out and sign in again to refresh your Google access.</li>
                <li><strong>Rate limit (429 error):</strong> Gmail has daily sending limits. Wait a few minutes or try sending fewer emails.</li>
                <li><strong>Invalid email address:</strong> Check recipient email addresses for typos.</li>
                <li><strong>Network error:</strong> Check your internet connection and try again.</li>
              </ul>
              <div className="mt-2 pt-2 border-t border-red-200">
                <p className="text-xs text-red-700">
                  💡 <strong>Tip:</strong> If attachments cause issues, try uploading them to Google Drive and sharing the link in your email instead.
                </p>
              </div>
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
          )}        </CardContent>
      </Card>
    </div>
      )}
    </>
  )
}
