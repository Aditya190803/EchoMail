import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { storage, config } from "@/lib/appwrite-server"

// GET /api/appwrite/attachments/[fileId] - Download/view an attachment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { fileId } = await params

    if (!fileId) {
      return NextResponse.json({ error: "File ID required" }, { status: 400 })
    }

    // Get file metadata first
    const fileInfo = await storage.getFile(
      config.attachmentsBucketId,
      fileId
    )

    // Get file content
    const fileBuffer = await storage.getFileDownload(
      config.attachmentsBucketId,
      fileId
    )

    // Convert ArrayBuffer to Buffer
    const buffer = Buffer.from(fileBuffer)

    // Determine content type
    const contentType = fileInfo.mimeType || 'application/octet-stream'
    
    // Check if it should be viewed inline or downloaded
    const { searchParams } = new URL(request.url)
    const download = searchParams.get('download') === 'true'
    
    const disposition = download 
      ? `attachment; filename="${fileInfo.name}"` 
      : `inline; filename="${fileInfo.name}"`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error: any) {
    console.error("Error fetching attachment:", error)
    
    if (error.code === 404 || error.type === 'storage_file_not_found') {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to fetch attachment" },
      { status: 500 }
    )
  }
}
