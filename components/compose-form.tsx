"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
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
import { replacePlaceholders } from "@/lib/gmail"
import type { CSVRow, PersonalizedEmail, SendStatus, AttachmentData } from "@/types/email"
import { useChunkErrorHandler } from "@/components/error-boundary"
import { v4 as uuidv4 } from 'uuid';

interface Contact {
  id: string
  email: string
  name?: string
  company?: string
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
  
  // Handle chunk loading errors
  useChunkErrorHandler()
  
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

  // Real-time progress tracking
  const [currentChunk, setCurrentChunk] = useState(0)
  const [totalChunks, setTotalChunks] = useState(0)
  const [emailsSent, setEmailsSent] = useState(0)
  const [emailsRemaining, setEmailsRemaining] = useState(0)
  const [currentProcessingMethod, setCurrentProcessingMethod] = useState<string>("")
  const [processingStatus, setProcessingStatus] = useState<string>("")

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
    if (isLoading) return // Prevent duplicate calls
    
    // Generate unique campaign ID for progress tracking
    const newCampaignId = uuidv4()
    console.log('Generated campaignId:', newCampaignId); // Debug log
    setCampaignId(newCampaignId)
    
    // Close preview and show sending screen
    setShowPreview(false)
    setShowSendingScreen(true)
    
    setIsLoading(true)
    setSendStatus([])
    setShowSuccess(false)
    setSendProgress(0)
    setCampaignSaved(false) // Mark campaign as not yet saved for this new send operation
    
    // Reset real-time progress tracking
    setCurrentChunk(0)
    setTotalChunks(0)
    setEmailsSent(0)
    setEmailsRemaining(0)
    setCurrentProcessingMethod("")
    setProcessingStatus("Initializing...")
    
    // Show immediate feedback that the process has started
    setProcessingStatus("Analyzing email campaign...")

    try {
      const personalizedEmails = await generatePersonalizedEmails()
      const totalEmails = personalizedEmails.length
      
      // Set initial counts
      setEmailsRemaining(totalEmails)
      setEmailsSent(0)
      setProcessingStatus(`Preparing to send ${totalEmails} emails...`)

      const initialStatus = personalizedEmails.map((email) => ({
        email: email.to,
        status: "pending" as const,
      }))
      setSendStatus(initialStatus)
      
      // Convert attachments to base64 and upload to Cloudinary
      let attachmentData: {base64: string, url: string, public_id: string, fileName: string, fileSize: number, type: string}[] = []
      if (attachments.length > 0) {
        setProcessingStatus("Processing attachments...")
        
        // First convert to base64
        const base64Attachments = await Promise.all(
          attachments.map(file => fileToBase64(file))
        )
        
        // Then upload to Cloudinary
        const cloudinaryData = await uploadAttachments(attachments)
        
        // Combine base64 data with Cloudinary data
        attachmentData = base64Attachments.map((base64Att, index) => ({
          base64: base64Att.data,
          url: cloudinaryData[index]?.url || '',
          public_id: cloudinaryData[index]?.public_id || '',
          fileName: base64Att.name,
          fileSize: cloudinaryData[index]?.fileSize || attachments[index].size,
          type: base64Att.type
        }))
        
        setProcessingStatus("Attachments processed successfully")
      }

      // Determine which sending method to use based on email count
      let results: any[] = []
      
      if (totalEmails > 100) {
        // Use chunked sending for large campaigns
        setCurrentProcessingMethod("🚀 Chunked Email Sending")
        setProcessingStatus("Preparing email batches...")
        
        console.log(`Using chunked sending for ${totalEmails} emails`)
        
        // Determine chunk size based on campaign size and attachments
        let chunkSize = 50 // Default chunk size
        if (attachments.length > 0) {
          chunkSize = 15 // Much smaller chunks for emails with attachments (was 25)
        }
        if (totalEmails > 500) {
          chunkSize = attachments.length > 0 ? 10 : 20 // Even smaller chunks for very large campaigns with attachments
        }
        
        // Split emails into chunks
        const chunks = []
        for (let i = 0; i < personalizedEmails.length; i += chunkSize) {
          const chunk = personalizedEmails.slice(i, i + chunkSize)
          
          // Add attachment data to each email in this chunk (use base64 directly)
          if (attachmentData.length > 0) {
            chunk.forEach(email => {
              email.attachments = attachmentData.map(att => ({
                name: att.fileName,
                type: att.type,
                data: att.base64 // Use base64 data directly instead of Cloudinary URL
              }))
            })
          }
          
          chunks.push(chunk)
        }
        
        setTotalChunks(chunks.length)
        setCurrentChunk(0)
        setProcessingStatus(`Split into ${chunks.length} batches of ~${chunkSize} emails each`)
        
        console.log(`Split ${totalEmails} emails into ${chunks.length} chunks`)
        
        // Process chunks sequentially
        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
          const chunk = chunks[chunkIndex]
          setCurrentChunk(chunkIndex + 1)
          setProcessingStatus(`Processing batch ${chunkIndex + 1} of ${chunks.length} (${chunk.length} emails)`)
          
          console.log(`Processing chunk ${chunkIndex + 1}/${chunks.length} with ${chunk.length} emails`)
          
          try {
            const response = await fetch("/api/send-email-chunk", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                personalizedEmails: chunk,
                chunkIndex,
                totalChunks: chunks.length,
                campaignId: newCampaignId,
                chunkInfo: {
                  totalEmails: totalEmails,
                  startIndex: chunkIndex * chunkSize,
                  endIndex: Math.min((chunkIndex + 1) * chunkSize - 1, totalEmails - 1)
                }
              }),
            })

