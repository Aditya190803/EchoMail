import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { databases, config, Query, ID } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";

// GET /api/appwrite/contacts - List contacts for the authenticated user
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await databases.listDocuments(
      config.databaseId,
      config.contactsCollectionId,
      [
        Query.equal("user_email", session.user.email),
        Query.orderDesc("created_at"),
        Query.limit(1000),
      ],
    );

    return NextResponse.json({
      total: response.total,
      documents: response.documents,
    });
  } catch (error: any) {
    apiLogger.error("Error fetching contacts", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch contacts" },
      { status: 500 },
    );
  }
}

// POST /api/appwrite/contacts - Create a new contact
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, name, company, phone, tags } = body;

    const result = await databases.createDocument(
      config.databaseId,
      config.contactsCollectionId,
      ID.unique(),
      {
        email,
        name,
        company,
        phone,
        tags: tags ? JSON.stringify(tags) : null,
        user_email: session.user.email,
        created_at: new Date().toISOString(),
      },
    );

    return NextResponse.json(result);
  } catch (error: any) {
    apiLogger.error("Error creating contact", error);
    return NextResponse.json(
      { error: error.message || "Failed to create contact" },
      { status: 500 },
    );
  }
}

// PUT /api/appwrite/contacts - Update a contact
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, email, name, company, phone, tags } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Contact ID required" },
        { status: 400 },
      );
    }

    // Verify the contact belongs to the user before updating
    const doc = await databases.getDocument(
      config.databaseId,
      config.contactsCollectionId,
      id,
    );

    if ((doc as any).user_email !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updateData: Record<string, any> = {};
    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (company !== undefined) updateData.company = company;
    if (phone !== undefined) updateData.phone = phone;
    if (tags !== undefined) updateData.tags = JSON.stringify(tags);

    const result = await databases.updateDocument(
      config.databaseId,
      config.contactsCollectionId,
      id,
      updateData,
    );

    return NextResponse.json(result);
  } catch (error: any) {
    apiLogger.error("Error updating contact", error);
    return NextResponse.json(
      { error: error.message || "Failed to update contact" },
      { status: 500 },
    );
  }
}

// DELETE /api/appwrite/contacts - Delete a contact
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("id");

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID required" },
        { status: 400 },
      );
    }

    // Verify the contact belongs to the user before deleting
    const doc = await databases.getDocument(
      config.databaseId,
      config.contactsCollectionId,
      documentId,
    );

    if ((doc as any).user_email !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await databases.deleteDocument(
      config.databaseId,
      config.contactsCollectionId,
      documentId,
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    apiLogger.error("Error deleting contact", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete contact" },
      { status: 500 },
    );
  }
}
