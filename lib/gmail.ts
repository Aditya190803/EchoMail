export interface AttachmentData {
  name: string
  type: string
  data: string // base64 encoded
}

export async function sendEmailViaAPI(
  accessToken: string,
  to: string,
  subject: string,
  htmlBody: string,
  attachments?: AttachmentData[],
) {
  const boundary = "boundary_" + Math.random().toString(36).substr(2, 9)

  // First, get the user's email address to use as 'From'
  const userResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
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

  const email = [
    `From: ${fromEmail}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "",
    htmlBody,
  ]

  if (attachments && attachments.length > 0) {
    for (const attachment of attachments) {
      email.push(`--${boundary}`)
      email.push(`Content-Type: ${attachment.type}; name="${attachment.name}"`)
      email.push(`Content-Disposition: attachment; filename="${attachment.name}"`)
      email.push("Content-Transfer-Encoding: base64")
      email.push("")
      email.push(attachment.data)
    }
  }

  email.push(`--${boundary}--`)

  const encodedEmail = Buffer.from(email.join("\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
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
