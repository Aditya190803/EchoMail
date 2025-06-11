import { google } from "googleapis"

export async function sendEmail(
  accessToken: string,
  to: string,
  subject: string,
  htmlBody: string,
  attachments?: File[],
) {
  const gmail = google.gmail({
    version: "v1",
    auth: new google.auth.OAuth2(),
  })

  // Set the access token
  gmail.context._options.auth = accessToken

  const boundary = "boundary_" + Math.random().toString(36).substr(2, 9)

  const email = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "",
    htmlBody,
  ]

  if (attachments && attachments.length > 0) {
    for (const file of attachments) {
      const buffer = await file.arrayBuffer()
      const base64 = Buffer.from(buffer).toString("base64")

      email.push(`--${boundary}`)
      email.push(`Content-Type: ${file.type}; name="${file.name}"`)
      email.push(`Content-Disposition: attachment; filename="${file.name}"`)
      email.push("Content-Transfer-Encoding: base64")
      email.push("")
      email.push(base64)
    }
  }

  email.push(`--${boundary}--`)

  const encodedEmail = Buffer.from(email.join("\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedEmail,
    },
  })

  return response.data
}

export function replacePlaceholders(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match)
}
