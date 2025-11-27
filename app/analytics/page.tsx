"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/navbar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
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
  Activity,
  Target,
  ExternalLink,
  FileText,
  Download,
  Plus,
  ChevronDown,
  ChevronUp,
  Eye,
  Paperclip,
  Copy,
  Search,
  Percent,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { db } from "@/lib/firebase"
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from "firebase/firestore"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

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
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null)
  const [recipientSearch, setRecipientSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "success" | "failed">("all")

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
      toast.success("Email list copied!")
    } catch (err) {
      console.error('Failed to copy emails:', err)
      toast.error("Failed to copy")
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
    toast.success("Recipients exported!")
  }

  const formatDate = (value: string | Timestamp) => {
    try {
      const date = typeof value === "string" ? new Date(value) : value?.toDate?.() || new Date()
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return new Date().toLocaleDateString()
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center px-4 py-24">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No Analytics Yet</h2>
          <p className="text-muted-foreground text-center mb-6 max-w-sm">
            Start sending campaigns to see insights and performance metrics here.
          </p>
          <Button asChild>
            <Link href="/compose">
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Campaign Analytics</h1>
          <p className="text-muted-foreground">Track your email performance and insights</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="text-2xl font-bold">{analytics.totalCampaigns}</div>
              <p className="text-sm text-muted-foreground">Total Campaigns</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Percent className="h-5 w-5 text-success" />
                </div>
              </div>
              <div className="text-2xl font-bold">{analytics.successRate.toFixed(1)}%</div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <Send className="h-5 w-5 text-secondary" />
                </div>
              </div>
              <div className="text-2xl font-bold">{analytics.totalSent.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Emails Sent</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Users className="h-5 w-5 text-accent" />
                </div>
              </div>
              <div className="text-2xl font-bold">{Math.round(analytics.averageRecipientsPerCampaign)}</div>
              <p className="text-sm text-muted-foreground">Avg Recipients</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trend */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Monthly Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">This Month</p>
                <p className="text-2xl font-bold">{analytics.campaignsThisMonth} campaigns</p>
              </div>
              <div className="flex items-center gap-2">
                {analytics.monthlyTrend === "up" && (
                  <Badge variant="success" className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +{analytics.campaignsThisMonth - analytics.campaignsLastMonth} from last month
                  </Badge>
                )}
                {analytics.monthlyTrend === "down" && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" />
                    {analytics.campaignsThisMonth - analytics.campaignsLastMonth} from last month
                  </Badge>
                )}
                {analytics.monthlyTrend === "same" && (
                  <Badge variant="secondary">Same as last month</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>        {/* Recent Campaigns */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Campaigns</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandedCampaigns(new Set())}
              >
                Collapse All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandedCampaigns(new Set(analytics?.recentCampaigns.map(c => c.id) || []))}
              >
                <Eye className="h-4 w-4 mr-2" />
                View All
              </Button>
            </div>
          </div>

          {analytics.recentCampaigns.map((campaign) => {
            const isExpanded = expandedCampaigns.has(campaign.id)
            return (
              <Card key={campaign.id} hover className="overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate mb-1">{campaign.subject}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(campaign.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {getRecipientsArray(campaign.recipients).length} recipients
                        </span>
                        {campaign.attachments && campaign.attachments.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Paperclip className="h-3.5 w-3.5" />
                            {campaign.attachments.length} attachment{campaign.attachments.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          campaign.status === "completed"
                            ? "success"
                            : campaign.status === "sending"
                            ? "warning"
                            : "destructive"
                        }
                        className="capitalize"
                      >
                        {campaign.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => toggleCampaignExpansion(campaign.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-success">
                      <CheckCircle className="h-4 w-4" />
                      {campaign.sent} sent
                    </span>
                    {campaign.failed > 0 && (
                      <span className="flex items-center gap-1.5 text-destructive">
                        <XCircle className="h-4 w-4" />
                        {campaign.failed} failed
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t bg-muted/30 p-5 space-y-4">
                    {/* Recipients */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Recipients ({getRecipientsArray(campaign.recipients).length})
                        </h4>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyEmailList(getRecipientsArray(campaign.recipients))}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadEmailList(getRecipientsArray(campaign.recipients), campaign.subject)}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            CSV
                          </Button>
                        </div>
                      </div>
                      <div className="bg-background rounded-lg p-3 max-h-32 overflow-y-auto text-sm text-muted-foreground">
                        {getRecipientsArray(campaign.recipients).join(', ') || 'No recipients'}
                      </div>
                    </div>

                    {/* Email Content */}
                    {campaign.content && (
                      <div>
                        <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4" />
                          Email Content
                        </h4>
                        <div className="bg-background rounded-lg p-3 max-h-40 overflow-y-auto">
                          <div 
                            className="text-sm prose prose-sm max-w-none dark:prose-invert"
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
                          Attachments
                        </h4>
                        <div className="space-y-2">
                          {campaign.attachments.map((attachment, index) => (
                            <div key={index} className="bg-background rounded-lg p-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="text-sm font-medium">{attachment.fileName}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {(attachment.fileSize / 1024 / 1024).toFixed(2)} MB
                                  </div>
                                </div>
                              </div>
                              <Button variant="outline" size="sm" asChild>
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

                    {/* Delivery Details */}
                    {campaign.send_results && campaign.send_results.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                          <Activity className="h-4 w-4" />
                          Delivery Details
                        </h4>
                        <div className="bg-background rounded-lg p-3 max-h-32 overflow-y-auto space-y-1">
                          {campaign.send_results.slice(0, 10).map((result: any, index: number) => (
                            <div key={index} className="text-sm flex items-center justify-between py-1">
                              <span className="text-muted-foreground">{result.email || 'Unknown'}</span>
                              <Badge
                                variant={result.status === "success" ? "success" : "destructive"}
                              >
                                {result.status === "success" ? "Sent" : "Failed"}
                              </Badge>
                            </div>
                          ))}
                          {campaign.send_results.length > 10 && (
                            <p className="text-sm text-muted-foreground pt-2">
                              And {campaign.send_results.length - 10} more...
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <Button
                      className="w-full"
                      onClick={() => setSelectedCampaign(campaign)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Full Details
                    </Button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </main>

      {/* Full Campaign Details Modal */}
      <Dialog open={!!selectedCampaign} onOpenChange={(open) => !open && setSelectedCampaign(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Campaign Details
            </DialogTitle>
            <DialogDescription>
              Full details and delivery information for this campaign
            </DialogDescription>
          </DialogHeader>
          
          {selectedCampaign && (
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {/* Campaign Header */}
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{selectedCampaign.subject}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Sent on {formatDate(selectedCampaign.created_at)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      selectedCampaign.status === "completed"
                        ? "success"
                        : selectedCampaign.status === "sending"
                        ? "warning"
                        : "destructive"
                    }
                    className="capitalize"
                  >
                    {selectedCampaign.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-background rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-primary">
                      {getRecipientsArray(selectedCampaign.recipients).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div className="bg-background rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-success">{selectedCampaign.sent}</div>
                    <div className="text-xs text-muted-foreground">Sent</div>
                  </div>
                  <div className="bg-background rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-destructive">{selectedCampaign.failed}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                  <div className="bg-background rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-secondary">
                      {selectedCampaign.attachments?.length || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Files</div>
                  </div>
                </div>
              </div>

              {/* Email Content */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Email Content
                </h4>
                <div className="bg-muted/50 border rounded-lg p-4 max-h-64 overflow-y-auto">
                  {selectedCampaign.content ? (
                    <div 
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: selectedCampaign.content }}
                    />
                  ) : (
                    <p className="text-muted-foreground text-sm italic">No content preview available</p>
                  )}
                </div>
              </div>

              {/* Attachments */}
              {selectedCampaign.attachments && selectedCampaign.attachments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    Attachments ({selectedCampaign.attachments.length})
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedCampaign.attachments.map((attachment, index) => (
                      <div key={index} className="bg-muted/50 border rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{attachment.fileName}</div>
                            <div className="text-xs text-muted-foreground">
                              {(attachment.fileSize / 1024 / 1024).toFixed(2)} MB
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="icon-sm" asChild>
                          <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recipients */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Recipients ({getRecipientsArray(selectedCampaign.recipients).length})
                  </h4>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyEmailList(getRecipientsArray(selectedCampaign.recipients))}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadEmailList(getRecipientsArray(selectedCampaign.recipients), selectedCampaign.subject)}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Export
                    </Button>
                  </div>
                </div>

                {/* Search and Filter */}
                <div className="flex gap-2">
                  <Input
                    icon={<Search className="h-4 w-4" />}
                    placeholder="Search recipients..."
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    className="flex-1"
                  />
                  {selectedCampaign.send_results && (
                    <div className="flex gap-1">
                      <Button
                        variant={filterStatus === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterStatus("all")}
                      >
                        All
                      </Button>
                      <Button
                        variant={filterStatus === "success" ? "success" : "outline"}
                        size="sm"
                        onClick={() => setFilterStatus("success")}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Sent
                      </Button>
                      <Button
                        variant={filterStatus === "failed" ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => setFilterStatus("failed")}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Failed
                      </Button>
                    </div>
                  )}
                </div>

                {/* Recipients List */}
                <div className="bg-muted/50 border rounded-lg max-h-64 overflow-y-auto">
                  {selectedCampaign.send_results && selectedCampaign.send_results.length > 0 ? (
                    <div className="divide-y divide-border">
                      {selectedCampaign.send_results
                        .filter((result: any) => {
                          const email = result.email || ''
                          const matchesSearch = email.toLowerCase().includes(recipientSearch.toLowerCase())
                          const matchesFilter = filterStatus === "all" || 
                            (filterStatus === "success" && result.status === "success") ||
                            (filterStatus === "failed" && result.status !== "success")
                          return matchesSearch && matchesFilter
                        })
                        .map((result: any, index: number) => (
                          <div key={index} className="p-3 flex items-center justify-between hover:bg-muted/50">
                            <div className="flex items-center gap-3">
                              {result.status === "success" ? (
                                <CheckCircle className="h-4 w-4 text-success" />
                              ) : (
                                <XCircle className="h-4 w-4 text-destructive" />
                              )}
                              <div>
                                <div className="text-sm font-medium">{result.email}</div>
                                {result.error && (
                                  <div className="text-xs text-destructive">{result.error}</div>
                                )}
                              </div>
                            </div>
                            <Badge variant={result.status === "success" ? "success" : "destructive"}>
                              {result.status === "success" ? "Delivered" : "Failed"}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {getRecipientsArray(selectedCampaign.recipients)
                          .filter(email => email.toLowerCase().includes(recipientSearch.toLowerCase()))
                          .map((email, index) => (
                            <div key={index} className="bg-background rounded-lg p-2 text-sm truncate border">
                              {email}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {recipientSearch && (
                  selectedCampaign.send_results 
                    ? selectedCampaign.send_results.filter((r: any) => 
                        r.email?.toLowerCase().includes(recipientSearch.toLowerCase())
                      ).length === 0
                    : getRecipientsArray(selectedCampaign.recipients).filter(e => 
                        e.toLowerCase().includes(recipientSearch.toLowerCase())
                      ).length === 0
                ) && (
                  <p className="text-center text-muted-foreground text-sm py-2">
                    No recipients found matching "{recipientSearch}"
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
