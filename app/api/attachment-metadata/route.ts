import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";

// Convert Google Drive links to direct download URLs
function convertGoogleDriveLink(url: string): string | null {
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    return `https://drive.google.com/uc?export=download&id=${fileMatch[1]}`;
  }

  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) {
    return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
  }

  const docMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) {
    return `https://docs.google.com/document/d/${docMatch[1]}/export?format=pdf`;
  }

  const sheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch) {
    return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/export?format=pdf`;
  }

  const slideMatch = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (slideMatch) {
    return `https://docs.google.com/presentation/d/${slideMatch[1]}/export/pdf`;
  }

  return null;
}

// Convert OneDrive/SharePoint links
function convertOneDriveLink(url: string): string | null {
  if (url.includes("1drv.ms")) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}download=1`;
  }

  if (url.includes("onedrive.live.com") || url.includes("sharepoint.com")) {
    let downloadUrl = url.replace("/embed", "/download");
    downloadUrl = downloadUrl.replace("action=view", "action=download");
    downloadUrl = downloadUrl.replace("action=embed", "action=download");

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

// Get direct download URL
function getDirectDownloadUrl(url: string): string {
  const trimmedUrl = url.trim();

  if (
    trimmedUrl.includes("drive.google.com") ||
    trimmedUrl.includes("docs.google.com")
  ) {
    const converted = convertGoogleDriveLink(trimmedUrl);
    if (converted) {
      return converted;
    }
  }

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

  if (trimmedUrl.includes("dropbox.com")) {
    return trimmedUrl
      .replace("dl=0", "dl=1")
      .replace("www.dropbox.com", "dl.dropboxusercontent.com");
  }

  return trimmedUrl;
}

// Extract filename from Content-Disposition header
function extractFileName(
  url: string,
  contentDisposition?: string | null,
  contentType?: string,
): string {
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(
      /filename[*]?=(?:UTF-8'')?["']?([^"';\n]+)["']?/i,
    );
    if (filenameMatch) {
      return decodeURIComponent(filenameMatch[1]);
    }
  }

  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const lastPart = pathParts[pathParts.length - 1];

    if (lastPart && lastPart.includes(".")) {
      return decodeURIComponent(lastPart);
    }
  } catch {
    // Invalid URL
  }

  // Generate filename based on content type
  let extension = ".pdf";
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
    } else if (contentType.includes("gif")) {
      extension = ".gif";
    } else if (contentType.includes("zip")) {
      extension = ".zip";
    } else if (contentType.includes("pdf")) {
      extension = ".pdf";
    }
  }

  return `attachment${extension}`;
}

// Determine file type from URL/content type
function getFileType(
  url: string,
  contentType?: string,
): "pdf" | "image" | "document" | "spreadsheet" | "presentation" | "other" {
  const lowerUrl = url.toLowerCase();
  const lowerType = (contentType || "").toLowerCase();

  if (lowerType.includes("pdf") || lowerUrl.includes(".pdf")) {
    return "pdf";
  }
  if (
    lowerType.includes("image") ||
    lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)/)
  ) {
    return "image";
  }
  if (
    lowerType.includes("word") ||
    lowerUrl.match(/\.(doc|docx)/) ||
    lowerUrl.includes("/document/")
  ) {
    return "document";
  }
  if (
    lowerType.includes("excel") ||
    lowerType.includes("spreadsheet") ||
    lowerUrl.match(/\.(xls|xlsx)/) ||
    lowerUrl.includes("/spreadsheets/")
  ) {
    return "spreadsheet";
  }
  if (
    lowerType.includes("powerpoint") ||
    lowerType.includes("presentation") ||
    lowerUrl.match(/\.(ppt|pptx)/) ||
    lowerUrl.includes("/presentation/")
  ) {
    return "presentation";
  }

  return "other";
}

// Detect source from URL
function getSource(
  url: string,
): "google-drive" | "onedrive" | "dropbox" | "direct" {
  const lowerUrl = url.toLowerCase();
  if (
    lowerUrl.includes("drive.google.com") ||
    lowerUrl.includes("docs.google.com")
  ) {
    return "google-drive";
  }
  if (
    lowerUrl.includes("1drv.ms") ||
    lowerUrl.includes("onedrive") ||
    lowerUrl.includes("sharepoint")
  ) {
    return "onedrive";
  }
  if (lowerUrl.includes("dropbox")) {
    return "dropbox";
  }
  return "direct";
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { url, recipientName } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const directUrl = getDirectDownloadUrl(url);
    const source = getSource(url);

    logger.debug(`Fetching attachment metadata`, {
      url: url.substring(0, 50),
      source,
    });

    // Use HEAD request first to get metadata without downloading the file
    let response: Response;
    try {
      response = await fetch(directUrl, {
        method: "HEAD",
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; EchoMail/1.0)",
        },
      });

      // If HEAD fails, try GET with range header
      if (!response.ok) {
        response = await fetch(directUrl, {
          method: "GET",
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; EchoMail/1.0)",
            Range: "bytes=0-0", // Only fetch first byte to get headers
          },
        });
      }
    } catch (fetchError) {
      logger.error(
        "Failed to fetch attachment metadata",
        fetchError instanceof Error ? fetchError : undefined,
      );
      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to access the file. Please check the URL is accessible.",
          metadata: {
            fileName: recipientName
              ? `${recipientName}_attachment.pdf`
              : "attachment.pdf",
            fileSize: null,
            fileType: "other" as const,
            source,
            accessible: false,
          },
        },
        { status: 200 },
      );
    }

    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const contentDisposition = response.headers.get("content-disposition");
    const contentLength = response.headers.get("content-length");

    const fileName = extractFileName(url, contentDisposition, contentType);
    const fileType = getFileType(url, contentType);
    const fileSize = contentLength ? parseInt(contentLength, 10) : null;

    // Personalize filename with recipient name if provided
    let personalizedFileName = fileName;
    if (recipientName) {
      const ext = fileName.substring(fileName.lastIndexOf("."));
      const baseName = fileName.substring(0, fileName.lastIndexOf("."));
      // Replace generic names with personalized ones
      if (
        baseName === "attachment" ||
        baseName === "document" ||
        baseName === "file"
      ) {
        personalizedFileName = `${recipientName.replace(/[^a-zA-Z0-9]/g, "_")}${ext}`;
      }
    }

    logger.debug(`Attachment metadata fetched`, {
      fileName: personalizedFileName,
      fileSize,
      fileType,
      source,
    });

    return NextResponse.json({
      success: true,
      metadata: {
        fileName: personalizedFileName,
        fileSize,
        fileType,
        contentType,
        source,
        accessible: response.ok,
        originalUrl: url,
      },
    });
  } catch (error) {
    logger.error(
      "Error in attachment-metadata API",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
