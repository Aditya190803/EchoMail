import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { databases, config, Query, ID } from "@/lib/appwrite-server"

// GET /api/appwrite/draft-emails - List draft emails for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const response = await databases.listDocuments(
      config.databaseId,
      config.draftEmailsCollectionId,
      [
        Query.equal('user_email', session.user.email),
        Query.orderDesc('saved_at'),
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
      saved_at: (doc as any).saved_at,
      status: (doc as any).status || 'pending',
      user_email: (doc as any).user_email || '',
      attachments: (doc as any).attachments 
        ? (typeof (doc as any).attachments === 'string' 
          ? JSON.parse((doc as any).attachments) 
          : (doc as any).attachments) 
        : [],
      csv_data: (doc as any).csv_data 
        ? (typeof (doc as any).csv_data === 'string' 
          ? JSON.parse((doc as any).csv_data) 
          : (doc as any).csv_data) 
        : [],
      created_at: (doc as any).created_at || doc.$createdAt,
      sent_at: (doc as any).sent_at,
      error: (doc as any).error,
    }))

    return NextResponse.json({ total: response.total, documents })
  } catch (error: any) {
    console.error("Error fetching draft emails:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch draft emails" },
      { status: 500 }
    )
  }
}

// POST /api/appwrite/draft-emails - Create a draft email
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { subject, content, recipients, saved_at, attachments, csv_data } = body

    const result = await databases.createDocument(
      config.databaseId,
      config.draftEmailsCollectionId,
      ID.unique(),
      {
        subject,
        content,
        recipients: JSON.stringify(recipients || []),
        saved_at,
        status: 'pending',
        user_email: session.user.email,
        attachments: attachments ? JSON.stringify(attachments) : null,
        csv_data: csv_data ? JSON.stringify(csv_data) : null,
        created_at: new Date().toISOString(),
      }
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error creating draft email:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create draft email" },
      { status: 500 }
    )
  }
}

// PUT /api/appwrite/draft-emails - Update draft email
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id, status, error: errorMsg, subject, content, recipients, saved_at, attachments, csv_data } = body

    if (!id) {
      return NextResponse.json({ error: "Email ID required" }, { status: 400 })
    }

    // Verify ownership
    const doc = await databases.getDocument(
      config.databaseId,
      config.draftEmailsCollectionId,
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
    
    // Full content updates (for editing draft emails)
    if (subject !== undefined) {
      updateData.subject = subject
    }
    if (content !== undefined) {
      updateData.content = content
    }
    if (recipients !== undefined) {
      updateData.recipients = JSON.stringify(recipients)
    }
    if (saved_at !== undefined) {
      updateData.saved_at = saved_at
    }
    if (attachments !== undefined) {
      updateData.attachments = attachments ? JSON.stringify(attachments) : null
    }
    if (csv_data !== undefined) {
      updateData.csv_data = csv_data ? JSON.stringify(csv_data) : null
    }

    const result = await databases.updateDocument(
      config.databaseId,
      config.draftEmailsCollectionId,
      id,
      updateData
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error updating draft email:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update draft email" },
      { status: 500 }
    )
  }
}

// DELETE /api/appwrite/draft-emails - Delete a draft email
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
      config.draftEmailsCollectionId,
      emailId
    )

    if ((doc as any).user_email !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await databases.deleteDocument(
      config.databaseId,
      config.draftEmailsCollectionId,
      emailId
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting draft email:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete draft email" },
      { status: 500 }
    )
  }
}
