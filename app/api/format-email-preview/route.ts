import { NextRequest, NextResponse } from 'next/server'
import { formatEmailHTML } from '@/lib/email-formatter'

// App Router configuration for faster processing
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { htmlContent } = await request.json()
    
    if (!htmlContent) {
      return NextResponse.json(
        { error: 'HTML content is required' },
        { status: 400 }
      )
    }

    // Debug: Log if content contains emoji images
    const hasEmojiImages = htmlContent.includes('<img') && (
      htmlContent.includes('emoji') || 
      htmlContent.includes('data-emoji') ||
      htmlContent.match(/<img[^>]*alt="[^"]*"/gi)
    )

    const formattedHTML = formatEmailHTML(htmlContent)
    
    return NextResponse.json({
      success: true,
      formattedHTML,
      originalLength: htmlContent.length,
      formattedLength: formattedHTML.length,
      debug: {
        hadEmojiImages: hasEmojiImages,
        originalSnippet: htmlContent.substring(0, 200),
        processedSnippet: formattedHTML.substring(formattedHTML.indexOf('<body>') + 6, formattedHTML.indexOf('<body>') + 206)
      }
    })
  } catch (error) {
    console.error('Email formatting error:', error)
    return NextResponse.json(
      { error: 'Failed to format email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
