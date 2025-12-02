import { NextRequest, NextResponse } from "next/server";
import { serverStorageService } from "@/lib/appwrite-server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiLogger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploadResults = [];

    for (const file of files) {
      try {
        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Appwrite Storage
        const result = await serverStorageService.uploadFile(
          buffer,
          file.name,
          file.type,
          session.user.email,
        );

        uploadResults.push({
          fileName: result.fileName,
          fileSize: result.fileSize,
          fileType: file.type,
          url: result.url,
          appwrite_file_id: result.fileId,
        });
      } catch (error) {
        apiLogger.error(
          `Error uploading ${file.name}`,
          error instanceof Error ? error : undefined,
        );
        uploadResults.push({
          fileName: file.name,
          error: `Failed to upload: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      uploads: uploadResults,
    });
  } catch (error) {
    apiLogger.error(
      "Upload API error",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
