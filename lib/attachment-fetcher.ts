import { logger } from "./logger";

export interface FetchedAttachment {
  fileName: string;
  buffer: Buffer;
  base64: string;
  mimeType: string;
  originalUrl: string;
}

function convertGoogleDriveLink(url: string): string | null {
  // Format: /file/d/FILE_ID/
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    return `https://drive.google.com/uc?export=download&id=${fileMatch[1]}`;
  }

  // Format: ?id=FILE_ID
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) {
    return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
  }

  // Format: /document/d/FILE_ID/ (Google Docs - export as PDF by default, or docx if specified)
  // Note: Google Docs export links usually default to PDF if not specified
  const docMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) {
    // Default to PDF export for Google Docs if no format specified
    return `https://docs.google.com/document/d/${docMatch[1]}/export?format=pdf`;
  }

  // Format: /spreadsheets/d/FILE_ID/ (Google Sheets - export as PDF)
  const sheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch) {
    return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/export?format=pdf`;
  }

  // Format: /presentation/d/FILE_ID/ (Google Slides - export as PDF)
  const slideMatch = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (slideMatch) {
    return `https://docs.google.com/presentation/d/${slideMatch[1]}/export/pdf`;
  }

  return null;
}

/**
 * Convert OneDrive/SharePoint sharing link to direct download link
 * Supports:
 * - https://1drv.ms/...
 * - https://onedrive.live.com/...
 * - https://*.sharepoint.com/...
 */
