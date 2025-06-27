import { NextRequest, NextResponse } from 'next/server'

// App Router configuration for testing
export const dynamic = 'force-dynamic'
export const maxDuration = 10

export async function POST(request: NextRequest) {
  try {
    const requestText = await request.text()
    const sizeBytes = requestText.length
    const sizeKB = (sizeBytes / 1024).toFixed(2)
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(3)
    
    console.log(`Test endpoint received ${sizeKB} KB (${sizeMB} MB)`)
    
    let data
    try {
      data = JSON.parse(requestText)
    } catch (e) {
      return NextResponse.json({ 
        error: "Invalid JSON",
        sizeBytes,
        sizeKB: parseFloat(sizeKB),
        sizeMB: parseFloat(sizeMB)
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: true,
      message: "Payload received successfully",
      stats: {
        sizeBytes,
        sizeKB: parseFloat(sizeKB),
        sizeMB: parseFloat(sizeMB),
        dataKeys: Object.keys(data),
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({ 
      error: "Server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Test endpoint is working",
    timestamp: new Date().toISOString(),
    info: "Use POST to test payload sizes"
  })
}
