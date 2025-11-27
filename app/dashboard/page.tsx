"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/navbar"
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
  ArrowRight,
  Sparkles,
  Zap,
  Target,
} from "lucide-react"
import Link from "next/link"
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
  recipients: string[]
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
        return new Date(dateValue).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      } else if (dateValue?.toDate) {
        return dateValue.toDate().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") return null

  const totalSent = emailHistory.reduce((sum, c) => sum + c.sent, 0)
  const totalRecipients = emailHistory.reduce((sum, c) => sum + (c.recipients?.length || 0), 0)
  const totalFailed = emailHistory.reduce((sum, c) => sum + c.failed, 0)
  const successRate = totalRecipients ? ((totalSent / totalRecipients) * 100).toFixed(1) : "0"

  const stats = [
    { 
      label: "Total Sent", 
      value: totalSent, 
      icon: Send, 
      gradient: "from-primary to-primary/80",
      bgGradient: "from-primary/10 to-primary/5",
    },
    { 
      label: "Success Rate", 
      value: `${successRate}%`, 
      icon: Target, 
      gradient: "from-success to-success/80",
      bgGradient: "from-success/10 to-success/5",
    },
    { 
      label: "Recipients", 
      value: totalRecipients, 
      icon: Users, 
      gradient: "from-secondary to-secondary/80",
      bgGradient: "from-secondary/10 to-secondary/5",
    },
    { 
      label: "Campaigns", 
      value: emailHistory.length, 
      icon: BarChart3, 
      gradient: "from-warning to-warning/80",
      bgGradient: "from-warning/10 to-warning/5",
    }
  ]

  const quickActions = [
    { 
      title: "New Campaign", 
      description: "Create and send a new email campaign",
      icon: Plus, 
      href: "/compose",
      primary: true 
    },
    { 
      title: "Manage Contacts", 
      description: "View and organize your contacts",
      icon: Users, 
      href: "/contacts" 
    },
    { 
      title: "View Analytics", 
      description: "See detailed campaign statistics",
      icon: BarChart3, 
      href: "/analytics" 
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Welcome back, {session?.user?.name?.split(' ')[0] || 'there'}! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your email campaigns
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, idx) => {
            const Icon = stat.icon
            return (
              <Card key={idx} className={`border-0 shadow-lg bg-gradient-to-br ${stat.bgGradient} overflow-hidden`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">{stat.label}</p>
                      <p className="text-2xl sm:text-3xl font-bold">
                        {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                      </p>
                    </div>
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-warning" />
              Quick Actions
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {quickActions.map((action, idx) => {
              const Icon = action.icon
              return (
                <Link key={idx} href={action.href}>
                  <Card hover className={`h-full ${action.primary ? 'bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20' : ''}`}>
                    <CardContent className="p-5 flex flex-col items-center text-center">
                      <div className={`p-4 rounded-2xl mb-4 ${action.primary ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-muted'}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="font-semibold mb-1">{action.title}</h3>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Campaign History */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="h-5 w-5 text-primary" />
                  Recent Campaigns
                </CardTitle>
                <CardDescription>Your latest email campaign activity</CardDescription>
              </div>
              {emailHistory.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {emailHistory.length} total
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {emailHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Get started by creating your first email campaign to reach your audience.
                </p>
                <Button asChild>
                  <Link href="/compose">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Campaign
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {emailHistory.slice(0, 5).map(c => (
                  <div key={c.id} className="group border rounded-xl p-4 hover:shadow-md hover:border-primary/20 transition-all duration-200">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground line-clamp-1 mb-2 group-hover:text-primary transition-colors">
                          {c.subject}
                        </h4>
                        <div className="flex flex-wrap items-center text-sm text-muted-foreground gap-4">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            {formatDate(c.created_at)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Users className="h-4 w-4" />
                            {c.recipients?.length || 0} recipients
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={c.status === "completed" ? "success" : c.status === "sending" ? "info" : "destructive"}
                        className="capitalize flex-shrink-0"
                      >
                        {c.status === "sending" && <Clock className="h-3 w-3 mr-1" />}
                        {c.status}
                      </Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-1.5 font-medium text-success">
                        <CheckCircle className="h-4 w-4" />
                        {c.sent} sent
                      </div>
                      {c.failed > 0 && (
                        <div className="flex items-center gap-1.5 font-medium text-destructive">
                          <XCircle className="h-4 w-4" />
                          {c.failed} failed
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 font-medium text-primary">
                        <TrendingUp className="h-4 w-4" />
                        {(c.recipients?.length || 0) > 0 ? ((c.sent / (c.recipients?.length || 1)) * 100).toFixed(0) : 0}% success
                      </div>
                    </div>
                  </div>
                ))}
                {emailHistory.length > 5 && (
                  <div className="text-center pt-4">
                    <Button asChild variant="outline">
                      <Link href="/analytics" className="gap-2">
                        View All Campaigns
                        <ArrowRight className="h-4 w-4" />
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
