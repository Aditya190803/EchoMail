import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getCampaignById, getCampaignRecipients } from "@/lib/database"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const campaign = await getCampaignById(params.id)
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    const recipients = await getCampaignRecipients(params.id)

    return NextResponse.json({ campaign, recipients })
  } catch (error) {
    console.error("Get campaign error:", error)
    return NextResponse.json({ error: "Failed to fetch campaign" }, { status: 500 })
  }
}
