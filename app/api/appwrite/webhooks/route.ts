import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { databases, config, Query, ID } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";

// GET /api/appwrite/webhooks - List webhooks for the authenticated user
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await databases.listDocuments(
      config.databaseId,
      config.webhooksCollectionId,
      [
        Query.equal("user_email", session.user.email),
        Query.orderDesc("$updatedAt"),
        Query.limit(50),
      ],
    );

    const documents = response.documents.map((doc) => ({
      $id: doc.$id,
      name: (doc as any).name || "",
      url: (doc as any).url || "",
      events:
        typeof (doc as any).events === "string"
          ? JSON.parse((doc as any).events)
          : (doc as any).events || [],
      is_active: (doc as any).is_active ?? true,
      secret: (doc as any).secret,
      user_email: (doc as any).user_email || "",
      created_at: (doc as any).created_at || doc.$createdAt,
      updated_at: (doc as any).updated_at || doc.$updatedAt,
      last_triggered_at: (doc as any).last_triggered_at,
    }));

    return NextResponse.json({ total: response.total, documents });
  } catch (error: any) {
    apiLogger.error(
      "Error fetching webhooks",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: error.message || "Failed to fetch webhooks" },
      { status: 500 },
    );
  }
}

// POST /api/appwrite/webhooks - Create a new webhook
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, url, events, is_active, secret } = body;
    const now = new Date().toISOString();

    const result = await databases.createDocument(
      config.databaseId,
      config.webhooksCollectionId,
      ID.unique(),
      {
        name,
        url,
        events: JSON.stringify(events || []),
        is_active: is_active ?? true,
        secret,
        user_email: session.user.email,
        created_at: now,
      },
    );

    return NextResponse.json(result);
  } catch (error: any) {
    apiLogger.error(
      "Error creating webhook",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: error.message || "Failed to create webhook" },
      { status: 500 },
    );
  }
}

// PUT /api/appwrite/webhooks - Update a webhook
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, url, events, is_active, secret, updateLastTriggered } =
      body;

    if (!id) {
      return NextResponse.json(
        { error: "Webhook ID required" },
        { status: 400 },
      );
    }

    // Verify ownership
    const doc = await databases.getDocument(
      config.databaseId,
      config.webhooksCollectionId,
      id,
    );

    if ((doc as any).user_email !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url;
    if (events !== undefined) updateData.events = JSON.stringify(events);
    if (is_active !== undefined) updateData.is_active = is_active;
    if (secret !== undefined) updateData.secret = secret;
    if (updateLastTriggered)
      updateData.last_triggered_at = new Date().toISOString();

    const result = await databases.updateDocument(
      config.databaseId,
      config.webhooksCollectionId,
      id,
      updateData,
    );

    return NextResponse.json(result);
  } catch (error: any) {
    apiLogger.error(
      "Error updating webhook",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: error.message || "Failed to update webhook" },
      { status: 500 },
    );
  }
}

// DELETE /api/appwrite/webhooks - Delete a webhook
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get("id");

    if (!webhookId) {
      return NextResponse.json(
        { error: "Webhook ID required" },
        { status: 400 },
      );
    }

    // Verify ownership
    const doc = await databases.getDocument(
      config.databaseId,
      config.webhooksCollectionId,
      webhookId,
    );

    if ((doc as any).user_email !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await databases.deleteDocument(
      config.databaseId,
      config.webhooksCollectionId,
      webhookId,
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    apiLogger.error(
      "Error deleting webhook",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: error.message || "Failed to delete webhook" },
      { status: 500 },
    );
  }
}
