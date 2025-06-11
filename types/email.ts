export interface EmailData {
  to: string[]
  subject: string
  message: string
  attachments?: File[]
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
}

export interface SendStatus {
  email: string
  status: "pending" | "success" | "error"
  error?: string
}
