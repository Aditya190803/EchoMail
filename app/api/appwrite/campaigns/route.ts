import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { databases, config, Query, ID } from "@/lib/appwrite-server"

// GET /api/appwrite/campaigns - List campaigns for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const response = await databases.listDocuments(
      config.databaseId,
      config.campaignsCollectionId,
      [
        Query.equal('user_email', session.user.email),
        Query.orderDesc('created_at'),
        Query.limit(1000),
      ]
    )

    // Parse stringified JSON fields
    const documents = response.documents.map(doc => ({
      $id: doc.$id,
      subject: (doc as any).subject || '',
      content: (doc as any).content || '',
      recipients: typeof (doc as any).recipients === 'string' 
        ? JSON.parse((doc as any).recipients) 
        : ((doc as any).recipients || []),
      sent: (doc as any).sent || 0,
      failed: (doc as any).failed || 0,
      status: (doc as any).status || 'completed',
      user_email: (doc as any).user_email || '',
      created_at: (doc as any).created_at || doc.$createdAt,
      campaign_type: (doc as any).campaign_type,
      attachments: (doc as any).attachments 
        ? (typeof (doc as any).attachments === 'string' 
          ? JSON.parse((doc as any).attachments) 
          : (doc as any).attachments) 
        : [],
      send_results: (doc as any).send_results 
        ? (typeof (doc as any).send_results === 'string' 
          ? JSON.parse((doc as any).send_results) 
          : (doc as any).send_results) 
        : [],
    }))

    return NextResponse.json({ total: response.total, documents })
  } catch (error: any) {
    console.error("Error fetching campaigns:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch campaigns" },
      { status: 500 }
    )
  }
}

// POST /api/appwrite/campaigns - Create a new campaign
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { subject, content, recipients, sent, failed, status, campaign_type, attachments, send_results } = body

    const result = await databases.createDocument(
      config.databaseId,
      config.campaignsCollectionId,
      ID.unique(),
      {
        subject,
        content,
        recipients: JSON.stringify(recipients || []),
        sent: sent || 0,
        failed: failed || 0,
        status: status || 'completed',
        user_email: session.user.email,
        campaign_type,
        attachments: attachments ? JSON.stringify(attachments) : null,
        send_results: send_results ? JSON.stringify(send_results) : null,
        created_at: new Date().toISOString(),
      }
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error creating campaign:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create campaign" },
      { status: 500 }
    )
  }
}
