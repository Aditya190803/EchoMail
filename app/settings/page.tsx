"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import {
  PenSquare,
  Link2,
  UserMinus,
  Bell,
  Settings,
  ChevronRight,
  Palette,
  ShieldCheck,
  Database,
  Shield,
  Users,
  FileText,
} from "lucide-react"
import Link from "next/link"

const settingsCategories = [
  {
    title: "Email Settings",
    items: [
      {
        name: "Email Signatures",
        description: "Create and manage your email signatures",
        icon: PenSquare,
        href: "/settings/signatures",
        color: "text-primary",
        bgColor: "bg-primary/10",
      },
      {
        name: "Unsubscribe Management",
        description: "Manage unsubscribed email addresses",
        icon: UserMinus,
        href: "/settings/unsubscribes",
        color: "text-destructive",
        bgColor: "bg-destructive/10",
      },
    ],
  },
  {
    title: "Integrations",
    items: [
      {
        name: "Webhooks",
        description: "Configure webhook notifications for email events",
        icon: Link2,
        href: "/settings/webhooks",
        color: "text-secondary",
        bgColor: "bg-secondary/10",
      },
    ],
  },
  {
    title: "Team & Collaboration",
    items: [
      {
        name: "Teams",
        description: "Manage your teams and collaborate with others",
        icon: Users,
        href: "/settings/teams",
        color: "text-info",
        bgColor: "bg-info/10",
      },
    ],
  },
  {
    title: "Privacy & Security",
    items: [
      {
        name: "Privacy & Data (GDPR)",
        description: "Manage your data, export, and privacy preferences",
        icon: Shield,
        href: "/settings/gdpr",
        color: "text-success",
        bgColor: "bg-success/10",
      },
      {
        name: "Audit Logs",
        description: "View activity history and account actions",
        icon: FileText,
        href: "/settings/audit-logs",
        color: "text-muted-foreground",
        bgColor: "bg-muted",
      },
    ],
  },
  {
    title: "Data Management",
    items: [
      {
        name: "Duplicate Contacts",
        description: "Find and merge duplicate contacts",
        icon: Database,
        href: "/contacts/duplicates",
        color: "text-warning",
        bgColor: "bg-warning/10",
      },
    ],
  },
]

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your EchoMail preferences and configurations
          </p>
        </div>

        {/* Settings Categories */}
        <div className="space-y-8">
          {settingsCategories.map((category) => (
            <div key={category.title}>
              <h2 className="text-lg font-semibold mb-4">{category.title}</h2>
              <div className="grid gap-4">
                {category.items.map((item) => (
                  <Link key={item.name} href={item.href}>
                    <Card hover className="transition-all duration-200">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${item.bgColor}`}>
                            <item.icon className={`h-6 w-6 ${item.color}`} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{item.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {item.description}
                            </p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Account Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-success" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{session?.user?.email}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{session?.user?.name || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Authentication</span>
                <span className="font-medium">Google OAuth</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  )
}
