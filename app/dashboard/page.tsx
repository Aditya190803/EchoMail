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
import { db } from "@/lib/firebase"
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp
} from "firebase/firestore"

interface EmailCampaign {
  id: string
  subject: string
  recipients: string[] // Array of email addresses  
  sent: number
  failed: number
  created_at: string | Timestamp
  status: "completed" | "sending" | "failed"
  user_email: string
  content?: string
  campaign_type?: "bulk" | "contact_list" | "manual" | "newsletter" | "announcement" | "promotion" | "other"
  attachments?: {
    fileName: string
    fileUrl: string
    fileSize: number
    cloudinary_public_id?: string
  }[]
  send_results?: any[]
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [emailHistory, setEmailHistory] = useState<EmailCampaign[]>([])

  const formatDate = (dateValue: string | Timestamp) => {
    try {
      if (typeof dateValue === 'string') {
        return new Date(dateValue).toLocaleDateString()
      } else if (dateValue?.toDate) {
        return dateValue.toDate().toLocaleDateString()
      }
      return "Invalid date"
    } catch {
      return "Invalid date"
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  useEffect(() => {
    if (!session?.user?.email) return

    const campaignsRef = collection(db, "email_campaigns")
    const q = query(
      campaignsRef,
      where("user_email", "==", session.user.email)
    )
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const campaigns: EmailCampaign[] = []
      snapshot.forEach((doc) => {
        campaigns.push({
          id: doc.id,
          ...doc.data()
        } as EmailCampaign)
      })
      
      // Sort campaigns manually by created_at (newest first)
      campaigns.sort((a, b) => {
        const dateA = typeof a.created_at === 'string' ? new Date(a.created_at) : a.created_at?.toDate?.() || new Date()
        const dateB = typeof b.created_at === 'string' ? new Date(b.created_at) : b.created_at?.toDate?.() || new Date()
        return dateB.getTime() - dateA.getTime()
      })
      
      setEmailHistory(campaigns)
    }, (error) => {
      console.error("Error loading campaigns:", error)
      setEmailHistory([])
    })
    
    return () => unsubscribe()
  }, [session])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (status === "unauthenticated") return null

  const totalSent = emailHistory.reduce((sum, c) => sum + c.sent, 0)
  const totalRecipients = emailHistory.reduce((sum, c) => sum + (c.recipients?.length || 0), 0)
  const totalFailed = emailHistory.reduce((sum, c) => sum + c.failed, 0)
  const successRate = totalRecipients ? ((totalSent / totalRecipients) * 100).toFixed(1) : "0"

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Responsive */}
      <header className="sticky top-0 bg-white shadow-sm z-10 border-b">
        <div className="px-3 sm:px-4 lg:px-6 py-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <img src="/favicon.png" alt="Logo" className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-semibold text-gray-800 truncate">EchoMail</h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  Hi, {session?.user?.name}
                </p>
              </div>
            </div>
            <div className="flex gap-1 sm:gap-2 flex-shrink-0">
              <Button asChild size="sm" className="text-xs sm:text-sm">
                <Link href="/compose">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span className="hidden xs:inline">New </span>Campaign
                </Link>
              </Button>
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Stats Grid - Responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { 
              label: "Total Sent", 
              value: totalSent, 
              icon: <Send className="h-4 w-4 sm:h-5 sm:w-5" />, 
              color: "bg-gradient-to-br from-blue-500 to-blue-600",
              shortLabel: "Sent"
            },
            { 
              label: "Success Rate", 
              value: `${successRate}%`, 
              icon: <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />, 
              color: "bg-gradient-to-br from-green-500 to-green-600",
              shortLabel: "Success"
            },
            { 
              label: "Recipients", 
              value: totalRecipients, 
              icon: <Users className="h-4 w-4 sm:h-5 sm:w-5" />, 
              color: "bg-gradient-to-br from-purple-500 to-purple-600",
              shortLabel: "Recipients"
            },
            { 
              label: "Campaigns", 
              value: emailHistory.length, 
              icon: <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />, 
              color: "bg-gradient-to-br from-orange-500 to-orange-600",
              shortLabel: "Campaigns"
            }
          ].map((stat, idx) => (
            <Card key={idx} className={`${stat.color} text-white border-0 shadow-lg hover:shadow-xl transition-shadow`}>
              <CardContent className="p-3 sm:p-4 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-white/80 truncate">
                    <span className="sm:hidden">{stat.shortLabel}</span>
                    <span className="hidden sm:inline">{stat.label}</span>
                  </p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold truncate">
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  </p>
                </div>
                <div className="opacity-80 flex-shrink-0 ml-2">
                  {stat.icon}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions - Responsive */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-semibold">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button asChild className="h-16 sm:h-20 flex flex-col items-center justify-center gap-1 sm:gap-2">
                <Link href="/compose">
                  <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-xs sm:text-sm font-medium">New Campaign</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-16 sm:h-20 flex flex-col items-center justify-center gap-1 sm:gap-2">
                <Link href="/contacts">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-xs sm:text-sm font-medium">Manage Contacts</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-16 sm:h-20 flex flex-col items-center justify-center gap-1 sm:gap-2">
                <Link href="/analytics">
                  <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-xs sm:text-sm font-medium">View Analytics</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Campaign History - Responsive */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-semibold">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
                Email Campaign History
              </CardTitle>
              {emailHistory.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {emailHistory.length} total
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {emailHistory.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                </div>
                <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-2">No campaigns yet</h3>
                <p className="text-xs sm:text-sm text-gray-500 mb-4 max-w-sm mx-auto">
                  Get started by creating your first email campaign to reach your audience.
                </p>
                <Button asChild size="sm">
                  <Link href="/compose">
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Create First Campaign
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {emailHistory.slice(0, 10).map(c => (
                  <div key={c.id} className="border rounded-lg p-3 sm:p-4 bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm sm:text-base font-medium text-gray-800 line-clamp-2 mb-2">
                          {c.subject}
                        </h4>
                        <div className="flex flex-wrap items-center text-xs sm:text-sm text-gray-500 gap-3 sm:gap-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">{formatDate(c.created_at)}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">{c.recipients?.length || 0} recipients</span>
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={c.status === "completed" ? "default" : c.status === "sending" ? "secondary" : "destructive"}
                        className="capitalize text-xs flex-shrink-0"
                      >
                        {c.status === "sending" && <Clock className="h-3 w-3 mr-1" />}
                        {c.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 sm:gap-4">
                      <div className="flex items-center gap-1 text-xs sm:text-sm font-medium text-green-600">
                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span>{c.sent} sent</span>
                      </div>
                      {c.failed > 0 && (
                        <div className="flex items-center gap-1 text-xs sm:text-sm font-medium text-red-600">
                          <XCircle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span>{c.failed} failed</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs sm:text-sm font-medium text-blue-600">
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span>{(c.recipients?.length || 0) > 0 ? ((c.sent / (c.recipients?.length || 1)) * 100).toFixed(0) : 0}% success</span>
                      </div>
                    </div>
                  </div>
                ))}
                {emailHistory.length > 10 && (
                  <div className="text-center pt-4">
                    <Button asChild variant="outline" size="sm">
                      <Link href="/analytics">
                        View All Campaigns
                        <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
