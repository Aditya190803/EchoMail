"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/navbar";
import { Skeleton } from "@/components/ui/skeleton";
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
  History,
  ArrowRight,
  Zap,
  Target,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { campaignsService, EmailCampaign } from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [emailHistory, setEmailHistory] = useState<EmailCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formatDate = (dateValue: string) => {
    try {
      return new Date(dateValue).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // Fetch campaigns function
  const fetchCampaigns = useCallback(async () => {
    if (!session?.user?.email) return;

    try {
      const response = await campaignsService.listByUser(session.user.email);
      setEmailHistory(response.documents);
    } catch (error: any) {
      componentLogger.error("Error loading campaigns", error);
      // If collection doesn't exist, just show empty state
      if (error?.code === 404 || error?.message?.includes("Collection")) {
        componentLogger.debug(
          "Collections may not be set up yet. Run: bun run scripts/setup-appwrite.ts",
        );
      }
      setEmailHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.email]);

  // Initial fetch and real-time subscription
  useEffect(() => {
    if (!session?.user?.email) return;

    // Initial fetch
    fetchCampaigns();

    // Subscribe to real-time updates
    const unsubscribe = campaignsService.subscribeToUserCampaigns(
      session.user.email,
      (_response) => {
        // Refetch on any change
        fetchCampaigns();
      },
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [session?.user?.email, fetchCampaigns]);

  if (status === "loading" || !isMounted || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section Skeleton */}
          <div className="mb-8">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-5 w-80" />
          </div>

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, idx) => (
              <Card key={idx} className="border-0 shadow-lg overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                    <Skeleton className="h-11 w-11 rounded-xl" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions Skeleton */}
          <div className="mb-8">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[...Array(3)].map((_, idx) => (
                <Card key={idx} className="h-full">
                  <CardContent className="p-5 flex flex-col items-center text-center">
                    <Skeleton className="h-14 w-14 rounded-2xl mb-4" />
                    <Skeleton className="h-5 w-28 mb-2" />
                    <Skeleton className="h-4 w-40" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Campaign History Skeleton */}
          <Card>
            <CardHeader className="pb-4">
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(3)].map((_, idx) => (
                  <div key={idx} className="border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <Skeleton className="h-5 w-3/4" />
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-28" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  const totalSent = emailHistory.reduce((sum, c) => sum + c.sent, 0);
  const totalRecipients = emailHistory.reduce(
    (sum, c) => sum + (c.recipients?.length || 0),
    0,
  );
  const _totalFailed = emailHistory.reduce((sum, c) => sum + c.failed, 0);
  const successRate = totalRecipients
    ? ((totalSent / totalRecipients) * 100).toFixed(1)
    : "0";

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
    },
  ];

  const quickActions = [
    {
      title: "New Campaign",
      description: "Create and send a new email campaign",
      icon: Plus,
      href: "/compose",
      primary: true,
    },
    {
      title: "Manage Contacts",
      description: "View and organize your contacts",
      icon: Users,
      href: "/contacts",
    },
    {
      title: "Email History",
      description: "View sent campaigns and delivery status",
      icon: History,
      href: "/history",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Welcome back, {session?.user?.name?.split(" ")[0] || "there"}! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your email campaigns
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Card
                key={idx}
                className={`border-0 shadow-lg bg-gradient-to-br ${stat.bgGradient} overflow-hidden`}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        {stat.label}
                      </p>
                      <p className="text-2xl sm:text-3xl font-bold">
                        {typeof stat.value === "number"
                          ? stat.value.toLocaleString()
                          : stat.value}
                      </p>
                    </div>
                    <div
                      className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
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
              const Icon = action.icon;
              return (
                <Link key={idx} href={action.href}>
                  <Card
                    hover
                    className={`h-full ${action.primary ? "bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20" : ""}`}
                  >
                    <CardContent className="p-5 flex flex-col items-center text-center">
                      <div
                        className={`p-4 rounded-2xl mb-4 ${action.primary ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-muted"}`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="font-semibold mb-1">{action.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
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
                <p className="text-sm text-muted-foreground">
                  Your latest email campaign activity
                </p>
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
                  Get started by creating your first email campaign to reach
                  your audience.
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
                {emailHistory.slice(0, 5).map((c) => (
                  <div
                    key={c.$id}
                    className="group border rounded-xl p-4 hover:shadow-md hover:border-primary/20 transition-all duration-200"
                  >
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
                        variant={
                          c.status === "completed"
                            ? "success"
                            : c.status === "sending"
                              ? "info"
                              : "destructive"
                        }
                        className="capitalize flex-shrink-0"
                      >
                        {c.status === "sending" && (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
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
                        {(c.recipients?.length || 0) > 0
                          ? (
                              (c.sent / (c.recipients?.length || 1)) *
                              100
                            ).toFixed(0)
                          : 0}
                        % success
                      </div>
                    </div>
                    {/* Show failure reasons if there are failed emails */}
                    {c.failed > 0 &&
                      c.send_results &&
                      c.send_results.filter(
                        (r: any) => r.status !== "success" && r.error,
                      ).length > 0 && (
                        <div className="mt-3 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                          <p className="text-xs font-medium text-destructive mb-2">
                            Failure Reasons:
                          </p>
                          <div className="space-y-1 max-h-24 overflow-y-auto">
                            {c.send_results
                              .filter(
                                (r: any) => r.status !== "success" && r.error,
                              )
                              .slice(0, 3)
                              .map((result: any, index: number) => (
                                <div
                                  key={index}
                                  className="text-xs text-muted-foreground"
                                >
                                  <span className="font-medium">
                                    {result.email}
                                  </span>
                                  : {result.error}
                                </div>
                              ))}
                            {c.send_results.filter(
                              (r: any) => r.status !== "success" && r.error,
                            ).length > 3 && (
                              <Link
                                href="/history"
                                className="text-xs text-primary hover:underline"
                              >
                                View all{" "}
                                {
                                  c.send_results.filter(
                                    (r: any) => r.status !== "success",
                                  ).length
                                }{" "}
                                failures →
                              </Link>
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                ))}
                {emailHistory.length > 5 && (
                  <div className="text-center pt-4">
                    <Button asChild variant="outline">
                      <Link href="/history" className="gap-2">
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
  );
}
