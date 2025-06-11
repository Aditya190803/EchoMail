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
import { getSupabaseClient } from "@/lib/supabase"

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
  const supabase = getSupabaseClient();
  const { data: session, status } = useSession()
  const router = useRouter()
  const [emailHistory, setEmailHistory] = useState<EmailCampaign[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  useEffect(() => {
    async function fetchHistory() {
      if (!session?.user?.email) return
      setLoadingHistory(true)
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, subject, recipients, sent, failed, date, status")
        .eq("user_email", session.user.email)
        .order("date", { ascending: false })
      if (error) {
        setEmailHistory([])
      } else {
        setEmailHistory(data || [])
      }
      setLoadingHistory(false)
    }
    if (status === "authenticated") {
      fetchHistory()
    }
  }, [status, session])

  if (status === "loading" || loadingHistory) {
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center py-4 gap-4 md:gap-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">EchoMail Dashboard</h1>
                <p className="text-xs sm:text-sm text-gray-600">Welcome back, {session?.user?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button asChild>
                <Link href="/compose" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New Campaign</span>
                </Link>
              </Button>
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-2 sm:px-4 py-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Sent</p>
                    <p className="text-3xl font-bold">{totalSent.toLocaleString()}</p>
                  </div>
                  <Send className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Success Rate</p>
                    <p className="text-3xl font-bold">{successRate}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Recipients</p>
                    <p className="text-3xl font-bold">{totalRecipients.toLocaleString()}</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Campaigns</p>
                    <p className="text-3xl font-bold">{emailHistory.length}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-orange-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Button asChild className="h-20 flex-col gap-2">
                  <Link href="/compose">
                    <Plus className="h-6 w-6" />
                    <span>New Campaign</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2">
                  <Users className="h-6 w-6" />
                  <span>Manage Contacts</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2">
                  <BarChart3 className="h-6 w-6" />
                  <span>View Analytics</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Email History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Campaign History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {emailHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
                  <p className="text-gray-600 mb-6">Start by creating your first email campaign</p>
                  <Button asChild>
                    <Link href="/compose">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Campaign
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {emailHistory.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors gap-4"
                    >
                      <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="p-2 bg-white rounded-lg">
                          <Mail className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 break-words max-w-xs md:max-w-none">{campaign.subject}</h4>
                          <div className="flex flex-wrap items-center gap-4 mt-1">
                            <span className="text-sm text-gray-600 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(campaign.date).toLocaleDateString()}
                            </span>
                            <span className="text-sm text-gray-600 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {campaign.recipients} recipients
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-end md:items-center gap-2 md:gap-4 w-full md:w-auto">
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-600">{campaign.sent} sent</span>
                          </div>
                          {campaign.failed > 0 && (
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="text-sm font-medium text-red-600">{campaign.failed} failed</span>
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
                          className="capitalize"
                        >
                          {campaign.status === "sending" && <Clock className="h-3 w-3 mr-1" />}
                          {campaign.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
