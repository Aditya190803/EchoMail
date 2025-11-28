import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { databases, config, Query, ID } from "@/lib/appwrite-server"

// GET /api/appwrite/ab-tests - List A/B tests for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const testId = searchParams.get('id')

    // Get single test by ID
    if (testId) {
      const doc = await databases.getDocument(
        config.databaseId,
        config.abTestsCollectionId,
        testId
      )

      if ((doc as any).user_email !== session.user.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }

      return NextResponse.json({
        $id: doc.$id,
        name: (doc as any).name || '',
        status: (doc as any).status || 'draft',
        test_type: (doc as any).test_type || 'subject',
        variant_a_subject: (doc as any).variant_a_subject,
        variant_a_content: (doc as any).variant_a_content,
        variant_b_subject: (doc as any).variant_b_subject,
        variant_b_content: (doc as any).variant_b_content,
        variant_a_recipients: typeof (doc as any).variant_a_recipients === 'string'
          ? JSON.parse((doc as any).variant_a_recipients)
          : ((doc as any).variant_a_recipients || []),
        variant_b_recipients: typeof (doc as any).variant_b_recipients === 'string'
          ? JSON.parse((doc as any).variant_b_recipients)
          : ((doc as any).variant_b_recipients || []),
        variant_a_sent: (doc as any).variant_a_sent || 0,
        variant_b_sent: (doc as any).variant_b_sent || 0,
        variant_a_opens: (doc as any).variant_a_opens || 0,
        variant_b_opens: (doc as any).variant_b_opens || 0,
        variant_a_clicks: (doc as any).variant_a_clicks || 0,
        variant_b_clicks: (doc as any).variant_b_clicks || 0,
        winner: (doc as any).winner,
        user_email: (doc as any).user_email || '',
        created_at: (doc as any).created_at || doc.$createdAt,
        completed_at: (doc as any).completed_at,
      })
    }

    // List all tests
    const response = await databases.listDocuments(
      config.databaseId,
      config.abTestsCollectionId,
      [
        Query.equal('user_email', session.user.email),
        Query.orderDesc('created_at'),
        Query.limit(100),
      ]
    )

    const documents = response.documents.map(doc => ({
      $id: doc.$id,
      name: (doc as any).name || '',
      status: (doc as any).status || 'draft',
      test_type: (doc as any).test_type || 'subject',
      variant_a_subject: (doc as any).variant_a_subject,
      variant_a_content: (doc as any).variant_a_content,
      variant_b_subject: (doc as any).variant_b_subject,
      variant_b_content: (doc as any).variant_b_content,
      variant_a_recipients: typeof (doc as any).variant_a_recipients === 'string'
        ? JSON.parse((doc as any).variant_a_recipients)
        : ((doc as any).variant_a_recipients || []),
      variant_b_recipients: typeof (doc as any).variant_b_recipients === 'string'
        ? JSON.parse((doc as any).variant_b_recipients)
        : ((doc as any).variant_b_recipients || []),
      variant_a_sent: (doc as any).variant_a_sent || 0,
      variant_b_sent: (doc as any).variant_b_sent || 0,
      variant_a_opens: (doc as any).variant_a_opens || 0,
      variant_b_opens: (doc as any).variant_b_opens || 0,
      variant_a_clicks: (doc as any).variant_a_clicks || 0,
      variant_b_clicks: (doc as any).variant_b_clicks || 0,
      winner: (doc as any).winner,
      user_email: (doc as any).user_email || '',
      created_at: (doc as any).created_at || doc.$createdAt,
      completed_at: (doc as any).completed_at,
    }))

    return NextResponse.json({ total: response.total, documents })
  } catch (error: any) {
    console.error("Error fetching A/B tests:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch A/B tests" },
      { status: 500 }
    )
  }
}

// POST /api/appwrite/ab-tests - Create a new A/B test
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { 
      name, status, test_type, 
      variant_a_subject, variant_a_content, 
      variant_b_subject, variant_b_content,
      variant_a_recipients, variant_b_recipients 
    } = body

    const result = await databases.createDocument(
      config.databaseId,
      config.abTestsCollectionId,
      ID.unique(),
      {
        name,
        status: status || 'draft',
        test_type: test_type || 'subject',
        variant_a_subject,
        variant_a_content,
        variant_b_subject,
        variant_b_content,
        variant_a_recipients: JSON.stringify(variant_a_recipients || []),
        variant_b_recipients: JSON.stringify(variant_b_recipients || []),
        variant_a_sent: 0,
        variant_b_sent: 0,
        variant_a_opens: 0,
        variant_b_opens: 0,
        variant_a_clicks: 0,
        variant_b_clicks: 0,
        user_email: session.user.email,
        created_at: new Date().toISOString(),
      }
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error creating A/B test:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create A/B test" },
      { status: 500 }
    )
  }
}

// PUT /api/appwrite/ab-tests - Update an A/B test
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id, complete, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: "Test ID required" }, { status: 400 })
    }

    // Verify ownership
    const doc = await databases.getDocument(
      config.databaseId,
      config.abTestsCollectionId,
      id
    )

    if ((doc as any).user_email !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // If completing the test, determine winner
    if (complete) {
      const aRate = (doc as any).variant_a_sent > 0 
        ? ((doc as any).variant_a_opens / (doc as any).variant_a_sent) 
        : 0
      const bRate = (doc as any).variant_b_sent > 0 
        ? ((doc as any).variant_b_opens / (doc as any).variant_b_sent) 
        : 0
      
      let winner: 'A' | 'B' | 'tie' = 'tie'
      if (Math.abs(aRate - bRate) > 0.05) {
        winner = aRate > bRate ? 'A' : 'B'
      }

      const result = await databases.updateDocument(
        config.databaseId,
        config.abTestsCollectionId,
        id,
        {
          status: 'completed',
          winner,
          completed_at: new Date().toISOString(),
        }
      )

      return NextResponse.json(result)
    }

    // Regular update
    const updateData: Record<string, any> = {}
    
    if (updates.variant_a_recipients) {
      updateData.variant_a_recipients = JSON.stringify(updates.variant_a_recipients)
    }
    if (updates.variant_b_recipients) {
      updateData.variant_b_recipients = JSON.stringify(updates.variant_b_recipients)
    }
    
    // Copy other simple fields
    const simpleFields = [
      'name', 'status', 'test_type', 
      'variant_a_subject', 'variant_a_content',
      'variant_b_subject', 'variant_b_content',
      'variant_a_sent', 'variant_b_sent',
      'variant_a_opens', 'variant_b_opens',
      'variant_a_clicks', 'variant_b_clicks',
      'winner'
    ]
    
    for (const field of simpleFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field]
      }
    }

    const result = await databases.updateDocument(
      config.databaseId,
      config.abTestsCollectionId,
      id,
      updateData
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error updating A/B test:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update A/B test" },
      { status: 500 }
    )
  }
}

// DELETE /api/appwrite/ab-tests - Delete an A/B test
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const testId = searchParams.get('id')

    if (!testId) {
      return NextResponse.json({ error: "Test ID required" }, { status: 400 })
    }

    // Verify ownership
    const doc = await databases.getDocument(
      config.databaseId,
      config.abTestsCollectionId,
      testId
    )

    if ((doc as any).user_email !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await databases.deleteDocument(
      config.databaseId,
      config.abTestsCollectionId,
      testId
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting A/B test:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete A/B test" },
      { status: 500 }
    )
  }
}