            const data = await response.json()
            if (data.error) {
              throw new Error(data.error)
            }
            
            const chunkResults = data.results || []
            results.push(...chunkResults)
            
            console.log(`Chunk ${chunkIndex + 1} REAL results:`, {
              chunkEmails: chunk.length,
              chunkSuccessful: chunkResults.filter((r: any) => r.status === "success").length,
              chunkFailed: chunkResults.filter((r: any) => r.status === "error").length
            })
            
            // Update status for processed emails
            setSendStatus(prev => {
              const updated = [...prev]
              chunkResults.forEach((result: any) => {
                const index = updated.findIndex(status => status.email === result.email)
                if (index >= 0) {
                  updated[index] = result
                }
              })
              return updated
            })
            
            // Update processing status
            const completedChunks = chunkIndex + 1
            const remainingChunks = chunks.length - completedChunks
            if (remainingChunks > 0) {
              setProcessingStatus(`Batch ${completedChunks} completed. ${remainingChunks} batches remaining...`)
            } else {
              setProcessingStatus("All batches completed! Finalizing...")
            }
            
            // Small delay between chunks (except for the last one)
            if (chunkIndex < chunks.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
            
          } catch (chunkError) {
            console.error(`Error processing chunk ${chunkIndex + 1}:`, chunkError)
            // Mark chunk emails as failed
            const failedResults = chunk.map((email: any) => ({
              email: email.to,
              status: "error" as const,
              error: chunkError instanceof Error ? chunkError.message : "Chunk processing failed"
            }))
            results.push(...failedResults)
            
            // Update counters for REAL failed chunk
            const totalEmailsProcessedSoFar = results.length
            const totalEmailsSentSoFar = results.filter((r: any) => r.status === "success").length
            setEmailsSent(totalEmailsSentSoFar)
            setEmailsRemaining(totalEmails - totalEmailsProcessedSoFar)
            setProcessingStatus(`Batch ${chunkIndex + 1} failed. Continuing with remaining batches...`)
          }
        }
        
        setSendStatus(results)
        console.log("Chunked email sending results:", {
          totalEmails: totalEmails,
          results: results,
          chunks: chunks.length,
          chunkSize: chunkSize
        })
        
      } else {
        // Use existing batch or regular sending for smaller campaigns
        const shouldUseBatch = personalizedEmails.length > 5 || attachments.length > 0
        const apiEndpoint = shouldUseBatch ? "/api/send-email-batch" : "/api/send-email"

        if (shouldUseBatch) {
          setCurrentProcessingMethod("📦 Batch Email Sending")
          setProcessingStatus(`Processing ${totalEmails} emails in optimized batches`)
        } else {
          setCurrentProcessingMethod("📧 Direct Email Sending")
          setProcessingStatus(`Sending ${totalEmails} emails individually`)
        }

        console.log(`Using ${shouldUseBatch ? 'batched' : 'regular'} sending for ${personalizedEmails.length} emails ${attachments.length > 0 ? 'with attachments' : ''}`)

        // Add attachment data to emails for non-chunked sending
        if (attachmentData.length > 0) {
          personalizedEmails.forEach(email => {
            email.attachments = attachmentData.map(att => ({
              name: att.fileName,
              type: att.type,
              data: att.base64 // Use base64 data directly instead of Cloudinary URL
            }))
          })
        }

        setProcessingStatus("Sending emails...")
        
        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizedEmails,
            campaignId: newCampaignId, // Use the generated campaign ID
          }),
        })
        
        const data = await response.json()
        results = data.results || []
        setSendStatus(results)
        
        // Update with ACTUAL REAL results from API
        const successfulEmails = results.filter((r: any) => r.status === "success").length
        const failedEmails = results.filter((r: any) => r.status === "error").length
        
        // Set the REAL final counts
        setEmailsSent(successfulEmails)
        setEmailsRemaining(0) // All emails have been processed
        setProcessingStatus(`Email sending completed! ${successfulEmails} sent successfully, ${failedEmails} failed`)
        
        console.log("REAL API Results:", {
          totalRequested: totalEmails,
          actualResults: results.length,
          successful: successfulEmails,
          failed: failedEmails,
          results: results
        })

        console.log("Email sending results:", {
          totalEmails: personalizedEmails.length,
          results: results,
          summary: data.summary,
          endpoint: apiEndpoint,
          method: shouldUseBatch ? 'batched' : 'regular'
        })
      }

      // Final results with REAL data
      const successCount = results.filter((result: SendStatus) => result.status === "success").length
      const failedCount = results.filter((result: SendStatus) => result.status === "error").length
      const totalCount = results.length
      setProcessingStatus("Saving campaign data...")
      
      // Ensure final counts are accurate
      setEmailsSent(successCount)
      setEmailsRemaining(0)
      
      console.log("Email sending completed:", {
        totalEmails: personalizedEmails.length,
        results: results,
        successCount: successCount,
        failedCount: failedCount
      })
      
      // Use personalizedEmails to get the actual recipient list for campaign storage
      const recipientData = personalizedEmails.map(email => ({
        email: email.to,
        originalData: email.originalRowData
      }))

      console.log("About to save campaign data:", {
        recipientDataLength: recipientData.length,
        resultsLength: results.length,
        attachmentDataLength: attachmentData.length,
        subject: subject,
        hasSession: !!session
      })      // Save campaign data to Firebase
      await saveCampaignData(recipientData, results, attachmentData)
      setProcessingStatus(`Campaign completed! ${successCount} emails sent successfully, ${failedCount} failed.`)

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
      
      // Hide sending screen after a short delay to show final results
      setTimeout(() => {
        setShowSendingScreen(false)
      }, 3000)
    }
  }

  // Poll progress if campaignId is set and sending screen is active
  useEffect(() => {
    if (!campaignId || !showSendingScreen) return;
    
    console.log('Starting polling for campaignId:', campaignId); // Debug log
    
    let interval: NodeJS.Timeout;
    const poll = async () => {
      try {
        console.log('Polling progress for campaignId:', campaignId); // Debug log
        const res = await fetch(`/api/progress?campaignId=${campaignId}`);
        
        if (res.ok) {
          const data = await res.json();
          console.log('Progress data received:', data); // Debug log
          
          setEmailsSent(data.sent);
          setEmailsRemaining(data.total - data.sent - data.failed);
          setSendProgress(data.total ? Math.round(((data.sent + data.failed) / data.total) * 100) : 0);
          setProcessingStatus(data.status === 'completed' ? 'Completed!' : 'Sending...');
        } else {
          console.error('Failed to fetch progress:', res.status); // Debug log
        }
      } catch (error) {
        console.error('Error polling progress:', error); // Debug log
      }
    };
    
    interval = setInterval(poll, 1000);
    poll(); // Initial poll
    return () => clearInterval(interval);
  }, [campaignId, showSendingScreen]);

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
          <Card className="w-full max-w-2xl bg-white border-2 border-blue-200">
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <h2 className="text-2xl font-bold text-blue-900">Sending Your Campaign</h2>
                  </div>
                  <p className="text-gray-600">Please keep this window open while we send your emails</p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                    <span className="text-sm font-bold text-blue-600">{sendProgress}%</span>
                  </div>
                  <Progress value={sendProgress} className="w-full h-4 bg-blue-100" />
                </div>

                {/* Real-time Statistics */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-6 bg-green-50 rounded-lg border-2 border-green-200">
                    <div className="text-4xl font-bold text-green-600 mb-2">{emailsSent}</div>
                    <div className="text-sm font-medium text-green-800">Emails Sent</div>
                  </div>
                  <div className="text-center p-6 bg-orange-50 rounded-lg border-2 border-orange-200">
                    <div className="text-4xl font-bold text-orange-600 mb-2">{emailsRemaining}</div>
                    <div className="text-sm font-medium text-orange-800">Remaining</div>
                  </div>
                </div>

                {/* Chunk Progress (for large campaigns) */}
                {totalChunks > 1 && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-semibold text-blue-900">Batch Progress</span>
                      <span className="text-lg font-bold text-blue-600">{currentChunk} / {totalChunks}</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-4">
                      <div 
                        className="bg-blue-600 h-4 rounded-full transition-all duration-500" 
                        style={{ width: `${totalChunks > 0 ? (currentChunk / totalChunks) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Processing Method Info */}
                {currentProcessingMethod && (
                  <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-lg font-semibold text-gray-800 mb-2">{currentProcessingMethod}</div>
                    {processingStatus && (
                      <div className="text-sm text-gray-600">{processingStatus}</div>
                    )}
                  </div>
                )}

                {/* Status Message */}
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-lg text-blue-800 font-medium">
                    {processingStatus || "Processing your email campaign..."}
                  </p>
                  {!isLoading && (
                    <p className="text-sm text-gray-600 mt-2">
                      Campaign completed! This screen will close automatically in a few seconds.
                    </p>
                  )}
                </div>

                {/* Close button (only show when not actively sending) */}
                {!isLoading && (
                  <div className="text-center">
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
          </div>          {/* Recipients Section */}
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
                    {(emailData.length > 5 || attachments.length > 0) && (
                      <span className="ml-1 text-blue-600">
                        (📦 Will use smart batch processing for reliability)
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          )}

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
          )}        </CardContent>
      </Card>
    </div>
      )}
    </>
  )
}
