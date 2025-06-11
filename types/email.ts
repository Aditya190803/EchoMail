export interface EmailData {
  to: string[]
  subject: string
  message: string
  attachments?: File[]
}

export interface AttachmentData {
  name: string
  type: string
  data: string // base64 encoded
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
}

export interface SendStatus {
  email: string
  status: "pending" | "success" | "error"
  error?: string
}
