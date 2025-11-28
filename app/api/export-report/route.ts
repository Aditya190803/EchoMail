import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { databases, config, Query } from "@/lib/appwrite-server"

/**
 * Export campaign reports as CSV
 */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'
    const campaignId = searchParams.get('campaign')

    // Fetch campaigns
    let campaigns
    if (campaignId) {
      // Single campaign
      const doc = await databases.getDocument(
        config.databaseId,
        config.campaignsCollectionId,
        campaignId
      )
      campaigns = [doc]
    } else {
      // All campaigns
      const response = await databases.listDocuments(
        config.databaseId,
        config.campaignsCollectionId,
        [
          Query.equal('user_email', session.user.email),
          Query.orderDesc('created_at'),
          Query.limit(1000),
        ]
      )
      campaigns = response.documents
    }

    // Parse campaign data
    const parsedCampaigns = campaigns.map(doc => ({
      id: doc.$id,
      subject: (doc as any).subject || '',
      status: (doc as any).status || '',
      sent: (doc as any).sent || 0,
      failed: (doc as any).failed || 0,
      recipients: typeof (doc as any).recipients === 'string'
        ? JSON.parse((doc as any).recipients).length
        : ((doc as any).recipients?.length || 0),
      campaign_type: (doc as any).campaign_type || 'bulk',
      created_at: (doc as any).created_at || doc.$createdAt,
    }))

    if (format === 'json') {
      return NextResponse.json({ campaigns: parsedCampaigns })
    }

    // Generate CSV
    const csvHeaders = ['Campaign ID', 'Subject', 'Status', 'Recipients', 'Sent', 'Failed', 'Success Rate', 'Type', 'Date']
    const csvRows = parsedCampaigns.map(c => [
      c.id,
      `"${c.subject.replace(/"/g, '""')}"`,
      c.status,
      c.recipients,
      c.sent,
      c.failed,
      c.recipients > 0 ? `${((c.sent / c.recipients) * 100).toFixed(1)}%` : '0%',
      c.campaign_type,
      new Date(c.created_at).toISOString(),
    ])

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n')

    // Add summary at the end
    const totalSent = parsedCampaigns.reduce((sum, c) => sum + c.sent, 0)
    const totalFailed = parsedCampaigns.reduce((sum, c) => sum + c.failed, 0)
    const totalRecipients = parsedCampaigns.reduce((sum, c) => sum + c.recipients, 0)
    
    const summary = `\n\nSUMMARY\nTotal Campaigns,${parsedCampaigns.length}\nTotal Recipients,${totalRecipients}\nTotal Sent,${totalSent}\nTotal Failed,${totalFailed}\nOverall Success Rate,${totalRecipients > 0 ? ((totalSent / totalRecipients) * 100).toFixed(1) : 0}%\nExport Date,${new Date().toISOString()}`

    const fullCsv = csvContent + summary

    return new NextResponse(fullCsv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="echomail-report-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "Failed to export report" }, { status: 500 })
  }
}
