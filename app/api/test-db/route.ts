import { NextResponse } from "next/server"
import { databases, config, Query } from "@/lib/appwrite-server"

export async function GET() {
  try {
    // Test if collections are accessible
    const campaigns = await databases.listDocuments(
      config.databaseId,
      config.campaignsCollectionId,
      [Query.limit(1)]
    )

    const contacts = await databases.listDocuments(
      config.databaseId,
      config.contactsCollectionId,
      [Query.limit(1)]
    )

    return NextResponse.json({ 
      success: true, 
      message: "Appwrite collections are accessible",
      campaignsCount: campaigns.total,
      contactsCount: contacts.total
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: "Appwrite connection failed",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function POST() {
  try {
    // Test connection only - don't insert test data
    const result = await databases.listDocuments(
      config.databaseId,
      config.campaignsCollectionId,
      [Query.limit(1)]
    )

    return NextResponse.json({ 
      success: true, 
      message: "Appwrite connection test passed",
      totalCampaigns: result.total
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: "Appwrite connection failed",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
