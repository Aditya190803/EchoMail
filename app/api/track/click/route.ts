import { type NextRequest, NextResponse } from "next/server"
import { databases, config, ID } from "@/lib/appwrite-server"

/**
 * Link click tracking endpoint
 * Records the click and redirects to the target URL
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('c')
    const email = searchParams.get('e')
    const userEmail = searchParams.get('u')
    const targetUrl = searchParams.get('url')

    if (!targetUrl) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Record the click event if we have the required parameters
    if (campaignId && email && userEmail) {
      try {
        await databases.createDocument(
          config.databaseId,
          config.trackingEventsCollectionId,
          ID.unique(),
          {
            campaign_id: campaignId,
            email: decodeURIComponent(email),
            event_type: 'click',
            link_url: decodeURIComponent(targetUrl),
            user_agent: request.headers.get('user-agent') || undefined,
            ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || undefined,
            user_email: decodeURIComponent(userEmail),
            created_at: new Date().toISOString(),
          }
        )
        console.log(`🔗 Link click tracked: ${email} clicked ${targetUrl} in campaign ${campaignId}`)
      } catch (error) {
        console.error("Error recording click event:", error)
        // Don't fail the redirect
      }
    }

    // Redirect to the target URL
    return NextResponse.redirect(decodeURIComponent(targetUrl))
  } catch (error) {
    console.error("Link tracking error:", error)
    // Redirect to home on error
    return NextResponse.redirect(new URL('/', request.url))
  }
}
