import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { databases, config, Query, ID } from "@/lib/appwrite-server"

// GET /api/appwrite/tracking-events - Get tracking events for a campaign
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaign_id')

    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID required" }, { status: 400 })
    }

    const response = await databases.listDocuments(
      config.databaseId,
      config.trackingEventsCollectionId,
      [
        Query.equal('campaign_id', campaignId),
        Query.orderDesc('created_at'),
        Query.limit(1000),
      ]
    )

    const documents = response.documents.map(doc => ({
      $id: doc.$id,
      campaign_id: (doc as any).campaign_id || '',
      email: (doc as any).email || '',
      event_type: (doc as any).event_type || 'open',
      link_url: (doc as any).link_url,
      user_agent: (doc as any).user_agent,
      ip_address: (doc as any).ip_address,
      user_email: (doc as any).user_email || '',
      created_at: (doc as any).created_at || doc.$createdAt,
    }))

    // Calculate stats
    const uniqueOpens = new Set(documents.filter(e => e.event_type === 'open').map(e => e.email))
    const uniqueClicks = new Set(documents.filter(e => e.event_type === 'click').map(e => e.email))
    
    const clicksByLink: Record<string, number> = {}
    documents.filter(e => e.event_type === 'click' && e.link_url).forEach(e => {
      clicksByLink[e.link_url!] = (clicksByLink[e.link_url!] || 0) + 1
    })

    return NextResponse.json({ 
      total: response.total, 
      documents,
      stats: {
        totalOpens: documents.filter(e => e.event_type === 'open').length,
        uniqueOpens: uniqueOpens.size,
        totalClicks: documents.filter(e => e.event_type === 'click').length,
        uniqueClicks: uniqueClicks.size,
        clicksByLink,
      }
    })
  } catch (error: any) {
    console.error("Error fetching tracking events:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch tracking events" },
      { status: 500 }
    )
  }
}

// POST /api/appwrite/tracking-events - Record a tracking event
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { campaign_id, email, event_type, link_url, user_agent, ip_address } = body

    const result = await databases.createDocument(
      config.databaseId,
      config.trackingEventsCollectionId,
      ID.unique(),
      {
        campaign_id,
        email,
        event_type,
        link_url,
        user_agent,
        ip_address,
        user_email: session.user.email,
        created_at: new Date().toISOString(),
      }
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error creating tracking event:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create tracking event" },
      { status: 500 }
    )
  }
}
