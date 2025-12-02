import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { databases, config, Query, ID } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";

// GET /api/appwrite/templates - List templates for the authenticated user
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await databases.listDocuments(
      config.databaseId,
      config.templatesCollectionId,
      [
        Query.equal("user_email", session.user.email),
        Query.orderDesc("$updatedAt"),
        Query.limit(100),
      ],
    );

    return NextResponse.json({
      total: response.total,
      documents: response.documents,
    });
  } catch (error: any) {
    apiLogger.error("Error fetching templates", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch templates" },
      { status: 500 },
    );
  }
}

// POST /api/appwrite/templates - Create a new template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, subject, content, category } = body;
    const now = new Date().toISOString();

    const result = await databases.createDocument(
      config.databaseId,
      config.templatesCollectionId,
      ID.unique(),
      {
        name,
        subject,
        content,
        category,
        version: 1, // Start at version 1
        user_email: session.user.email,
        created_at: now,
        updated_at: now,
      },
    );

    return NextResponse.json(result);
  } catch (error: any) {
    apiLogger.error("Error creating template", error);
    return NextResponse.json(
      { error: error.message || "Failed to create template" },
      { status: 500 },
    );
  }
}

// PUT /api/appwrite/templates - Update a template
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, subject, content, category, saveVersion, changeNote } =
      body;

    if (!id) {
      return NextResponse.json(
        { error: "Template ID required" },
        { status: 400 },
      );
    }

    // Verify ownership
    const doc = await databases.getDocument(
      config.databaseId,
      config.templatesCollectionId,
      id,
    );

    if ((doc as any).user_email !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const currentVersion = (doc as any).version || 1;

    // Save current state as a version if requested (or if major content change)
    if (saveVersion) {
      try {
        await databases.createDocument(
          config.databaseId,
          config.templateVersionsCollectionId,
          ID.unique(),
          {
            template_id: id,
            version: currentVersion,
            name: (doc as any).name,
            subject: (doc as any).subject,
            content: (doc as any).content,
            category: (doc as any).category,
            user_email: session.user.email,
            created_at: new Date().toISOString(),
            change_note: changeNote || null,
          },
        );
      } catch (versionError: any) {
        // If template_versions collection doesn't exist, just continue
        if (
          versionError.code !== 404 &&
          !versionError.message?.includes("Collection")
        ) {
          apiLogger.warn("Failed to save template version", {
            error: versionError.message,
          });
        }
      }
    }

    const result = await databases.updateDocument(
      config.databaseId,
      config.templatesCollectionId,
      id,
      {
        name,
        subject,
        content,
        category,
        version: saveVersion ? currentVersion + 1 : currentVersion,
        updated_at: new Date().toISOString(),
      },
    );

    return NextResponse.json(result);
  } catch (error: any) {
    apiLogger.error("Error updating template", error);
    return NextResponse.json(
      { error: error.message || "Failed to update template" },
      { status: 500 },
    );
  }
}

// DELETE /api/appwrite/templates - Delete a template
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("id");

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID required" },
        { status: 400 },
      );
    }

    // Verify ownership
    const doc = await databases.getDocument(
      config.databaseId,
      config.templatesCollectionId,
      templateId,
    );

    if ((doc as any).user_email !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await databases.deleteDocument(
      config.databaseId,
      config.templatesCollectionId,
      templateId,
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    apiLogger.error("Error deleting template", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete template" },
      { status: 500 },
    );
  }
}
