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
  ExternalLink,
  FileText,
  Download,
  Plus,
  ChevronDown,
  ChevronUp,
  Eye,
  Paperclip,
  Copy,
} from "lucide-react"
import Link from "next/link"
import { AuthButton } from "@/components/auth-button"
import { db } from "@/lib/firebase"
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from "firebase/firestore"

interface EmailCampaign {
  id: string
  subject: string
  recipients: string[] | string
  sent: number
  failed: number
  created_at: string | Timestamp
  status: "completed" | "sending" | "failed"
  user_email: string
  campaign_type?: string
  content?: string
  attachments?: {
    fileName: string
    fileUrl: string
    fileSize: number
    cloudinary_public_id?: string
  }[]
  send_results?: {
    email: string
    success: boolean
    error?: string
    messageId?: string
  }[]
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
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set())

  // Helper function to safely get recipients as array
  const getRecipientsArray = (recipients: any): string[] => {
    if (Array.isArray(recipients)) {
      return recipients
    }
    if (typeof recipients === 'string') {
      return recipients.split(',').map(email => email.trim()).filter(email => email)
    }
    return []
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  useEffect(() => {
    if (!session?.user?.email) return
    const q = query(
      collection(db, "email_campaigns"),
      where("user_email", "==", session.user.email)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const campaigns: EmailCampaign[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as EmailCampaign[]

      campaigns.sort((a, b) => {
        const dateA =
          typeof a.created_at === "string"
            ? new Date(a.created_at)
            : a.created_at?.toDate?.() || new Date()
        const dateB =
          typeof b.created_at === "string"
            ? new Date(b.created_at)
            : b.created_at?.toDate?.() || new Date()
        return dateB.getTime() - dateA.getTime()
      })

      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

      const totalCampaigns = campaigns.length
      const totalSent = campaigns.reduce((sum, c) => sum + c.sent, 0)
      const totalRecipients = campaigns.reduce((sum, c) => sum + getRecipientsArray(c.recipients).length, 0)
      const totalFailed = campaigns.reduce((sum, c) => sum + c.failed, 0)
      const successRate = totalRecipients > 0 ? (totalSent / totalRecipients) * 100 : 0
      const averageRecipientsPerCampaign = totalCampaigns > 0 ? totalRecipients / totalCampaigns : 0

      const campaignsThisMonth = campaigns.filter((c) => {
        const date =
          typeof c.created_at === "string"
            ? new Date(c.created_at)
            : c.created_at?.toDate?.() || new Date()
        return date >= thisMonth
      }).length

      const campaignsLastMonth = campaigns.filter((c) => {
        const date =
          typeof c.created_at === "string"
            ? new Date(c.created_at)
            : c.created_at?.toDate?.() || new Date()
        return date >= lastMonth && date <= lastMonthEnd
      }).length

      const monthlyTrend =
        campaignsThisMonth > campaignsLastMonth
          ? "up"
          : campaignsThisMonth < campaignsLastMonth
          ? "down"
          : "same"

      setAnalytics({
        totalCampaigns,
        totalSent,
        totalRecipients,
        totalFailed,
        successRate,
        averageRecipientsPerCampaign,
        campaignsThisMonth,
        campaignsLastMonth,
        recentCampaigns: campaigns.slice(0, 10),        monthlyTrend,
      })
    })

    return () => unsubscribe()
  }, [session])

  const formatDate = (value: string | Timestamp) => {
    try {
      if (typeof value === "string") {
        return new Date(value).toLocaleDateString()
      }
      if (value?.toDate) {
        return value.toDate().toLocaleDateString()
      }
      return new Date().toLocaleDateString() // Fallback to current date
    } catch (error) {
      return new Date().toLocaleDateString() // Fallback to current date
    }
  }

  // Helper functions for campaign details
  const toggleCampaignExpansion = (campaignId: string) => {
    setExpandedCampaigns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId)
      } else {
        newSet.add(campaignId)
      }
      return newSet
    })
  }
  const copyEmailList = async (emails: string[]) => {
    try {
      await navigator.clipboard.writeText(emails.join(', '))
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy emails:', err)
    }
  }

  const downloadEmailList = (emails: string[], campaignSubject: string) => {
    const csvContent = emails.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${campaignSubject.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_recipients.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50 text-center">
        <BarChart3 className="w-10 h-10 text-gray-400 mb-4" />
        <h2 className="text-lg font-semibold">No Analytics Yet</h2>
        <p className="text-gray-500 text-sm mb-6">
          Start sending campaigns to see insights here.
        </p>
        <Button asChild>
          <Link href="/compose">
            <Plus className="h-4 w-4 mr-1" />
            Create Campaign
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h1 className="text-xl font-semibold">Campaign Analytics</h1>
          </div>
        </div>
        <AuthButton />
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Total Campaigns",
            value: analytics.totalCampaigns,
            icon: <Mail className="text-white" />,
            color: "from-blue-500 to-blue-600",
          },
          {
            label: "Success Rate",
            value: `${analytics.successRate.toFixed(1)}%`,
            icon: <Target className="text-white" />,
            color: "from-green-500 to-green-600",
          },
          {
            label: "Total Sent",
            value: analytics.totalSent.toLocaleString(),
            icon: <Send className="text-white" />,
            color: "from-purple-500 to-purple-600",
          },
          {
            label: "Avg Recipients",
            value: Math.round(analytics.averageRecipientsPerCampaign),
            icon: <Users className="text-white" />,
            color: "from-orange-500 to-orange-600",
          },
        ].map((stat, i) => (
          <Card
            key={i}
            className={`bg-gradient-to-r ${stat.color} text-white shadow-sm`}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-white/80">{stat.label}</p>
                <p className="text-xl font-semibold">{stat.value}</p>
              </div>
              {stat.icon}
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Monthly Trend */}
      <section className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4" />
              Monthly Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">This Month</p>
              <p className="text-lg font-bold">{analytics.campaignsThisMonth} campaigns</p>
            </div>
            <div className="flex items-center gap-2">
              {analytics.monthlyTrend === "up" && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  +{analytics.campaignsThisMonth - analytics.campaignsLastMonth}
                </span>
              )}
              {analytics.monthlyTrend === "down" && (
                <span className="text-sm text-red-600 flex items-center gap-1">
                  <TrendingDown className="h-4 w-4" />
                  {analytics.campaignsThisMonth - analytics.campaignsLastMonth}
                </span>
              )}
              {analytics.monthlyTrend === "same" && (
                <span className="text-sm text-gray-500">No change</span>
              )}
            </div>
          </CardContent>
        </Card>
      </section>      {/* Recent Campaigns */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Recent Campaigns</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpandedCampaigns(new Set())}
              className="text-xs"
            >
              Collapse All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpandedCampaigns(new Set(analytics?.recentCampaigns.map(c => c.id) || []))}
              className="text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              View All Details
            </Button>
          </div>
        </div>
        {analytics.recentCampaigns.map((campaign) => {
          const isExpanded = expandedCampaigns.has(campaign.id)
          return (
            <Card key={campaign.id} className="overflow-hidden">
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium truncate">{campaign.subject}</h3>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        campaign.status === "completed"
                          ? "default"
                          : campaign.status === "sending"
                          ? "secondary"
                          : "destructive"
                      }
                      className="capitalize text-xs"
                    >
                      {campaign.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCampaignExpansion(campaign.id)}
                      className="h-6 w-6 p-0"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="text-xs text-gray-600 flex flex-wrap gap-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(campaign.created_at)}
                  </span>                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {getRecipientsArray(campaign.recipients).length} recipients
                  </span>
                  {campaign.campaign_type && (
                    <Badge className="text-xs capitalize">{campaign.campaign_type}</Badge>
                  )}
                  {campaign.attachments && campaign.attachments.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      {campaign.attachments.length} attachment{campaign.attachments.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-xs font-medium">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    {campaign.sent} sent
                  </span>
                  {campaign.failed > 0 && (
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircle className="h-3 w-3" />
                      {campaign.failed} failed
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t bg-gray-50 p-4 space-y-4">
                  {/* Email Recipients */}
                  <div>
                    <div className="flex items-center justify-between mb-2">                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Recipients ({getRecipientsArray(campaign.recipients).length})
                      </h4>
                      <div className="flex gap-2">                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyEmailList(getRecipientsArray(campaign.recipients))}
                          className="text-xs h-7"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadEmailList(getRecipientsArray(campaign.recipients), campaign.subject)}
                          className="text-xs h-7"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          CSV
                        </Button>
                      </div>
                    </div>                    <div className="bg-white rounded p-3 max-h-32 overflow-y-auto">
                      <div className="text-xs text-gray-600 break-all">
                        {getRecipientsArray(campaign.recipients).join(', ') || 'No recipients'}
                      </div>
                    </div>
                  </div>

                  {/* Email Content */}
                  {campaign.content && (
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4" />
                        Email Content
                      </h4>
                      <div className="bg-white rounded p-3 max-h-40 overflow-y-auto">
                        <div 
                          className="text-xs text-gray-700 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: campaign.content }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Attachments */}
                  {campaign.attachments && campaign.attachments.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                        <Paperclip className="h-4 w-4" />
                        Attachments ({campaign.attachments.length})
                      </h4>
                      <div className="space-y-2">
                        {campaign.attachments.map((attachment, index) => (
                          <div key={index} className="bg-white rounded p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <div>
                                <div className="text-xs font-medium">{attachment.fileName}</div>
                                <div className="text-xs text-gray-500">
                                  {(attachment.fileSize / 1024 / 1024).toFixed(2)} MB
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="text-xs h-7"
                            >
                              <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View
                              </a>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Send Results Details (if available) */}
                  {campaign.send_results && campaign.send_results.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                        <Activity className="h-4 w-4" />
                        Delivery Details
                      </h4>
                      <div className="bg-white rounded p-3 max-h-32 overflow-y-auto">
                        <div className="space-y-1">                          {campaign.send_results.slice(0, 10).map((result: any, index: number) => (
                            <div key={index} className="text-xs flex items-center justify-between">
                              <span className="text-gray-600">{result.email || 'Unknown'}</span>
                              <Badge
                                variant={result.status === "success" ? "default" : "destructive"}
                                className="text-xs"
                              >
                                {result.status === "success" ? "Sent" : "Failed"}
                              </Badge>
                            </div>
                          ))}
                          {campaign.send_results.length > 10 && (
                            <div className="text-xs text-gray-500 pt-1">
                              And {campaign.send_results.length - 10} more...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </section>
    </div>
  )
}
