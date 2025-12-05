import { formatEmailHTML, sanitizeEmailHTML } from "./email-formatter";
import { serverStorageService } from "./appwrite-server";
import { emailLogger } from "./logger";

export interface AttachmentData {
  name: string;
  type: string;
  data: string; // base64 encoded data, or 'appwrite' placeholder
  appwriteFileId?: string; // If provided, attachment will be fetched from Appwrite storage
  appwriteUrl?: string; // Full URL to fetch attachment from Appwrite
}

// Cache for resolved attachments (keyed by appwriteFileId)
const attachmentCache = new Map<string, string>();

// Cache for pre-built email templates (for bulk sending)
interface EmailTemplate {
  fromEmail: string;
  subject: string;
  bodyParts: string; // Pre-built MIME body (everything after headers)
  totalSize: number;
}
let cachedEmailTemplate: EmailTemplate | null = null;

/**
 * Pre-resolve all Appwrite attachments to base64 ONCE before sending loop.
 * This prevents downloading the same attachment multiple times for bulk sends.
 * Call this once before sending emails, then pass the resolved attachments to sendEmailViaAPI.
 */
export async function preResolveAttachments(
  attachments: AttachmentData[],
): Promise<AttachmentData[]> {
  if (!attachments || attachments.length === 0) return [];

  const resolvedAttachments: AttachmentData[] = [];

  for (const attachment of attachments) {
    // If already has base64 data (not a placeholder), use directly
    if (
      attachment.data &&
      attachment.data !== "appwrite" &&
      !attachment.data.startsWith("http")
    ) {
      resolvedAttachments.push(attachment);
      continue;
    }

    // Determine the fileId to fetch
    let fileId: string | null = null;

    if (attachment.appwriteFileId) {
      fileId = attachment.appwriteFileId;
    } else if (attachment.appwriteUrl) {
      // Extract fileId from URL
      const match = attachment.appwriteUrl.match(/files\/([^/]+)\//);
      if (match && match[1]) {
        fileId = match[1];
      }
    }

    if (!fileId) {
      emailLogger.error(`No valid source for attachment: ${attachment.name}`);
      throw new Error(
        `No valid attachment source for ${attachment.name}. Please re-upload the file.`,
      );
    }

    // Check cache first
    if (attachmentCache.has(fileId)) {
      emailLogger.debug(`Using cached attachment: ${attachment.name}`);
      resolvedAttachments.push({
        ...attachment,
        data: attachmentCache.get(fileId)!,
      });
      continue;
    }

    // Download from Appwrite and cache
    emailLogger.debug(
      `Downloading attachment from Appwrite: ${attachment.name}`,
      { fileId },
    );
    try {
      const buffer = await serverStorageService.getFileBuffer(fileId);
      const base64Data = buffer.toString("base64");

      // Cache it for subsequent emails
      attachmentCache.set(fileId, base64Data);

      resolvedAttachments.push({
        ...attachment,
        data: base64Data,
      });
      emailLogger.debug(`Cached attachment: ${attachment.name}`);
    } catch (error) {
      emailLogger.error(
        `Failed to download attachment ${attachment.name}`,
        undefined,
        error instanceof Error ? error : undefined,
      );
      throw new Error(
        `Failed to download attachment ${attachment.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  return resolvedAttachments;
}

/**
 * Clear the attachment cache. Call this after a campaign completes.
 */
export function clearAttachmentCache(): void {
  attachmentCache.clear();
  cachedEmailTemplate = null;
}

/**
 * Pre-build the email template ONCE before bulk sending.
 * This builds the entire MIME body (with attachments) once, so each send only needs to swap the To header.
 * This dramatically speeds up bulk sends with large attachments.
 */
export async function preBuildEmailTemplate(
  accessToken: string,
  subject: string,
  htmlBody: string,
  attachments?: AttachmentData[],
): Promise<void> {
  emailLogger.info("Pre-building email template for bulk send");

  // Get user profile
  const userResponse = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!userResponse.ok) {
    throw new Error("Failed to get user profile from Gmail API");
  }

  const userProfile = await userResponse.json();
  const fromEmail = userProfile.emailAddress;

  // Build the MIME body parts (everything that stays constant)
  const sanitizedHtmlBody = sanitizeEmailHTML(htmlBody);
  const zeroMarginCss =
    '<style type="text/css">html,body{margin:0!important;padding:0!important;width:100%!important;}table{border-collapse:collapse!important;border-spacing:0!important;}p{margin:0!important;padding:0!important;}*{margin:0!important;padding:0!important;}</style>';

  const formattedHtmlBody = [
    "<!doctype html>",
    "<html>",
    "<head>",
    zeroMarginCss,
    "</head>",
    '<body style="margin:0;padding:0;width:100%!important;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;padding:0;border:0;border-collapse:collapse;border-spacing:0;mso-table-lspace:0pt;mso-table-rspace:0pt;width:100%!important;">',
    '<tr><td style="margin:0;padding:0;border:0;">',
    sanitizedHtmlBody,
    "</td></tr>",
    "</table>",
    "</body>",
    "</html>",
  ].join("");

  const mixedBoundary = "----=_Part_" + Math.random().toString(36).substr(2, 9);
  const altBoundary = "----=_Alt_" + Math.random().toString(36).substr(2, 9);

  // Create plain text version
  const plainText = formattedHtmlBody
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const encodedPlainText = encodeQuotedPrintable(plainText);
  const encodedHtmlBody = encodeQuotedPrintable(formattedHtmlBody);

  const encodedSubject = encodeSubject(subject);

  let bodyParts: string[];

  if (attachments && attachments.length > 0) {
    bodyParts = [
      `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
      "",
      `--${mixedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      "",
      `--${altBoundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: quoted-printable`,
      "",
      encodedPlainText,
      "",
      `--${altBoundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: quoted-printable`,
      "",
      encodedHtmlBody,
      "",
      `--${altBoundary}--`,
    ];

    for (const attachment of attachments) {
      const encodedFilename = `=?UTF-8?B?${Buffer.from(attachment.name, "utf8").toString("base64")}?=`;

      if (
        !attachment.data ||
        attachment.data === "appwrite" ||
        attachment.data.startsWith("http")
      ) {
        throw new Error(
          `Attachment ${attachment.name} was not pre-resolved. Call preResolveAttachments() first.`,
        );
      }

      bodyParts.push(`--${mixedBoundary}`);
      bodyParts.push(
        `Content-Type: ${attachment.type}; name="${encodedFilename}"`,
      );
      bodyParts.push(
        `Content-Disposition: attachment; filename="${encodedFilename}"`,
      );
      bodyParts.push(`Content-Transfer-Encoding: base64`);
      bodyParts.push("");
      bodyParts.push(attachment.data);
    }

    bodyParts.push(`--${mixedBoundary}--`);
  } else {
    bodyParts = [
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      "",
      `--${altBoundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: quoted-printable`,
      "",
      encodedPlainText,
      "",
      `--${altBoundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: quoted-printable`,
      "",
      encodedHtmlBody,
      "",
      `--${altBoundary}--`,
    ];
  }

  const bodyString = bodyParts.join("\r\n");

  cachedEmailTemplate = {
    fromEmail,
    subject: encodedSubject,
    bodyParts: bodyString,
    totalSize: bodyString.length,
  };

  emailLogger.info(`Email template pre-built`, {
    sizeMB: (cachedEmailTemplate.totalSize / 1024 / 1024).toFixed(2),
  });
}

/**
 * Send email using pre-built template (FAST - only swaps To header)
 * Call preBuildEmailTemplate() once before using this for bulk sends.
 */
export async function sendEmailWithTemplate(
  accessToken: string,
  to: string,
): Promise<any> {
  if (!cachedEmailTemplate) {
    throw new Error(
      "No email template cached. Call preBuildEmailTemplate() first.",
    );
  }

  const validatedTo = validateAndSanitizeEmail(to);

  // Build complete email with just header changes
  const email = [
    `From: ${cachedEmailTemplate.fromEmail}`,
    `To: ${validatedTo}`,
    `Subject: ${cachedEmailTemplate.subject}`,
    `MIME-Version: 1.0`,
    cachedEmailTemplate.bodyParts,
  ].join("\r\n");

  // Encode for Gmail API
  const encodedEmail = Buffer.from(email, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Calculate timeout based on size
  const totalSize = cachedEmailTemplate.totalSize;
  const BASE_TIMEOUT = 60000;
  const TIMEOUT_PER_5MB = 60000;
  const MAX_TIMEOUT = 600000;
  const SEND_TIMEOUT = Math.min(
    BASE_TIMEOUT + Math.ceil(totalSize / (5 * 1024 * 1024)) * TIMEOUT_PER_5MB,
    MAX_TIMEOUT,
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SEND_TIMEOUT);

  try {
    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: encodedEmail }),
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gmail API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    emailLogger.info(`Email sent`, { to: validatedTo, messageId: result.id });
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Timeout after ${SEND_TIMEOUT / 1000}s. Email may have been sent - check Gmail Sent folder.`,
      );
    }
    throw error;
  }
}

function sanitizeText(text: string): string {
  // Normalize Unicode characters and ensure proper UTF-8 encoding
  return text
    .normalize("NFC")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
}

// RFC 2045 quoted-printable encoder to keep long HTML lines intact for email clients
export function encodeQuotedPrintable(input: string): string {
  if (!input) return "";

  const safeChar = (byte: number): boolean => {
    return (
      (byte >= 33 && byte <= 60) || // printable ASCII before '='
      (byte >= 62 && byte <= 126)
    );
  };

  const toHex = (byte: number): string => {
    return "=" + byte.toString(16).toUpperCase().padStart(2, "0");
  };

  const encodeLine = (line: string): string => {
    const bytes = Buffer.from(line, "utf8");
    let encoded = "";
    let currentLength = 0;

    const lastNonWhitespaceIndex = (() => {
      for (let j = bytes.length - 1; j >= 0; j--) {
        if (bytes[j] !== 0x20 && bytes[j] !== 0x09) {
          return j;
        }
      }
      return -1;
    })();

    const pushChunk = (chunk: string) => {
      if (currentLength + chunk.length > 75) {
        encoded += "=\r\n";
        currentLength = 0;
      }

      encoded += chunk;
      currentLength += chunk.length;
    };

    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      const isSpaceOrTab = byte === 0x20 || byte === 0x09;
      const isTrailingWhitespace = i > lastNonWhitespaceIndex;

      if (!isSpaceOrTab && safeChar(byte) && byte !== 0x3d) {
        pushChunk(String.fromCharCode(byte));
        continue;
      }

      if (isSpaceOrTab && !isTrailingWhitespace) {
        pushChunk(String.fromCharCode(byte));
        continue;
      }

      pushChunk(toHex(byte));
    }

    return encoded;
  };

  return input.replace(/\r\n/g, "\n").split("\n").map(encodeLine).join("\r\n");
}

// Helper function to validate and sanitize email addresses
function validateAndSanitizeEmail(email: string): string {
  if (!email || typeof email !== "string") {
    throw new Error("Email address is required and must be a string");
  }

  // Remove any whitespace and normalize
  const cleanEmail = email.trim().toLowerCase();

  // Basic email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(cleanEmail)) {
    throw new Error(`Invalid email address format: ${cleanEmail}`);
  }

  // Additional Gmail-specific validation
  if (cleanEmail.length > 254) {
    throw new Error(`Email address too long: ${cleanEmail}`);
  }

  return cleanEmail;
}

// Helper function to encode subject line for proper UTF-8 handling
function encodeSubject(subject: string): string {
  // Always encode for consistent UTF-8 handling, even for ASCII characters
  const sanitized = sanitizeText(subject);
  const encoded = Buffer.from(sanitized, "utf8").toString("base64");
  return `=?UTF-8?B?${encoded}?=`;
}

// Helper function to download attachment from URL and convert to base64
async function _downloadAttachmentToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download attachment: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString("base64");
  } catch (error) {
    emailLogger.error(
      "Error downloading attachment",
      { url },
      error instanceof Error ? error : undefined,
    );
    throw new Error(`Failed to download attachment from ${url}`);
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
  const validatedTo = validateAndSanitizeEmail(to);

  // Check total attachment size - Gmail has a 25MB limit
  const GMAIL_ATTACHMENT_LIMIT = 25 * 1024 * 1024; // 25MB
  let totalAttachmentBytes = 0;
  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      if (att.data && att.data !== "appwrite") {
        // base64 decodes to ~75% of its string length
        totalAttachmentBytes += Math.ceil(att.data.length * 0.75);
      }
    }

    if (totalAttachmentBytes > GMAIL_ATTACHMENT_LIMIT) {
      const sizeMB = (totalAttachmentBytes / 1024 / 1024).toFixed(2);
      throw new Error(
        `Total attachment size (${sizeMB}MB) exceeds Gmail's 25MB limit. Please use smaller attachments or share files via Google Drive.`,
      );
    }
  }

  emailLogger.debug("Sending email", {
    to: validatedTo,
    subject,
    subjectLength: subject.length,
    hasSpecialChars: /[^\x00-\x7F]/.test(subject),
    bodyLength: htmlBody.length,
    attachmentCount: attachments ? attachments.length : 0,
  });

  // Timeout configuration - scale based on attachment size
  // Base timeout + extra time for large attachments
  const totalAttachmentSize =
    attachments?.reduce((sum, a) => {
      // Estimate size from base64 (base64 is ~1.37x the original size)
      const estimatedSize = a.data ? a.data.length * 0.75 : 0;
      return sum + estimatedSize;
    }, 0) || 0;

  // For sending: 60s base + 60s per 5MB of attachments, max 10 minutes
  // Gmail can be very slow to respond for large attachments even after successful upload
  const BASE_TIMEOUT = 60000; // 1 minute base
  const TIMEOUT_PER_5MB = 60000; // 1 minute per 5MB
  const MAX_TIMEOUT = 600000; // 10 minutes max
  const calculatedTimeout =
    BASE_TIMEOUT +
    Math.ceil(totalAttachmentSize / (5 * 1024 * 1024)) * TIMEOUT_PER_5MB;
  const SEND_TIMEOUT = Math.min(calculatedTimeout, MAX_TIMEOUT);
  const PROFILE_TIMEOUT = 15000; // 15s for profile fetch

  emailLogger.debug(`Send timeout set`, {
    timeoutSec: SEND_TIMEOUT / 1000,
    attachmentSizeMB: (totalAttachmentSize / 1024 / 1024).toFixed(2),
  });

  // Helper function to create a request with timeout
  const fetchWithTimeout = async (
    url: string,
    options: RequestInit,
    customTimeout: number,
    isSendRequest: boolean = false,
  ) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), customTimeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        if (isSendRequest && totalAttachmentSize > 5 * 1024 * 1024) {
          // For large attachments, Gmail may have processed it even if we timeout
          throw new Error(
            `Request timeout after ${customTimeout / 1000}s. WARNING: The email may have been sent - please check your Gmail Sent folder before retrying.`,
          );
        }
        throw new Error(
          `Request timeout after ${customTimeout / 1000}s. Try reducing attachment size.`,
        );
      }
      throw error;
    }
  };

  // First, get the user's email address to use as 'From'
  const userResponse = await fetchWithTimeout(
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    PROFILE_TIMEOUT,
    false,
  );

  if (!userResponse.ok) {
    throw new Error("Failed to get user profile from Gmail API");
  }

  const userProfile = await userResponse.json();
  const fromEmail = userProfile.emailAddress;

  // Properly encode the subject line to handle UTF-8 characters
  const encodedSubject = encodeSubject(subject);

  // Sanitize and preserve authoring-time formatting
  const sanitizedHtmlBody = sanitizeEmailHTML(htmlBody);
  const zeroMarginCss =
    '<style type="text/css">html,body{margin:0!important;padding:0!important;width:100%!important;}table{border-collapse:collapse!important;border-spacing:0!important;}p{margin:0!important;padding:0!important;}*{margin:0!important;padding:0!important;}</style>';

  const formattedHtmlBody = [
    "<!doctype html>",
    "<html>",
    "<head>",
    zeroMarginCss,
    "</head>",
    '<body style="margin:0;padding:0;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;padding:0;border:0;border-collapse:collapse;border-spacing:0;mso-table-lspace:0pt;mso-table-rspace:0pt;width:100%;">',
    '<tr><td style="margin:0;padding:0;border:0;">',
    sanitizedHtmlBody,
    "</td></tr>",
    "</table>",
    "</body>",
    "</html>",
  ].join("");

  // Build email in Gmail's native format
  // Gmail sends emails with multipart/alternative (text + html) wrapped in multipart/mixed if attachments
  const mixedBoundary = "----=_Part_" + Math.random().toString(36).substr(2, 9);
  const altBoundary = "----=_Alt_" + Math.random().toString(36).substr(2, 9);

  // Create plain text version by stripping HTML
  const plainText = formattedHtmlBody
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const encodedPlainText = encodeQuotedPrintable(plainText);
  const encodedHtmlBody = encodeQuotedPrintable(formattedHtmlBody);

  let email: string[];

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
      encodedPlainText,
      "",
      `--${altBoundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: quoted-printable`,
      "",
      encodedHtmlBody,
      "",
      `--${altBoundary}--`,
    ];

    emailLogger.debug(`Processing attachments`, {
      count: attachments.length,
      to: validatedTo,
    });

    for (const attachment of attachments) {
      const encodedFilename = `=?UTF-8?B?${Buffer.from(attachment.name, "utf8").toString("base64")}?=`;

      // Attachments should be pre-resolved with base64 data before calling sendEmailViaAPI
      // Use preResolveAttachments() once before the send loop for efficiency
      const attachmentData = attachment.data;

      if (
        !attachmentData ||
        attachmentData === "appwrite" ||
        attachmentData.startsWith("http")
      ) {
        emailLogger.error(
          `Attachment not pre-resolved: ${attachment.name}. Call preResolveAttachments() first.`,
        );
        throw new Error(
          `Attachment ${attachment.name} was not pre-resolved. Please ensure attachments are resolved before sending.`,
        );
      }

      emailLogger.debug(`Using attachment`, {
        name: attachment.name,
        type: attachment.type,
      });

      email.push(`--${mixedBoundary}`);
      email.push(`Content-Type: ${attachment.type}; name="${encodedFilename}"`);
      email.push(
        `Content-Disposition: attachment; filename="${encodedFilename}"`,
      );
      email.push(`Content-Transfer-Encoding: base64`);
      email.push("");
      email.push(attachmentData);
    }

    email.push(`--${mixedBoundary}--`);
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
      encodedPlainText,
      "",
      `--${altBoundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: quoted-printable`,
      "",
      encodedHtmlBody,
      "",
      `--${altBoundary}--`,
    ];
  }

  // Explicitly encode as UTF-8 to handle international characters properly
  const encodedEmail = Buffer.from(email.join("\r\n"), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  emailLogger.debug(`Sending email to Gmail API`, {
    timeoutSec: SEND_TIMEOUT / 1000,
  });

  const response = await fetchWithTimeout(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: encodedEmail,
      }),
    },
    SEND_TIMEOUT,
    true,
  ); // Use send timeout, mark as send request

  if (!response.ok) {
    const errorText = await response.text();
    let errorDetails = errorText;

    try {
      const errorJson = JSON.parse(errorText);
      errorDetails = errorJson.error?.message || errorText;

      // Provide specific error messages for common issues
      if (errorDetails.includes("Invalid To header")) {
        throw new Error(
          `Invalid email address: ${validatedTo}. Please check the email format.`,
        );
      } else if (errorDetails.includes("rateLimitExceeded")) {
        throw new Error(
          `Gmail rate limit exceeded. Please wait before sending more emails.`,
        );
      } else if (errorDetails.includes("quotaExceeded")) {
        throw new Error(`Gmail quota exceeded. Daily sending limit reached.`);
      }
    } catch (_parseError) {
      // If we can't parse the error, use the raw text
    }

    emailLogger.error(`Gmail API error for ${validatedTo}`, {
      status: response.status,
      statusText: response.statusText,
      error: errorDetails,
      originalTo: to,
    });
    throw new Error(`Gmail API error (${response.status}): ${errorDetails}`);
  }

  const result = await response.json();
  emailLogger.info(`Email sent successfully`, {
    to: validatedTo,
    messageId: result.id,
  });
  return result;
}

export function replacePlaceholders(
  template: string,
  data: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
}
