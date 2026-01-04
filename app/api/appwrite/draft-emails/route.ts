import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { databases, config, Query, ID } from "@/lib/appwrite-server";
import { authOptions } from "@/lib/auth";
import { apiLogger } from "@/lib/logger";
import type { DraftDocument } from "@/types/appwrite";

// Extended type for draft email fields
interface DraftEmailDocument extends DraftDocument {
  saved_at?: string;
  status?: string;
  csv_data?: string | unknown[];
  sent_at?: string;
  error?: string;
}

// GET /api/appwrite/draft-emails - List draft emails for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      // Fetch single draft
      const doc = (await databases.getDocument(
        config.databaseId,
        config.draftEmailsCollectionId,
        id,
      )) as DraftEmailDocument;

      if (doc.user_email !== session.user.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      return NextResponse.json({
        $id: doc.$id,
        subject: doc.subject || "",
        content: doc.content || "",
        recipients:
          typeof doc.recipients === "string"
            ? JSON.parse(doc.recipients)
            : doc.recipients || [],
        saved_at: doc.saved_at,
        status: doc.status || "pending",
        user_email: doc.user_email || "",
        attachments: doc.attachments
          ? typeof doc.attachments === "string"
            ? JSON.parse(doc.attachments)
            : doc.attachments
          : [],
        csv_data: doc.csv_data
          ? typeof doc.csv_data === "string"
            ? JSON.parse(doc.csv_data)
            : doc.csv_data
          : [],
        created_at: doc.created_at || doc.$createdAt,
        sent_at: doc.sent_at,
        error: doc.error,
      });
    }

    const response = await databases.listDocuments(
      config.databaseId,
      config.draftEmailsCollectionId,
      [
        Query.equal("user_email", session.user.email),
        Query.orderDesc("saved_at"),
        Query.limit(100),
      ],
    );

    const documents = (
      response.documents as unknown as DraftEmailDocument[]
    ).map((doc) => ({
      $id: doc.$id,
      subject: doc.subject || "",
      content: doc.content || "",
      recipients:
        typeof doc.recipients === "string"
          ? (JSON.parse(doc.recipients) as unknown[])
          : [],
      saved_at: doc.saved_at,
      status: doc.status || "pending",
      user_email: doc.user_email || "",
      attachments: doc.attachments
        ? typeof doc.attachments === "string"
          ? (JSON.parse(doc.attachments) as unknown[])
          : (doc.attachments as unknown[])
        : [],
      csv_data: doc.csv_data
        ? typeof doc.csv_data === "string"
          ? (JSON.parse(doc.csv_data) as unknown[])
          : (doc.csv_data as unknown[])
        : [],
      created_at: doc.created_at || doc.$createdAt,
      sent_at: doc.sent_at,
      error: doc.error,
    }));

    return NextResponse.json({ total: response.total, documents });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch draft emails";
    apiLogger.error(
      "Error fetching draft emails",
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : undefined,
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST /api/appwrite/draft-emails - Create a draft email
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { subject, content, recipients, saved_at, attachments, csv_data } =
      body;

    const result = await databases.createDocument(
      config.databaseId,
      config.draftEmailsCollectionId,
      ID.unique(),
      {
        subject,
        content,
        recipients: JSON.stringify(recipients || []),
        saved_at,
        status: "pending",
        user_email: session.user.email,
        attachments: attachments ? JSON.stringify(attachments) : null,
        csv_data: csv_data ? JSON.stringify(csv_data) : null,
        created_at: new Date().toISOString(),
      },
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create draft email";
    apiLogger.error(
      "Error creating draft email",
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : undefined,
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// PUT /api/appwrite/draft-emails - Update draft email
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      status,
      error: errorMsg,
      subject,
      content,
      recipients,
      saved_at,
      attachments,
      csv_data,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Email ID required" }, { status: 400 });
    }

    // Verify ownership
    const doc = (await databases.getDocument(
      config.databaseId,
      config.draftEmailsCollectionId,
      id,
    )) as DraftEmailDocument;

    if (doc.user_email !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updateData: Record<string, string | null> = {};

    // Status updates
    if (status) {
      updateData.status = status;
      if (status === "sent") {
        updateData.sent_at = new Date().toISOString();
      }
    }
    if (errorMsg) {
      updateData.error = errorMsg;
    }

    // Full content updates (for editing draft emails)
    if (subject !== undefined) {
      updateData.subject = subject;
    }
    if (content !== undefined) {
      updateData.content = content;
    }
    if (recipients !== undefined) {
      updateData.recipients = JSON.stringify(recipients);
    }
    if (saved_at !== undefined) {
      updateData.saved_at = saved_at;
    }
    if (attachments !== undefined) {
      updateData.attachments = attachments ? JSON.stringify(attachments) : null;
    }
    if (csv_data !== undefined) {
      updateData.csv_data = csv_data ? JSON.stringify(csv_data) : null;
    }

    const result = await databases.updateDocument(
      config.databaseId,
      config.draftEmailsCollectionId,
      id,
      updateData,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update draft email";
    apiLogger.error(
      "Error updating draft email",
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : undefined,
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE /api/appwrite/draft-emails - Delete a draft email
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const emailId = searchParams.get("id");

    if (!emailId) {
      return NextResponse.json({ error: "Email ID required" }, { status: 400 });
    }

    // Verify ownership
    const doc = (await databases.getDocument(
      config.databaseId,
      config.draftEmailsCollectionId,
      emailId,
    )) as DraftEmailDocument;

    if (doc.user_email !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await databases.deleteDocument(
      config.databaseId,
      config.draftEmailsCollectionId,
      emailId,
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete draft email";
    apiLogger.error(
      "Error deleting draft email",
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : undefined,
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
