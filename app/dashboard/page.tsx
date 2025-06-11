"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Mail,
  Send,
  Users,
  TrendingUp,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  BarChart3,
  Activity,
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

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [emailHistory, setEmailHistory] = useState<EmailCampaign[]>([])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  useEffect(() => {
    async function fetchCampaigns() {
      let campaigns: EmailCampaign[] = []
      try {
        const { data, error } = await supabase
          .from("email_campaigns")
          .select("id, subject, recipients, sent, failed, date, status")
          .order("date", { ascending: false })
        if (!error && data && data.length > 0) {
          campaigns = data as EmailCampaign[]
        }
      } catch (e) {
        // fail silently, show empty state
      }
      setEmailHistory(campaigns)
    }
    
    fetchCampaigns()
    
    // Auto-refresh every 30 seconds to catch new campaigns
    const interval = setInterval(fetchCampaigns, 30000)
    
    // Also refresh when window gains focus (user comes back to tab)
    const handleFocus = () => fetchCampaigns()
    window.addEventListener('focus', handleFocus)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  if (status === "loading") {
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

  const totalSent = emailHistory.reduce((sum, campaign) => sum + campaign.sent, 0)
  const totalRecipients = emailHistory.reduce((sum, campaign) => sum + campaign.recipients, 0)
  const totalFailed = emailHistory.reduce((sum, campaign) => sum + campaign.failed, 0)
  const successRate = totalRecipients > 0 ? ((totalSent / totalRecipients) * 100).toFixed(1) : "0"

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="w-full px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <img src="/favicon.png" alt="EchoMail Logo" className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900 leading-tight">EchoMail Dashboard</h1>
                <p className="text-xs text-gray-600 leading-tight truncate max-w-32">Welcome back, {session?.user?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild size="sm" className="h-8 px-2">
                <Link href="/compose" className="flex items-center gap-1 text-xs">
                  <Plus className="h-3 w-3" />
                  New
                </Link>
              </Button>
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full flex-1 px-2 pt-3 pb-4 space-y-3">
        {/* Stats Cards - horizontal scroll on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-2 px-2">
          <Card className="min-w-[140px] flex-shrink-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-blue-100 font-medium leading-tight">Total Sent</p>
                  <p className="text-lg font-bold leading-tight">{totalSent.toLocaleString()}</p>
                </div>
                <Send className="h-4 w-4 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="min-w-[140px] flex-shrink-0 bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-green-100 font-medium leading-tight">Success Rate</p>
                  <p className="text-lg font-bold leading-tight">{successRate}%</p>
                </div>
                <TrendingUp className="h-4 w-4 text-green-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="min-w-[140px] flex-shrink-0 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-purple-100 font-medium leading-tight">Recipients</p>
                  <p className="text-lg font-bold leading-tight">{totalRecipients.toLocaleString()}</p>
                </div>
                <Users className="h-4 w-4 text-purple-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="min-w-[140px] flex-shrink-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-orange-100 font-medium leading-tight">Campaigns</p>
                  <p className="text-lg font-bold leading-tight">{emailHistory.length}</p>
                </div>
                <BarChart3 className="h-4 w-4 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-2">
              <Button asChild className="h-10 flex-col gap-1 text-xs">
                <Link href="/compose">
                  <Plus className="h-4 w-4" />
                  <span>New Campaign</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-10 flex-col gap-1 text-xs">
                <Link href="/contacts">
                  <Users className="h-4 w-4" />
                  <span>Manage Contacts</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-10 flex-col gap-1 text-xs">
                <Link href="/analytics">
                  <BarChart3 className="h-4 w-4" />
                  <span>View Analytics</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Email History */}
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4" />
              Email Campaign History
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {emailHistory.length === 0 ? (
              <div className="text-center py-6">
                <Mail className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <h3 className="text-sm font-medium text-gray-900 mb-1">No campaigns yet</h3>
                <p className="text-xs text-gray-600 mb-3">Start by creating your first email campaign</p>
                <Button asChild size="sm">
                  <Link href="/compose">
                    <Plus className="h-3 w-3 mr-1" />
                    Create Campaign
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {emailHistory.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex flex-col gap-2 p-2.5 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
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
                        {campaign.status === "sending" && <Clock className="h-2.5 w-2.5 mr-1" />}
                        {campaign.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
