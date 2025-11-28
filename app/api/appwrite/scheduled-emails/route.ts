import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { databases, config, Query, ID } from "@/lib/appwrite-server"

// GET /api/appwrite/scheduled-emails - List scheduled emails for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const response = await databases.listDocuments(
      config.databaseId,
      config.scheduledEmailsCollectionId,
      [
        Query.equal('user_email', session.user.email),
        Query.orderDesc('scheduled_at'),
        Query.limit(100),
      ]
    )

    const documents = response.documents.map(doc => ({
      $id: doc.$id,
      subject: (doc as any).subject || '',
      content: (doc as any).content || '',
      recipients: typeof (doc as any).recipients === 'string' 
        ? JSON.parse((doc as any).recipients) 
        : ((doc as any).recipients || []),
      scheduled_at: (doc as any).scheduled_at,
      status: (doc as any).status || 'pending',
      user_email: (doc as any).user_email || '',
      attachments: (doc as any).attachments 
        ? (typeof (doc as any).attachments === 'string' 
          ? JSON.parse((doc as any).attachments) 
          : (doc as any).attachments) 
        : [],
      created_at: (doc as any).created_at || doc.$createdAt,
      sent_at: (doc as any).sent_at,
      error: (doc as any).error,
    }))

    return NextResponse.json({ total: response.total, documents })
  } catch (error: any) {
    console.error("Error fetching scheduled emails:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch scheduled emails" },
      { status: 500 }
    )
  }
}

// POST /api/appwrite/scheduled-emails - Create a scheduled email
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { subject, content, recipients, scheduled_at, attachments } = body

    const result = await databases.createDocument(
      config.databaseId,
      config.scheduledEmailsCollectionId,
      ID.unique(),
      {
        subject,
        content,
        recipients: JSON.stringify(recipients || []),
        scheduled_at,
        status: 'pending',
        user_email: session.user.email,
        attachments: attachments ? JSON.stringify(attachments) : null,
        created_at: new Date().toISOString(),
      }
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error creating scheduled email:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create scheduled email" },
      { status: 500 }
    )
  }
}

// PUT /api/appwrite/scheduled-emails - Update scheduled email
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id, status, error: errorMsg, subject, content, recipients, scheduled_at, attachments } = body

    if (!id) {
      return NextResponse.json({ error: "Email ID required" }, { status: 400 })
    }

    // Verify ownership
    const doc = await databases.getDocument(
      config.databaseId,
      config.scheduledEmailsCollectionId,
      id
    )

    if ((doc as any).user_email !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const updateData: any = {}
    
    // Status updates
    if (status) {
      updateData.status = status
      if (status === 'sent') {
        updateData.sent_at = new Date().toISOString()
      }
    }
    if (errorMsg) {
      updateData.error = errorMsg
    }
    
    // Full content updates (for editing scheduled emails)
    if (subject !== undefined) {
      updateData.subject = subject
    }
    if (content !== undefined) {
      updateData.content = content
    }
    if (recipients !== undefined) {
      updateData.recipients = JSON.stringify(recipients)
    }
    if (scheduled_at !== undefined) {
      updateData.scheduled_at = scheduled_at
    }
    if (attachments !== undefined) {
      updateData.attachments = attachments ? JSON.stringify(attachments) : null
    }

    const result = await databases.updateDocument(
      config.databaseId,
      config.scheduledEmailsCollectionId,
      id,
      updateData
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error updating scheduled email:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update scheduled email" },
      { status: 500 }
    )
  }
}

// DELETE /api/appwrite/scheduled-emails - Delete a scheduled email
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const emailId = searchParams.get('id')

    if (!emailId) {
      return NextResponse.json({ error: "Email ID required" }, { status: 400 })
    }

    // Verify ownership
    const doc = await databases.getDocument(
      config.databaseId,
      config.scheduledEmailsCollectionId,
      emailId
    )

    if ((doc as any).user_email !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await databases.deleteDocument(
      config.databaseId,
      config.scheduledEmailsCollectionId,
      emailId
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting scheduled email:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete scheduled email" },
      { status: 500 }
    )
  }
}
