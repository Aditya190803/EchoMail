import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendEmailViaAPI, replacePlaceholders } from "@/lib/gmail"

// App Router configuration for single email sending
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized - No access token" }, { status: 401 })
    }

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized - No user email" }, { status: 401 })
    }

    // Parse the minimal request
    const requestText = await request.text()
    const sizeKB = (requestText.length / 1024).toFixed(2)
    console.log(`📧 Single email request size: ${sizeKB} KB`)

    // Strict size limit for single emails
    if (requestText.length > 25000) { // ~25KB limit for single email
      return NextResponse.json({ 
        error: "Single email payload too large",
        sizeKB,
        maxSizeKB: "25"
      }, { status: 413 })
    }

    const data = JSON.parse(requestText)
    const { to, subject, message, originalRowData } = data

    if (!to || !subject || !message) {
      return NextResponse.json({ error: "Missing required fields: to, subject, message" }, { status: 400 })
    }

    try {
      // Personalize and send the single email
      const personalizedSubject = replacePlaceholders(subject, originalRowData || {})
      const personalizedMessage = replacePlaceholders(message, originalRowData || {})

      await sendEmailViaAPI(
        session.accessToken,
        to,
        personalizedSubject,
        personalizedMessage
        // No attachments for now to keep it simple
      )

      console.log(`✅ Successfully sent single email to ${to}`)
      
      return NextResponse.json({
        success: true,
        email: to,
        status: "sent",
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error)
      
      return NextResponse.json({
        success: false,
        email: to,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

  } catch (error) {
    console.error("Send single email API error:", error)
    return NextResponse.json({ 
      error: "Failed to process single email request",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
