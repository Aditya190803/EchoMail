import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { databases, config, Query, ID } from "@/lib/appwrite-server";
import { authOptions } from "@/lib/auth";
import { apiLogger } from "@/lib/logger";
import type { ContactGroupDocument } from "@/types/appwrite";

// Extended type for fields not in base ContactGroupDocument
interface ExtendedContactGroupDocument extends ContactGroupDocument {
  color?: string;
  contact_ids?: string | string[];
}

// GET /api/appwrite/contact-groups - List groups for the authenticated user
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await databases.listDocuments(
      config.databaseId,
      config.contactGroupsCollectionId,
      [
        Query.equal("user_email", session.user.email),
        Query.orderDesc("$updatedAt"),
        Query.limit(100),
      ],
    );

    // Parse stringified JSON fields
    const documents = (
      response.documents as unknown as ExtendedContactGroupDocument[]
    ).map((doc) => ({
      $id: doc.$id,
      name: doc.name || "",
      description: doc.description,
      color: doc.color,
      contact_ids:
        typeof doc.contact_ids === "string"
          ? JSON.parse(doc.contact_ids)
          : doc.contact_ids || [],
      user_email: doc.user_email || "",
      created_at: doc.created_at || doc.$createdAt,
      updated_at: doc.updated_at || doc.$updatedAt,
    }));

    return NextResponse.json({ total: response.total, documents });
  } catch (error: unknown) {
    apiLogger.error(
      "Error fetching contact groups",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch contact groups",
      },
      { status: 500 },
    );
  }
}

// POST /api/appwrite/contact-groups - Create a new group
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, color, contact_ids } = body;
    const now = new Date().toISOString();

    const result = await databases.createDocument(
      config.databaseId,
      config.contactGroupsCollectionId,
      ID.unique(),
      {
        name,
        description,
        color,
        contact_ids: JSON.stringify(contact_ids || []),
        user_email: session.user.email,
        created_at: now,
      },
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    apiLogger.error(
      "Error creating contact group",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create contact group",
      },
      { status: 500 },
    );
  }
}

// PUT /api/appwrite/contact-groups - Update a group
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description, color, contact_ids } = body;

    if (!id) {
      return NextResponse.json({ error: "Group ID required" }, { status: 400 });
    }

    // Verify ownership
    const doc = (await databases.getDocument(
      config.databaseId,
      config.contactGroupsCollectionId,
      id,
    )) as ContactGroupDocument;

    if (doc.user_email !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updateData: Record<string, string | boolean | number | null> = {};
    if (name !== undefined) {
      updateData.name = name;
    }
    if (description !== undefined) {
      updateData.description = description;
    }
    if (color !== undefined) {
      updateData.color = color;
    }
    if (contact_ids !== undefined) {
      updateData.contact_ids = JSON.stringify(contact_ids);
    }

    const result = await databases.updateDocument(
      config.databaseId,
      config.contactGroupsCollectionId,
      id,
      updateData,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    apiLogger.error(
      "Error updating contact group",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update contact group",
      },
      { status: 500 },
    );
  }
}

// DELETE /api/appwrite/contact-groups - Delete a group
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("id");

    if (!groupId) {
      return NextResponse.json({ error: "Group ID required" }, { status: 400 });
    }

    // Verify ownership
    const doc = (await databases.getDocument(
      config.databaseId,
      config.contactGroupsCollectionId,
      groupId,
    )) as ContactGroupDocument;

    if (doc.user_email !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await databases.deleteDocument(
      config.databaseId,
      config.contactGroupsCollectionId,
      groupId,
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    apiLogger.error(
      "Error deleting contact group",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete contact group",
      },
      { status: 500 },
    );
  }
}
