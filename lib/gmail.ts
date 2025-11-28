import { formatEmailHTML, sanitizeEmailHTML } from './email-formatter'

export interface AttachmentData {
  name: string
  type: string
  data: string // base64 encoded data, or URL to fetch from
  cloudinaryUrl?: string // Legacy: If provided, attachment will be fetched from this URL
  appwriteFileId?: string // If provided, attachment will be fetched from Appwrite storage
  appwriteUrl?: string // Full URL to fetch attachment from Appwrite
}

function sanitizeText(text: string): string {
  // Normalize Unicode characters and ensure proper UTF-8 encoding
  return text.normalize('NFC').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
}

// Helper function to validate and sanitize email addresses
function validateAndSanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new Error('Email address is required and must be a string')
  }
  
  // Remove any whitespace and normalize
  const cleanEmail = email.trim().toLowerCase()
  
  // Basic email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  
  if (!emailRegex.test(cleanEmail)) {
    throw new Error(`Invalid email address format: ${cleanEmail}`)
  }
  
  // Additional Gmail-specific validation
  if (cleanEmail.length > 254) {
    throw new Error(`Email address too long: ${cleanEmail}`)
  }
  
  return cleanEmail
}

// Helper function to encode subject line for proper UTF-8 handling
function encodeSubject(subject: string): string {
  // Always encode for consistent UTF-8 handling, even for ASCII characters
  const sanitized = sanitizeText(subject)
  const encoded = Buffer.from(sanitized, 'utf8').toString('base64')
  return `=?UTF-8?B?${encoded}?=`
}

// Helper function to download attachment from URL and convert to base64
async function downloadAttachmentToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download attachment: ${response.statusText}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    return buffer.toString('base64')
  } catch (error) {
    console.error('Error downloading attachment:', error)
    throw new Error(`Failed to download attachment from ${url}`)
  }
}

