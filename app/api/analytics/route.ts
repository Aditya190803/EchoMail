import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getDailyStats, getRecentActivity, getEmailMetrics } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const days = Number.parseInt(searchParams.get("days") || "30")

    const [dailyStats, recentActivity, metrics] = await Promise.all([
      getDailyStats(session.user.email, days),
      getRecentActivity(session.user.email),
      getEmailMetrics(session.user.email),
    ])

    return NextResponse.json({
      dailyStats,
      recentActivity,
      metrics,
    })
  } catch (error) {
    console.error("Get analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
