export async function sendEmailViaAPI(
  accessToken: string,
  to: string,
  subject: string,
  htmlBody: string,
  attachments?: File[],
) {
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
    throw new Error(`Gmail API error: ${error}`)
  }

  return await response.json()
}

export function replacePlaceholders(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match)
}
