import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { databases, config, Query, ID } from "@/lib/appwrite-server"

// GET /api/appwrite/unsubscribes - List unsubscribes for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const checkEmail = searchParams.get('check')

    // If checking a specific email
    if (checkEmail) {
      const response = await databases.listDocuments(
        config.databaseId,
        config.unsubscribesCollectionId,
        [
          Query.equal('user_email', session.user.email),
          Query.equal('email', checkEmail.toLowerCase()),
          Query.limit(1),
        ]
      )
      return NextResponse.json({ isUnsubscribed: response.documents.length > 0 })
    }

    // List all unsubscribes
    const response = await databases.listDocuments(
      config.databaseId,
      config.unsubscribesCollectionId,
      [
        Query.equal('user_email', session.user.email),
        Query.orderDesc('$createdAt'),
        Query.limit(1000),
      ]
    )

    const documents = response.documents.map(doc => ({
      $id: doc.$id,
      email: (doc as any).email || '',
      user_email: (doc as any).user_email || '',
      reason: (doc as any).reason,
      unsubscribed_at: (doc as any).unsubscribed_at || doc.$createdAt,
    }))

    return NextResponse.json({ total: response.total, documents })
  } catch (error: any) {
    console.error("Error fetching unsubscribes:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch unsubscribes" },
      { status: 500 }
    )
  }
}

// POST /api/appwrite/unsubscribes - Add an unsubscribe
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { email, reason } = body

    const result = await databases.createDocument(
      config.databaseId,
      config.unsubscribesCollectionId,
      ID.unique(),
      {
        email: email.toLowerCase(),
        reason,
        user_email: session.user.email,
        unsubscribed_at: new Date().toISOString(),
      }
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error creating unsubscribe:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create unsubscribe" },
      { status: 500 }
    )
  }
}

// POST /api/appwrite/unsubscribes/filter - Filter out unsubscribed emails
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { emails } = body

    if (!Array.isArray(emails)) {
      return NextResponse.json({ error: "Emails array required" }, { status: 400 })
    }

    const response = await databases.listDocuments(
      config.databaseId,
      config.unsubscribesCollectionId,
      [
        Query.equal('user_email', session.user.email),
        Query.limit(10000),
      ]
    )

    const unsubscribedSet = new Set(
      response.documents.map((u: any) => u.email.toLowerCase())
    )
    const filteredEmails = emails.filter(
      (email: string) => !unsubscribedSet.has(email.toLowerCase())
    )

    return NextResponse.json({ emails: filteredEmails })
  } catch (error: any) {
    console.error("Error filtering unsubscribes:", error)
    return NextResponse.json(
      { error: error.message || "Failed to filter unsubscribes" },
      { status: 500 }
    )
  }
}

// DELETE /api/appwrite/unsubscribes - Delete (resubscribe)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unsubscribeId = searchParams.get('id')

    if (!unsubscribeId) {
      return NextResponse.json({ error: "Unsubscribe ID required" }, { status: 400 })
    }

    // Verify ownership
    const doc = await databases.getDocument(
      config.databaseId,
      config.unsubscribesCollectionId,
      unsubscribeId
    )

    if ((doc as any).user_email !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await databases.deleteDocument(
      config.databaseId,
      config.unsubscribesCollectionId,
      unsubscribeId
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting unsubscribe:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete unsubscribe" },
      { status: 500 }
    )
  }
}
