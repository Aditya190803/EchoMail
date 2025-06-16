import { NextRequest, NextResponse } from 'next/server'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    const uploadResults = []
    
    for (const file of files) {
      try {
        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        // Upload to Cloudinary
        const result = await uploadToCloudinary(
          buffer,
          file.name,
          session.user.email
        )
        
        uploadResults.push({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          url: result.url,
          public_id: result.public_id
        })
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error)
        uploadResults.push({
          fileName: file.name,
          error: `Failed to upload: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      uploads: uploadResults 
    })
  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