export async function sendEmailViaAPI(
  accessToken: string,
  to: string,
  subject: string,
  htmlBody: string,
  attachments?: AttachmentData[],
) {
  // Validate and sanitize the recipient email
  const validatedTo = validateAndSanitizeEmail(to)
  
  console.log('Sending email with UTF-8 encoding:', {
    to: validatedTo,
    originalTo: to,
    subject,
    subjectLength: subject.length,
    hasSpecialChars: /[^\x00-\x7F]/.test(subject),
    bodyLength: htmlBody.length,
    attachmentCount: attachments ? attachments.length : 0
  })

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
  
  // Sanitize and format the HTML body to match Gmail's native format
  const sanitizedHtmlBody = sanitizeEmailHTML(htmlBody)
  const formattedHtmlBody = formatEmailHTML(sanitizedHtmlBody)

  // Build email in Gmail's native format
  // Gmail sends emails with multipart/alternative (text + html) wrapped in multipart/mixed if attachments
  const mixedBoundary = "----=_Part_" + Math.random().toString(36).substr(2, 9)
  const altBoundary = "----=_Alt_" + Math.random().toString(36).substr(2, 9)
  
  // Create plain text version by stripping HTML
  const plainText = formattedHtmlBody
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  let email: string[]
  
  if (attachments && attachments.length > 0) {
    // With attachments: multipart/mixed containing multipart/alternative + attachments
    email = [
      `From: ${fromEmail}`,
      `To: ${validatedTo}`,
      `Subject: ${encodedSubject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
      "",
      `--${mixedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      "",
      `--${altBoundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: quoted-printable`,
      "",
      plainText,
      "",
      `--${altBoundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: quoted-printable`,
      "",
      formattedHtmlBody,
      "",
      `--${altBoundary}--`,
    ]
    
    console.log(`📎 Processing ${attachments.length} attachments for email to ${validatedTo}`)
    
    for (const attachment of attachments) {
      const encodedFilename = `=?UTF-8?B?${Buffer.from(attachment.name, 'utf8').toString('base64')}?=`
      
      let attachmentData = attachment.data
      
      console.log(`📎 Processing attachment: ${attachment.name} (${attachment.type})`)
      
      // Handle Appwrite storage attachments
      if (attachment.appwriteUrl || attachment.appwriteFileId) {
        const fetchUrl = attachment.appwriteUrl || attachment.data
        console.log(`📦 Fetching attachment from Appwrite: ${attachment.name}`)
        try {
          const attachmentResponse = await fetchWithTimeout(fetchUrl, {
            method: 'GET'
          })
          
          if (!attachmentResponse.ok) {
            throw new Error(`Failed to download attachment: ${attachmentResponse.statusText}`)
          }
          
          const arrayBuffer = await attachmentResponse.arrayBuffer()
          attachmentData = Buffer.from(arrayBuffer).toString('base64')
          console.log(`✅ Successfully downloaded attachment from Appwrite: ${attachment.name}`)
        } catch (error) {
          console.error(`❌ Failed to download attachment ${attachment.name} from Appwrite:`, error)
          throw new Error(`Failed to download attachment ${attachment.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      } else if (attachment.cloudinaryUrl) {
        // Legacy Cloudinary support
        console.log(`☁️ Fetching attachment from Cloudinary (legacy): ${attachment.name}`)
        try {
          const attachmentResponse = await fetchWithTimeout(attachment.cloudinaryUrl, {
            method: 'GET'
          })
          
          if (!attachmentResponse.ok) {
            throw new Error(`Failed to download attachment: ${attachmentResponse.statusText}`)
          }
          
          const arrayBuffer = await attachmentResponse.arrayBuffer()
          attachmentData = Buffer.from(arrayBuffer).toString('base64')
          console.log(`✅ Successfully downloaded attachment from Cloudinary: ${attachment.name}`)
        } catch (error) {
          console.error(`❌ Failed to download attachment ${attachment.name} from Cloudinary:`, error)
          throw new Error(`Failed to download attachment ${attachment.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      } else if (attachment.data.startsWith('http')) {
        console.log(`📎 Fetching attachment from URL (legacy): ${attachment.data}`)
        try {
          const attachmentResponse = await fetchWithTimeout(attachment.data, {
            method: 'GET'
          })
          
          if (!attachmentResponse.ok) {
            throw new Error(`Failed to download attachment: ${attachmentResponse.statusText}`)
          }
          
          const arrayBuffer = await attachmentResponse.arrayBuffer()
          attachmentData = Buffer.from(arrayBuffer).toString('base64')
          console.log(`✅ Successfully downloaded and converted attachment: ${attachment.name}`)
        } catch (error) {
          console.error(`❌ Failed to download attachment ${attachment.name}:`, error)
          throw new Error(`Failed to download attachment ${attachment.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      } else {
        console.log(`✅ Using base64 attachment data directly: ${attachment.name}`)
      }
        
      email.push(`--${mixedBoundary}`)
      email.push(`Content-Type: ${attachment.type}; name="${encodedFilename}"`)
      email.push(`Content-Disposition: attachment; filename="${encodedFilename}"`)
      email.push(`Content-Transfer-Encoding: base64`)
      email.push("")
      email.push(attachmentData)
    }
    
    email.push(`--${mixedBoundary}--`)
  } else {
    // No attachments: simple multipart/alternative with text and html
    email = [
      `From: ${fromEmail}`,
      `To: ${validatedTo}`,
      `Subject: ${encodedSubject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      "",
      `--${altBoundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: quoted-printable`,
      "",
      plainText,
      "",
      `--${altBoundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: quoted-printable`,
      "",
      formattedHtmlBody,
      "",
      `--${altBoundary}--`,
    ]
  }

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
    const errorText = await response.text()
    let errorDetails = errorText
    
    try {
      const errorJson = JSON.parse(errorText)
      errorDetails = errorJson.error?.message || errorText
      
      // Provide specific error messages for common issues
      if (errorDetails.includes('Invalid To header')) {
        throw new Error(`Invalid email address: ${validatedTo}. Please check the email format.`)
      } else if (errorDetails.includes('rateLimitExceeded')) {
        throw new Error(`Gmail rate limit exceeded. Please wait before sending more emails.`)
      } else if (errorDetails.includes('quotaExceeded')) {
        throw new Error(`Gmail quota exceeded. Daily sending limit reached.`)
      }
    } catch (parseError) {
      // If we can't parse the error, use the raw text
    }
    
    console.error(`Gmail API error for ${validatedTo}:`, {
      status: response.status,
      statusText: response.statusText,
      error: errorDetails,
      originalTo: to
    })
    throw new Error(`Gmail API error (${response.status}): ${errorDetails}`)
  }

  const result = await response.json()
  console.log(`Email sent successfully to ${validatedTo}, Gmail message ID: ${result.id}`)
  return result
}

export function replacePlaceholders(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match)
}
