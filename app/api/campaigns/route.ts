import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getCampaigns, createCampaign, getEmailMetrics } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    const campaigns = await getCampaigns(session.user.email, limit, offset)
    const metrics = await getEmailMetrics(session.user.email)

    return NextResponse.json({ campaigns, metrics })
  } catch (error) {
    console.error("Get campaigns error:", error)
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { subject, content, recipients } = await request.json()

    const campaignId = await createCampaign(session.user.email, subject, content, recipients)

    return NextResponse.json({ campaignId })
  } catch (error) {
    console.error("Create campaign error:", error)
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 })
  }
}
