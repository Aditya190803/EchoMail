"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Mail,
  Users,
  Send,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Activity,
  Target,
  Clock,
} from "lucide-react"
import Link from "next/link"
import { AuthButton } from "@/components/auth-button"
import { supabase } from "@/lib/supabase"

interface EmailCampaign {
  id: string
  subject: string
  recipients: number
  sent: number
  failed: number
  date: string
  status: "completed" | "sending" | "failed"
}

interface Analytics {
  totalCampaigns: number
  totalSent: number
  totalRecipients: number
  totalFailed: number
  successRate: number
  averageRecipientsPerCampaign: number
  campaignsThisMonth: number
  campaignsLastMonth: number
  recentCampaigns: EmailCampaign[]
  monthlyTrend: "up" | "down" | "same"
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("month")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  useEffect(() => {
    async function fetchAnalytics() {
      if (!session?.user?.email) return
      
      try {
        const { data: campaigns, error } = await supabase
          .from("email_campaigns")
          .select("*")
          .eq("user_email", session.user.email)
          .order("date", { ascending: false })
        
        if (error || !campaigns) {
          console.error("Failed to fetch campaigns:", error)
          return
        }

        const now = new Date()
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

        const totalCampaigns = campaigns.length
        const totalSent = campaigns.reduce((sum, c) => sum + c.sent, 0)
        const totalRecipients = campaigns.reduce((sum, c) => sum + c.recipients, 0)
        const totalFailed = campaigns.reduce((sum, c) => sum + c.failed, 0)
        const successRate = totalRecipients > 0 ? ((totalSent / totalRecipients) * 100) : 0
        const averageRecipientsPerCampaign = totalCampaigns > 0 ? totalRecipients / totalCampaigns : 0

        const campaignsThisMonth = campaigns.filter(c => 
          new Date(c.date) >= thisMonth
        ).length

        const campaignsLastMonth = campaigns.filter(c => {
          const campaignDate = new Date(c.date)
          return campaignDate >= lastMonth && campaignDate <= lastMonthEnd
        }).length

        let monthlyTrend: "up" | "down" | "same" = "same"
        if (campaignsThisMonth > campaignsLastMonth) monthlyTrend = "up"
        else if (campaignsThisMonth < campaignsLastMonth) monthlyTrend = "down"

        const recentCampaigns = campaigns.slice(0, 10)

        setAnalytics({
          totalCampaigns,
          totalSent,
          totalRecipients,
          totalFailed,
          successRate,
          averageRecipientsPerCampaign,
          campaignsThisMonth,
          campaignsLastMonth,
          recentCampaigns,
          monthlyTrend,
        })
      } catch (e) {
        console.error("Failed to fetch analytics:", e)
      }    }
    
    if (session?.user?.email) {
      // Initial fetch
      fetchAnalytics()
      
      // Set up real-time subscription
      const channel = supabase
        .channel('analytics_campaigns_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'email_campaigns',
            filter: `user_email=eq.${session.user.email}`
          },
          (payload) => {
            console.log('Real-time analytics update:', payload)
            // Refetch data when any change occurs
            fetchAnalytics()
          }
        )
        .subscribe()
      
      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [session, timeRange])

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading analytics...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading analytics...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="w-full px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-gray-900 leading-tight">Analytics</h1>
                  <p className="text-xs text-gray-600 leading-tight">Email campaign insights</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full flex-1 px-2 pt-3 pb-4 space-y-3">
        {/* Overview Stats */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-2 px-2">
          <Card className="min-w-[140px] flex-shrink-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-blue-100 font-medium leading-tight">Total Campaigns</p>
                  <p className="text-lg font-bold leading-tight">{analytics.totalCampaigns}</p>
                </div>
                <Mail className="h-4 w-4 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="min-w-[140px] flex-shrink-0 bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-green-100 font-medium leading-tight">Success Rate</p>
                  <p className="text-lg font-bold leading-tight">{analytics.successRate.toFixed(1)}%</p>
                </div>
                <Target className="h-4 w-4 text-green-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="min-w-[140px] flex-shrink-0 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-purple-100 font-medium leading-tight">Total Sent</p>
                  <p className="text-lg font-bold leading-tight">{analytics.totalSent.toLocaleString()}</p>
                </div>
                <Send className="h-4 w-4 text-purple-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="min-w-[140px] flex-shrink-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-orange-100 font-medium leading-tight">Avg Recipients</p>
                  <p className="text-lg font-bold leading-tight">{Math.round(analytics.averageRecipientsPerCampaign)}</p>
                </div>
                <Users className="h-4 w-4 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trend */}
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4" />
              Monthly Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="space-y-1">
                <p className="text-xs text-gray-600">This Month</p>
                <p className="text-lg font-bold text-gray-900">{analytics.campaignsThisMonth} campaigns</p>
              </div>
              <div className="flex items-center gap-2">
                {analytics.monthlyTrend === "up" && (
                  <>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-green-600 font-medium">
                      +{analytics.campaignsThisMonth - analytics.campaignsLastMonth} from last month
                    </span>
                  </>
                )}
                {analytics.monthlyTrend === "down" && (
                  <>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span className="text-xs text-red-600 font-medium">
                      {analytics.campaignsThisMonth - analytics.campaignsLastMonth} from last month
                    </span>
                  </>
                )}
                {analytics.monthlyTrend === "same" && (
                  <span className="text-xs text-gray-600">Same as last month</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Stats */}
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4" />
              Delivery Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-green-50 rounded-lg border">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-green-700">Successful</span>
                </div>
                <p className="text-lg font-bold text-green-900">{analytics.totalSent.toLocaleString()}</p>
                <p className="text-xs text-green-600">
                  {analytics.totalRecipients > 0 ? ((analytics.totalSent / analytics.totalRecipients) * 100).toFixed(1) : 0}% success rate
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg border">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-xs font-medium text-red-700">Failed</span>
                </div>
                <p className="text-lg font-bold text-red-900">{analytics.totalFailed.toLocaleString()}</p>
                <p className="text-xs text-red-600">
                  {analytics.totalRecipients > 0 ? ((analytics.totalFailed / analytics.totalRecipients) * 100).toFixed(1) : 0}% failure rate
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Campaigns */}
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              Recent Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {analytics.recentCampaigns.length === 0 ? (
              <div className="text-center py-6">
                <Mail className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <h3 className="text-sm font-medium text-gray-900 mb-1">No campaigns yet</h3>
                <p className="text-xs text-gray-600 mb-3">Start by creating your first email campaign</p>
                <Button asChild size="sm">
                  <Link href="/compose">
                    <Mail className="h-3 w-3 mr-1" />
                    Create Campaign
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {analytics.recentCampaigns.slice(0, 5).map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex flex-col gap-2 p-2.5 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-start gap-2">
                      <div className="p-1 bg-white rounded-lg mt-0.5">
                        <Mail className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{campaign.subject}</h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                          <span className="text-xs text-gray-600 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(campaign.date).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-gray-600 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {campaign.recipients} recipients
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span className="text-xs font-medium text-green-600">{campaign.sent} sent</span>
                        </div>
                        {campaign.failed > 0 && (
                          <div className="flex items-center gap-1">
                            <XCircle className="h-3 w-3 text-red-600" />
                            <span className="text-xs font-medium text-red-600">{campaign.failed} failed</span>
                          </div>
                        )}
                      </div>
                      <Badge
                        variant={
                          campaign.status === "completed"
                            ? "default"
                            : campaign.status === "sending"
                              ? "secondary"
                              : "destructive"
                        }
                        className="capitalize text-xs h-5 px-2"
                      >
                        {campaign.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {analytics.recentCampaigns.length > 5 && (
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Showing 5 of {analytics.recentCampaigns.length} campaigns
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
