import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { databases, config, Query, ID } from "@/lib/appwrite-server"

// GET /api/appwrite/signatures - List signatures for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const defaultOnly = searchParams.get('default') === 'true'

    const queries = [
      Query.equal('user_email', session.user.email),
      Query.orderDesc('$updatedAt'),
    ]

    if (defaultOnly) {
      queries.push(Query.equal('is_default', true))
      queries.push(Query.limit(1))
    } else {
      queries.push(Query.limit(20))
    }

    const response = await databases.listDocuments(
      config.databaseId,
      config.signaturesCollectionId,
      queries
    )

    const documents = response.documents.map(doc => ({
      $id: doc.$id,
      name: (doc as any).name || '',
      content: (doc as any).content || '',
      is_default: (doc as any).is_default || false,
      user_email: (doc as any).user_email || '',
      created_at: (doc as any).created_at || doc.$createdAt,
      updated_at: (doc as any).updated_at || doc.$updatedAt,
    }))

    return NextResponse.json({ total: response.total, documents })
  } catch (error: any) {
    console.error("Error fetching signatures:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch signatures" },
      { status: 500 }
    )
  }
}

// POST /api/appwrite/signatures - Create a new signature
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, content, is_default } = body
    const now = new Date().toISOString()

    // If this signature is set as default, unset other defaults first
    if (is_default) {
      const existingDefaults = await databases.listDocuments(
        config.databaseId,
        config.signaturesCollectionId,
        [
          Query.equal('user_email', session.user.email),
          Query.equal('is_default', true),
        ]
      )

      for (const sig of existingDefaults.documents) {
        await databases.updateDocument(
          config.databaseId,
          config.signaturesCollectionId,
          sig.$id,
          { is_default: false }
        )
      }
    }

    const result = await databases.createDocument(
      config.databaseId,
      config.signaturesCollectionId,
      ID.unique(),
      {
        name,
        content,
        is_default: is_default || false,
        user_email: session.user.email,
        created_at: now,
      }
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error creating signature:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create signature" },
      { status: 500 }
    )
  }
}

// PUT /api/appwrite/signatures - Update a signature
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id, name, content, is_default, setAsDefault } = body

    if (!id) {
      return NextResponse.json({ error: "Signature ID required" }, { status: 400 })
    }

    // Verify ownership
    const doc = await databases.getDocument(
      config.databaseId,
      config.signaturesCollectionId,
      id
    )

    if ((doc as any).user_email !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // If setting as default, unset other defaults first
    if (setAsDefault) {
      const existingDefaults = await databases.listDocuments(
        config.databaseId,
        config.signaturesCollectionId,
        [
          Query.equal('user_email', session.user.email),
          Query.equal('is_default', true),
        ]
      )

      for (const sig of existingDefaults.documents) {
        if (sig.$id !== id) {
          await databases.updateDocument(
            config.databaseId,
            config.signaturesCollectionId,
            sig.$id,
            { is_default: false }
          )
        }
      }
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (content !== undefined) updateData.content = content
    if (is_default !== undefined || setAsDefault) updateData.is_default = is_default ?? true

    const result = await databases.updateDocument(
      config.databaseId,
      config.signaturesCollectionId,
      id,
      updateData
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error updating signature:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update signature" },
      { status: 500 }
    )
  }
}

// DELETE /api/appwrite/signatures - Delete a signature
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const signatureId = searchParams.get('id')

    if (!signatureId) {
      return NextResponse.json({ error: "Signature ID required" }, { status: 400 })
    }

    // Verify ownership
    const doc = await databases.getDocument(
      config.databaseId,
      config.signaturesCollectionId,
      signatureId
    )

    if ((doc as any).user_email !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await databases.deleteDocument(
      config.databaseId,
      config.signaturesCollectionId,
      signatureId
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting signature:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete signature" },
      { status: 500 }
    )
  }
}