function convertOneDriveLink(url: string): string | null {
  // For 1drv.ms short links, we need to follow the redirect
  // These will be handled by the fetch with redirect following
  if (url.includes("1drv.ms")) {
    // Add download=1 parameter to force download
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}download=1`;
  }

  // OneDrive embed links - convert to download
  if (url.includes("onedrive.live.com") || url.includes("sharepoint.com")) {
    // Replace 'embed' or 'view' with 'download'
    let downloadUrl = url.replace("/embed", "/download");
    downloadUrl = downloadUrl.replace("action=view", "action=download");
    downloadUrl = downloadUrl.replace("action=embed", "action=download");

    // Add download parameter if not present
    if (
      !downloadUrl.includes("download=1") &&
      !downloadUrl.includes("action=download")
    ) {
      const separator = downloadUrl.includes("?") ? "&" : "?";
      downloadUrl = `${downloadUrl}${separator}download=1`;
    }

    return downloadUrl;
  }

  return null;
}

/**
 * Detect URL type and convert to direct download URL
 */
function getDirectDownloadUrl(url: string): string {
  const trimmedUrl = url.trim();

  // Google Drive
  if (
    trimmedUrl.includes("drive.google.com") ||
    trimmedUrl.includes("docs.google.com")
  ) {
    const converted = convertGoogleDriveLink(trimmedUrl);
    if (converted) {
      return converted;
    }
  }

  // OneDrive / SharePoint
  if (
    trimmedUrl.includes("1drv.ms") ||
    trimmedUrl.includes("onedrive.live.com") ||
    trimmedUrl.includes("sharepoint.com")
  ) {
    const converted = convertOneDriveLink(trimmedUrl);
    if (converted) {
      return converted;
    }
  }

  // Dropbox - convert to direct download
  if (trimmedUrl.includes("dropbox.com")) {
    return trimmedUrl
      .replace("dl=0", "dl=1")
      .replace("www.dropbox.com", "dl.dropboxusercontent.com");
  }

  // Already a direct link
  return trimmedUrl;
}

/**
 * Extract filename from URL or Content-Disposition header
 */
function extractFileName(
  url: string,
  contentDisposition?: string | null,
  recipientName?: string,
  contentType?: string,
): string {
  // Try Content-Disposition header first
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(
      /filename[*]?=(?:UTF-8'')?["']?([^"';\n]+)["']?/i,
    );
    if (filenameMatch) {
      return decodeURIComponent(filenameMatch[1]);
    }
  }

  // Try to get filename from URL path
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const lastPart = pathParts[pathParts.length - 1];

    if (lastPart && lastPart.includes(".")) {
      return decodeURIComponent(lastPart);
    }
  } catch {
    // Invalid URL, continue to fallback
  }

  // Fallback: generate a filename based on content type or default to pdf
  const sanitizedName = recipientName
    ? recipientName.replace(/[^a-zA-Z0-9]/g, "_")
    : "attachment";

  // Guess extension from content type if possible
  let extension = ".pdf"; // Default to PDF as it's the most common use case

  if (contentType) {
    if (contentType.includes("word") || contentType.includes("docx")) {
      extension = ".docx";
    } else if (contentType.includes("doc")) {
      extension = ".doc";
    } else if (
      contentType.includes("powerpoint") ||
      contentType.includes("pptx")
    ) {
      extension = ".pptx";
    } else if (contentType.includes("ppt")) {
      extension = ".ppt";
    } else if (contentType.includes("excel") || contentType.includes("xlsx")) {
      extension = ".xlsx";
    } else if (contentType.includes("xls")) {
      extension = ".xls";
    } else if (contentType.includes("jpeg") || contentType.includes("jpg")) {
      extension = ".jpg";
    } else if (contentType.includes("png")) {
      extension = ".png";
    } else if (contentType.includes("zip")) {
      extension = ".zip";
    }
  }

  return `${sanitizedName}${extension}`;
}

/**
 * Fetch a file from a URL (Google Drive, OneDrive, or direct link)
 * Supports any file type
 */
async function fetchWithRetry(
  directUrl: string,
  maxRetries: number = 3,
  initialDelayMs: number = 1000,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(directUrl, {
        method: "GET",
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; EchoMail/1.0)",
        },
      });

      if (response.ok) {
        return response;
      }

      // For non-ok responses, throw to trigger retry
      throw new Error(
        `Failed to fetch file: ${response.status} ${response.statusText}`,
      );
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries - 1) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        logger.debug(
          `Fetch attempt ${attempt + 1} failed, retrying in ${delay}ms`,
          {
            error: lastError.message,
            attempt: attempt + 1,
            maxRetries,
          },
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Failed to fetch file after retries");
}

export async function fetchFileFromUrl(
  url: string,
  recipientName?: string,
  customFileName?: string,
): Promise<FetchedAttachment> {
  if (!url || typeof url !== "string") {
    throw new Error("Invalid URL provided");
  }

  const directUrl = getDirectDownloadUrl(url);

  logger.debug(`Fetching file`, { url, directUrl });

  const response = await fetchWithRetry(directUrl);

  const contentType =
    response.headers.get("content-type") || "application/octet-stream";
  const contentDisposition = response.headers.get("content-disposition");

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");

  // Determine filename
  const fileName =
    customFileName ||
    extractFileName(url, contentDisposition, recipientName, contentType);

  logger.debug(`Fetched file`, {
    fileName,
    sizeKB: (buffer.length / 1024).toFixed(1),
    contentType,
  });

  return {
    fileName,
    buffer,
    base64,
    mimeType: contentType,
    originalUrl: url,
  };
}

/**
 * Check if a URL is likely an attachment link
 */
export function isAttachmentUrl(url: string): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }

  const trimmed = url.trim().toLowerCase();

  // Common file extensions
  const extensions = [
    ".pdf",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
    ".xls",
    ".json",
    ".xlsx",
    ".zip",
    ".jpg",
    ".png",
    ".jpeg",
  ];
  if (extensions.some((ext) => trimmed.endsWith(ext))) {
    return true;
  }

  // Google Drive
  if (
    trimmed.includes("drive.google.com") ||
    trimmed.includes("docs.google.com")
  ) {
    return true;
  }

  // OneDrive
  if (
    trimmed.includes("1drv.ms") ||
    trimmed.includes("onedrive") ||
    trimmed.includes("sharepoint")
  ) {
    return true;
  }

  // Dropbox
  if (trimmed.includes("dropbox.com")) {
    return true;
  }

  // Check for common patterns
  if (
    trimmed.includes("pdf") ||
    trimmed.includes("certificate") ||
    trimmed.includes("document") ||
    trimmed.includes("attachment")
  ) {
    return true;
  }

  return false;
}

/**
 * Detect attachment URL column in CSV headers
 */
export function detectAttachmentColumn(headers: string[]): string | null {
  const keywords = [
    "pdf",
    "certificate",
    "attachment",
    "document",
    "file",
    "link",
    "url",
    "drive",
    "onedrive",
    "dropbox",
    "doc",
    "docx",
    "ppt",
    "pptx",
  ];

  for (const header of headers) {
    const lowerHeader = header.toLowerCase();

    // Exact matches first
    if (
      lowerHeader === "pdf" ||
      lowerHeader === "attachment" ||
      lowerHeader === "file" ||
      lowerHeader === "link"
    ) {
      return header;
    }

    // Partial matches
    for (const keyword of keywords) {
      if (lowerHeader.includes(keyword)) {
        return header;
      }
    }
  }

  return null;
}

/**
 * Validate that a URL is accessible (optional pre-check)
 */
export async function validateAttachmentUrl(
  url: string,
): Promise<{ valid: boolean; error?: string }> {
  try {
    const directUrl = getDirectDownloadUrl(url);

    const response = await fetch(directUrl, {
      method: "HEAD",
      redirect: "follow",
    });

    if (!response.ok) {
      return { valid: false, error: `HTTP ${response.status}` };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Export aliases for backward compatibility
export const fetchPdfFromUrl = fetchFileFromUrl;
export const isPdfUrl = isAttachmentUrl;
export const detectPdfColumn = detectAttachmentColumn;
export const validatePdfUrl = validateAttachmentUrl;
