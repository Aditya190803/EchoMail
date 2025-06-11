"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Mail,
  Send,
  Users,
  TrendingUp,
  Calendar,
  Clock,
  Plus,
  BarChart3,
  Activity,
  Eye,
  MousePointer,
  AlertTriangle,
  Download,
  Search,
} from "lucide-react"
import Link from "next/link"
import { AuthButton } from "@/components/auth-button"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface EmailCampaign {
  id: string
  subject: string
  total_recipients: number
  sent_count: number
  failed_count: number
  open_count: number
  click_count: number
  bounce_count: number
  created_at: string
  sent_at?: string
  status: string
}

interface EmailMetrics {
  total_campaigns: number
  total_emails_sent: number
  total_recipients: number
  avg_open_rate: number
  avg_click_rate: number
  avg_bounce_rate: number
  avg_delivery_rate: number
}

interface AnalyticsData {
  dailyStats: Array<{
    date: string
    campaigns: number
    emails_sent: number
    opens: number
    clicks: number
  }>
  recentActivity: Array<{
    subject: string
    sent_at: string
    sent_count: number
    failed_count: number
    status: string
  }>
  metrics: EmailMetrics
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [metrics, setMetrics] = useState<EmailMetrics | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateRange, setDateRange] = useState("30")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") {
      fetchDashboardData()
    }
  }, [status])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [campaignsRes, analyticsRes] = await Promise.all([
        fetch("/api/campaigns"),
        fetch(`/api/analytics?days=${dateRange}`),
      ])

      if (campaignsRes.ok && analyticsRes.ok) {
        const campaignsData = await campaignsRes.json()
        const analyticsData = await analyticsRes.json()

        setCampaigns(campaignsData.campaigns)
        setMetrics(campaignsData.metrics)
        setAnalytics(analyticsData)
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = campaign.subject.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const exportToCsv = () => {
    const csvContent = [
      ["Subject", "Recipients", "Sent", "Failed", "Opens", "Clicks", "Open Rate", "Click Rate", "Date", "Status"],
      ...filteredCampaigns.map((campaign) => [
        campaign.subject,
        campaign.total_recipients,
        campaign.sent_count,
        campaign.failed_count,
        campaign.open_count,
        campaign.click_count,
        campaign.sent_count > 0 ? `${((campaign.open_count / campaign.sent_count) * 100).toFixed(1)}%` : "0%",
        campaign.sent_count > 0 ? `${((campaign.click_count / campaign.sent_count) * 100).toFixed(1)}%` : "0%",
        new Date(campaign.created_at).toLocaleDateString(),
        campaign.status,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `echomail-campaigns-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading dashboard...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"]

  const pieData = metrics
    ? [
        { name: "Delivered", value: metrics.avg_delivery_rate, color: "#10B981" },
        { name: "Opened", value: metrics.avg_open_rate, color: "#3B82F6" },
        { name: "Clicked", value: metrics.avg_click_rate, color: "#F59E0B" },
        { name: "Bounced", value: metrics.avg_bounce_rate, color: "#EF4444" },
      ]
    : []
  return (
    <div className="flex-1 bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">EchoMail Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome back, {session?.user?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button asChild>
                <Link href="/compose" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  New Campaign
                </Link>
              </Button>
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-8">
          {/* Key Metrics */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Sent</p>
                      <p className="text-3xl font-bold">{metrics.total_emails_sent.toLocaleString()}</p>
                    </div>
                    <Send className="h-8 w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Open Rate</p>
                      <p className="text-3xl font-bold">{metrics.avg_open_rate.toFixed(1)}%</p>
                    </div>
                    <Eye className="h-8 w-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Click Rate</p>
                      <p className="text-3xl font-bold">{metrics.avg_click_rate.toFixed(1)}%</p>
                    </div>
                    <MousePointer className="h-8 w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm font-medium">Delivery Rate</p>
                      <p className="text-3xl font-bold">{metrics.avg_delivery_rate.toFixed(1)}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Email Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics?.dailyStats || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="emails_sent"
                        stackId="1"
                        stroke="#3B82F6"
                        fill="#3B82F6"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="opens"
                        stackId="2"
                        stroke="#10B981"
                        fill="#10B981"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="clicks"
                        stackId="3"
                        stroke="#F59E0B"
                        fill="#F59E0B"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Engagement Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Engagement Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {pieData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm text-gray-600">
                        {item.name}: {item.value.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Campaign History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Campaign History
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button onClick={exportToCsv} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search campaigns..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="sending">Sending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredCampaigns.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns found</h3>
                  <p className="text-gray-600 mb-6">
                    {campaigns.length === 0
                      ? "Start by creating your first email campaign"
                      : "Try adjusting your search or filters"}
                  </p>
                  <Button asChild>
                    <Link href="/compose">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Campaign
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCampaigns.map((campaign) => {
                    const openRate = campaign.sent_count > 0 ? (campaign.open_count / campaign.sent_count) * 100 : 0
                    const clickRate = campaign.sent_count > 0 ? (campaign.click_count / campaign.sent_count) * 100 : 0
                    const deliveryRate =
                      campaign.total_recipients > 0 ? (campaign.sent_count / campaign.total_recipients) * 100 : 0

                    return (
                      <div
                        key={campaign.id}
                        className="flex items-center justify-between p-6 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="p-2 bg-white rounded-lg">
                            <Mail className="h-5 w-5 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">{campaign.subject}</h4>
                            <div className="flex items-center gap-6 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(campaign.created_at).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {campaign.total_recipients} recipients
                              </span>
                              <span className="flex items-center gap-1">
                                <Send className="h-3 w-3" />
                                {campaign.sent_count} sent
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          {/* Metrics */}
                          <div className="text-right space-y-1">
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-green-600 font-medium">{openRate.toFixed(1)}% opens</span>
                              <span className="text-blue-600 font-medium">{clickRate.toFixed(1)}% clicks</span>
                              <span className="text-purple-600 font-medium">{deliveryRate.toFixed(1)}% delivered</span>
                            </div>
                            {campaign.failed_count > 0 && (
                              <div className="flex items-center gap-2 text-red-600">
                                <AlertTriangle className="h-3 w-3" />
                                <span className="text-sm">{campaign.failed_count} failed</span>
                              </div>
                            )}
                          </div>

                          <Badge
                            variant={
                              campaign.status === "sent"
                                ? "default"
                                : campaign.status === "sending"
                                  ? "secondary"
                                  : campaign.status === "failed"
                                    ? "destructive"
                                    : "outline"
                            }
                            className="capitalize"
                          >
                            {campaign.status === "sending" && <Clock className="h-3 w-3 mr-1" />}
                            {campaign.status}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
