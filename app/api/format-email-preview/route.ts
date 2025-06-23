import { NextRequest, NextResponse } from 'next/server'
import { formatEmailHTML } from '@/lib/email-formatter'

export async function POST(request: NextRequest) {
  try {
    const { htmlContent } = await request.json()
    
    if (!htmlContent) {
      return NextResponse.json(
        { error: 'HTML content is required' },
        { status: 400 }
      )
    }

    const formattedHTML = formatEmailHTML(htmlContent)
    
    return NextResponse.json({
      success: true,
      formattedHTML,
      originalLength: htmlContent.length,
      formattedLength: formattedHTML.length
    })
  } catch (error) {
    console.error('Email formatting error:', error)
    return NextResponse.json(
      { error: 'Failed to format email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
