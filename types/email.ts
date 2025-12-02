export interface EmailData {
  to: string[]
  subject: string
  message: string
  attachments?: File[]
}

export interface AttachmentData {
  name: string
  type: string
  data: string // base64 encoded OR 'appwrite' placeholder
  appwriteUrl?: string // Appwrite Storage URL for server-side fetching
  appwriteFileId?: string // Appwrite file ID
  fileSize?: number
}

/**
 * Personalized attachment from external URL (Google Drive, OneDrive, etc.)
 * Each recipient can have their own unique attachment fetched from a URL
 */
export interface PersonalizedAttachment {
  url: string // URL to fetch the file from (Google Drive, OneDrive, Dropbox, direct link)
  fileName?: string // Optional custom filename, otherwise derived from URL or recipient name
}

export interface CSVRow {
  email: string
  [key: string]: string
}

export interface PersonalizedEmail {
  to: string
  subject: string
  message: string
  originalRowData: CSVRow
  attachments?: AttachmentData[]
  personalizedAttachment?: PersonalizedAttachment // Per-recipient attachment from URL
}

export interface SendStatus {
  email: string
  status: "pending" | "success" | "error" | "skipped" | "retrying"
  error?: string
  retryCount?: number
  index?: number
}
