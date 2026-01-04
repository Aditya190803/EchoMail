import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { databases, config, Query, ID } from "@/lib/appwrite-server";
import { authOptions } from "@/lib/auth";
import { apiLogger } from "@/lib/logger";
import type { CampaignDocument } from "@/types/appwrite";

// GET /api/appwrite/campaigns - List campaigns for the authenticated user
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await databases.listDocuments(
      config.databaseId,
      config.campaignsCollectionId,
      [
        Query.equal("user_email", session.user.email),
        Query.orderDesc("created_at"),
        Query.limit(1000),
      ],
    );

    // Parse stringified JSON fields
    const documents = (response.documents as unknown as CampaignDocument[]).map(
      (doc) => ({
        $id: doc.$id,
        subject: doc.subject || "",
        content: doc.content || "",
        recipients:
          typeof (doc as CampaignDocument & { recipients?: string | string[] })
            .recipients === "string"
            ? JSON.parse(
                (doc as CampaignDocument & { recipients?: string })
                  .recipients as string,
              )
            : (doc as CampaignDocument & { recipients?: string[] })
                .recipients || [],
        sent: (doc as CampaignDocument & { sent?: number }).sent || 0,
        failed: (doc as CampaignDocument & { failed?: number }).failed || 0,
        status: doc.status || "completed",
        user_email: doc.user_email || "",
        created_at: doc.created_at || doc.$createdAt,
        campaign_type: (doc as CampaignDocument & { campaign_type?: string })
          .campaign_type,
        attachments: (
          doc as CampaignDocument & { attachments?: string | unknown[] }
        ).attachments
          ? typeof (doc as CampaignDocument & { attachments?: string })
              .attachments === "string"
            ? JSON.parse(
                (doc as CampaignDocument & { attachments?: string })
                  .attachments as string,
              )
            : (doc as CampaignDocument & { attachments?: unknown[] })
                .attachments
          : [],
        send_results: (
          doc as CampaignDocument & { send_results?: string | unknown[] }
        ).send_results
          ? typeof (doc as CampaignDocument & { send_results?: string })
              .send_results === "string"
            ? JSON.parse(
                (doc as CampaignDocument & { send_results?: string })
                  .send_results as string,
              )
            : (doc as CampaignDocument & { send_results?: unknown[] })
                .send_results
          : [],
      }),
    );

    return NextResponse.json({ total: response.total, documents });
  } catch (error: unknown) {
    apiLogger.error(
      "Error fetching campaigns",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch campaigns",
      },
      { status: 500 },
    );
  }
}

// POST /api/appwrite/campaigns - Create a new campaign
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      subject,
      content,
      recipients,
      sent,
      failed,
      status,
      campaign_type,
      attachments,
      send_results,
    } = body;

    const result = await databases.createDocument(
      config.databaseId,
      config.campaignsCollectionId,
      id || ID.unique(),
      {
        subject,
        content,
        recipients: JSON.stringify(recipients || []),
        sent: sent || 0,
        failed: failed || 0,
        status: status || "completed",
        user_email: session.user.email,
        campaign_type,
        attachments: attachments ? JSON.stringify(attachments) : null,
        send_results: send_results ? JSON.stringify(send_results) : null,
        created_at: new Date().toISOString(),
      },
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    apiLogger.error(
      "Error creating campaign",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create campaign",
      },
      { status: 500 },
    );
  }
}
