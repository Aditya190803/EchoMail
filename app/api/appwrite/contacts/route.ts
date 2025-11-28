import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { databases, config, Query, ID } from "@/lib/appwrite-server"

// GET /api/appwrite/contacts - List contacts for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const response = await databases.listDocuments(
      config.databaseId,
      config.contactsCollectionId,
      [
        Query.equal('user_email', session.user.email),
        Query.orderDesc('created_at'),
        Query.limit(1000),
      ]
    )

    return NextResponse.json({ total: response.total, documents: response.documents })
  } catch (error: any) {
    console.error("Error fetching contacts:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch contacts" },
      { status: 500 }
    )
  }
}

// POST /api/appwrite/contacts - Create a new contact
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { email, name, company, phone } = body

    const result = await databases.createDocument(
      config.databaseId,
      config.contactsCollectionId,
      ID.unique(),
      {
        email,
        name,
        company,
        phone,
        user_email: session.user.email,
        created_at: new Date().toISOString(),
      }
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error creating contact:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create contact" },
      { status: 500 }
    )
  }
}

// DELETE /api/appwrite/contacts - Delete a contact
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')

    if (!documentId) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 })
    }

    // Verify the contact belongs to the user before deleting
    const doc = await databases.getDocument(
      config.databaseId,
      config.contactsCollectionId,
      documentId
    )

    if ((doc as any).user_email !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await databases.deleteDocument(
      config.databaseId,
      config.contactsCollectionId,
      documentId
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting contact:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete contact" },
      { status: 500 }
    )
  }
}
