import { formatEmailHTML, sanitizeEmailHTML } from './email-formatter'

export interface AttachmentData {
  name: string
  type: string
  data: string // base64 encoded
}

// Helper function to sanitize and encode text for proper UTF-8 handling
function sanitizeText(text: string): string {
  // Normalize Unicode characters and ensure proper UTF-8 encoding
  return text.normalize('NFC').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
}

// Helper function to encode subject line for proper UTF-8 handling
function encodeSubject(subject: string): string {
  // Always encode for consistent UTF-8 handling, even for ASCII characters
  const sanitized = sanitizeText(subject)
  const encoded = Buffer.from(sanitized, 'utf8').toString('base64')
  return `=?UTF-8?B?${encoded}?=`
}

export async function sendEmailViaAPI(
  accessToken: string,
  to: string,
  subject: string,
  htmlBody: string,
  attachments?: AttachmentData[],
) {
  console.log('Sending email with UTF-8 encoding:', {
    to,
    subject,
    subjectLength: subject.length,
    hasSpecialChars: /[^\x00-\x7F]/.test(subject),
    bodyLength: htmlBody.length
  })
  
  const boundary = "boundary_" + Math.random().toString(36).substr(2, 9)

  // Timeout configuration
  const REQUEST_TIMEOUT = 30000 // 30 seconds timeout

  // Helper function to create a request with timeout
  const fetchWithTimeout = async (url: string, options: RequestInit) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${REQUEST_TIMEOUT}ms`)
      }
      throw error
    }
  }

  // First, get the user's email address to use as 'From'
  const userResponse = await fetchWithTimeout("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!userResponse.ok) {
    throw new Error("Failed to get user profile from Gmail API")
  }

  const userProfile = await userResponse.json()
  const fromEmail = userProfile.emailAddress

  // Properly encode the subject line to handle UTF-8 characters
  const encodedSubject = encodeSubject(subject)
  
  // Sanitize and format the HTML body for email clients
  const sanitizedHtmlBody = sanitizeEmailHTML(htmlBody)
  const formattedHtmlBody = formatEmailHTML(sanitizedHtmlBody)

  const email = [
    `From: ${fromEmail}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    `Content-Transfer-Encoding: 8bit`,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    formattedHtmlBody,
  ]

  if (attachments && attachments.length > 0) {
    for (const attachment of attachments) {
      // Always encode attachment filename for consistent UTF-8 handling
      const encodedFilename = `=?UTF-8?B?${Buffer.from(attachment.name, 'utf8').toString('base64')}?=`
        
      email.push(`--${boundary}`)
      email.push(`Content-Type: ${attachment.type}; name="${encodedFilename}"`)
      email.push(`Content-Disposition: attachment; filename="${encodedFilename}"`)
      email.push("Content-Transfer-Encoding: base64")
      email.push("")
      email.push(attachment.data)
    }
  }

  email.push(`--${boundary}--`)

  // Explicitly encode as UTF-8 to handle international characters properly
  const encodedEmail = Buffer.from(email.join("\n"), 'utf8')
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

  const response = await fetchWithTimeout("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw: encodedEmail,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`Gmail API error for ${to}:`, {
      status: response.status,
      statusText: response.statusText,
      error: error
    })
    throw new Error(`Gmail API error (${response.status}): ${error}`)
  }

  const result = await response.json()
  console.log(`Email sent successfully to ${to}, Gmail message ID: ${result.id}`)
  return result
}

export function replacePlaceholders(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match)
}
