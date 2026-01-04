"use client";

import { useEffect, useState, useCallback } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

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
  ArrowRight,
  Zap,
  Target,
  BarChart3,
  Eye,
  Copy,
  Download,
  FileText,
  ExternalLink,
  Paperclip,
  Search,
  Loader2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { EmailCampaign } from "@/lib/appwrite";
import { campaignsService } from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";
import { getEmailPreview } from "@/lib/email-formatting/client";

// Helper to get authenticated attachment URL
const getAttachmentUrl = (attachment: {
  fileUrl?: string;
  appwrite_file_id?: string;
}) => {
  if (attachment.appwrite_file_id) {
    return `/api/appwrite/attachments/${attachment.appwrite_file_id}`;
  }
  if (attachment.fileUrl) {
    const match = attachment.fileUrl.match(/\/files\/([^\/]+)\//);
    if (match && match[1]) {
      return `/api/appwrite/attachments/${match[1]}`;
    }
  }
  return attachment.fileUrl || "#";
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [emailHistory, setEmailHistory] = useState<EmailCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedCampaign, setSelectedCampaign] =
    useState<EmailCampaign | null>(null);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "success" | "failed"
  >("all");
  const [formattedPreviewHtml, setFormattedPreviewHtml] = useState<string>("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

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

  // Helper function to safely get recipients as array
  const getRecipientsArray = (recipients: any): string[] => {
    if (Array.isArray(recipients)) {
      return recipients;
    }
    if (typeof recipients === "string") {
      return recipients
        .split(",")
        .map((email) => email.trim())
        .filter((email) => email);
    }
    return [];
  };

  const copyEmailList = async (emails: string[]) => {
    try {
      await navigator.clipboard.writeText(emails.join(", "));
      toast.success("Email list copied!");
    } catch (err) {
      componentLogger.error(
        "Failed to copy emails",
        err instanceof Error ? err : undefined,
      );
      toast.error("Failed to copy");
    }
  };

  const downloadEmailList = (emails: string[], campaignSubject: string) => {
    const csvContent = emails.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${campaignSubject.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_recipients.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success("Recipients exported!");
  };

  const duplicateCampaign = (campaign: EmailCampaign) => {
    setIsDuplicating(true);
    const duplicateData = {
      subject: `${campaign.subject} (Copy)`,
      content: campaign.content || "",
      recipients: getRecipientsArray(campaign.recipients),
      attachments: campaign.attachments || [],
    };
    sessionStorage.setItem("duplicateCampaign", JSON.stringify(duplicateData));
    toast.success("Campaign data copied! Redirecting to compose...");
    router.push("/compose");
  };

  const exportCampaignResults = (campaign: EmailCampaign) => {
    const headers = ["Email", "Status", "Error Message", "Sent At"];
    const rows: string[][] = [];

    if (campaign.send_results && campaign.send_results.length > 0) {
      campaign.send_results.forEach((result: any) => {
        rows.push([
          result.email || "",
          result.success ? "Sent" : "Failed",
          result.error || "",
          result.timestamp || campaign.created_at || "",
        ]);
      });
    } else {
      getRecipientsArray(campaign.recipients).forEach((email) => {
        rows.push([email, "Unknown", "", campaign.created_at || ""]);
      });
    }

    const csvContent = [
      `# Campaign: ${campaign.subject}`,
      `# Sent: ${formatDate(campaign.created_at)}`,
      `# Total Recipients: ${getRecipientsArray(campaign.recipients).length}`,
      `# Successful: ${campaign.sent}`,
      `# Failed: ${campaign.failed}`,
      "",
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign_results_${campaign.subject.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success("Campaign results exported!");
  };

  useEffect(() => {
    // Redirect if unauthenticated OR if there's a session error (token refresh failed)
    if (
      status === "unauthenticated" ||
      (status === "authenticated" && session?.error)
    ) {
      router.push("/");
    }
  }, [status, session?.error, router]);

  // Load formatted preview HTML when a campaign is selected
  useEffect(() => {
    const loadFormattedPreview = async () => {
      if (!selectedCampaign?.content) {
        setFormattedPreviewHtml("");
        return;
      }

      setIsLoadingPreview(true);
      try {
        const formattedHtml = await getEmailPreview(selectedCampaign.content);
        setFormattedPreviewHtml(createGmailPreviewWrapper(formattedHtml));
      } catch (error) {
        componentLogger.error(
          "Failed to load formatted preview",
          error instanceof Error ? error : undefined,
        );
        // Fallback to basic preview
        setFormattedPreviewHtml(
          createGmailPreviewWrapper(selectedCampaign.content),
        );
      }
      setIsLoadingPreview(false);
    };

    loadFormattedPreview();
  }, [selectedCampaign]);

  // Fetch campaigns function
  const fetchCampaigns = useCallback(async () => {
    if (!session?.user?.email) {
      return;
    }

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
    if (!session?.user?.email) {
      return;
    }

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
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [session?.user?.email, fetchCampaigns]);

  if (status === "loading" || !isMounted || isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
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

  if (status === "unauthenticated") {
    return null;
  }

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
      title: "Email Insights",
      description: "View sent campaigns and their performance",
      icon: BarChart3,
      href: "/insights",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
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
                              <button
                                onClick={() => setSelectedCampaign(c)}
                                className="text-xs text-primary hover:underline"
                              >
                                View all{" "}
                                {
                                  c.send_results.filter(
                                    (r: any) => r.status !== "success",
                                  ).length
                                }{" "}
                                failures →
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    {/* View Details Button */}
                    <div className="mt-4 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setSelectedCampaign(c)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
                {emailHistory.length > 5 && (
                  <div className="text-center pt-4">
                    <Button asChild variant="outline">
                      <Link href="/insights" className="gap-2">
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

      {/* Full Campaign Details Modal */}
      <Dialog
        open={!!selectedCampaign}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCampaign(null);
            setRecipientSearch("");
            setFilterStatus("all");
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Campaign Details
                </DialogTitle>
                <DialogDescription>
                  Full details and delivery information for this campaign
                </DialogDescription>
              </div>
              {selectedCampaign && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportCampaignResults(selectedCampaign)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Results
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isDuplicating}
                    onClick={() => {
                      duplicateCampaign(selectedCampaign);
                      setSelectedCampaign(null);
                    }}
                  >
                    {isDuplicating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    {isDuplicating ? "Loading..." : "Duplicate"}
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {selectedCampaign && (
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {/* Campaign Header */}
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">
                      {selectedCampaign.subject}
                    </h3>
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
                    <div className="text-2xl font-bold text-success">
                      {selectedCampaign.sent}
                    </div>
                    <div className="text-xs text-muted-foreground">Sent</div>
                  </div>
                  <div className="bg-background rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-destructive">
                      {selectedCampaign.failed}
                    </div>
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

              {/* Email Preview */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  Email Preview
                </h4>
                <div className="border rounded-lg bg-white dark:bg-zinc-900 overflow-hidden">
                  {/* Email Header */}
                  <div className="border-b p-4 bg-gray-50 dark:bg-zinc-800">
                    <p className="text-sm">
                      <span className="font-medium text-muted-foreground">
                        Subject:
                      </span>{" "}
                      <span className="text-foreground font-semibold">
                        {selectedCampaign.subject}
                      </span>
                    </p>
                  </div>
                  {/* Email Body */}
                  <div className="relative">
                    {isLoadingPreview ? (
                      <div className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Loading preview...
                        </p>
                      </div>
                    ) : selectedCampaign.content ? (
                      <iframe
                        srcDoc={formattedPreviewHtml}
                        className="w-full h-[300px] border-0 bg-white"
                        title={`Email preview - ${selectedCampaign.subject}`}
                        sandbox="allow-same-origin"
                      />
                    ) : (
                      <div className="p-4">
                        <p className="text-muted-foreground text-sm italic">
                          No content preview available
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Attachments */}
              {selectedCampaign.attachments &&
                selectedCampaign.attachments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      Attachments ({selectedCampaign.attachments.length})
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedCampaign.attachments.map((attachment, index) => (
                        <div
                          key={index}
                          className="bg-muted/50 border rounded-lg p-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">
                                {attachment.fileName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {(attachment.fileSize / 1024 / 1024).toFixed(2)}{" "}
                                MB
                              </div>
                            </div>
                          </div>
                          <Button variant="outline" size="icon-sm" asChild>
                            <a
                              href={getAttachmentUrl(attachment)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
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
                    Recipients (
                    {getRecipientsArray(selectedCampaign.recipients).length})
                  </h4>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyEmailList(
                          getRecipientsArray(selectedCampaign.recipients),
                        )
                      }
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        downloadEmailList(
                          getRecipientsArray(selectedCampaign.recipients),
                          selectedCampaign.subject,
                        )
                      }
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
                        variant={
                          filterStatus === "success" ? "success" : "outline"
                        }
                        size="sm"
                        onClick={() => setFilterStatus("success")}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Sent
                      </Button>
                      <Button
                        variant={
                          filterStatus === "failed" ? "destructive" : "outline"
                        }
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
                  {selectedCampaign.send_results &&
                  selectedCampaign.send_results.length > 0 ? (
                    <div className="divide-y divide-border">
                      {selectedCampaign.send_results
                        .filter((result: any) => {
                          const email = result.email || "";
                          const matchesSearch = email
                            .toLowerCase()
                            .includes(recipientSearch.toLowerCase());
                          const matchesFilter =
                            filterStatus === "all" ||
                            (filterStatus === "success" &&
                              result.status === "success") ||
                            (filterStatus === "failed" &&
                              result.status !== "success");
                          return matchesSearch && matchesFilter;
                        })
                        .map((result: any, index: number) => (
                          <div
                            key={index}
                            className="p-3 flex items-center justify-between hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              {result.status === "success" ? (
                                <CheckCircle className="h-4 w-4 text-success" />
                              ) : (
                                <XCircle className="h-4 w-4 text-destructive" />
                              )}
                              <div>
                                <div className="text-sm font-medium">
                                  {result.email}
                                </div>
                                {result.error && (
                                  <div className="text-xs text-destructive">
                                    {result.error}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Badge
                              variant={
                                result.status === "success"
                                  ? "success"
                                  : "destructive"
                              }
                            >
                              {result.status === "success"
                                ? "Delivered"
                                : "Failed"}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {getRecipientsArray(selectedCampaign.recipients)
                          .filter((email) =>
                            email
                              .toLowerCase()
                              .includes(recipientSearch.toLowerCase()),
                          )
                          .map((email, index) => (
                            <div
                              key={index}
                              className="bg-background rounded-lg p-2 text-sm truncate border"
                            >
                              {email}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {recipientSearch &&
                  (selectedCampaign.send_results
                    ? selectedCampaign.send_results.filter((r: any) =>
                        r.email
                          ?.toLowerCase()
                          .includes(recipientSearch.toLowerCase()),
                      ).length === 0
                    : getRecipientsArray(selectedCampaign.recipients).filter(
                        (e) =>
                          e
                            .toLowerCase()
                            .includes(recipientSearch.toLowerCase()),
                      ).length === 0) && (
                    <p className="text-center text-muted-foreground text-sm py-2">
                      No recipients found matching "{recipientSearch}"
                    </p>
                  )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

/**
 * Gmail-like preview wrapper for email content
 * This ensures the preview looks identical to the sent email.
 */
function createGmailPreviewWrapper(htmlContent: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #222222;
      background: #ffffff;
      -webkit-font-smoothing: antialiased;
      word-wrap: break-word;
      overflow-wrap: break-word;
      word-break: break-word;
    }
    * { max-width: 100%; box-sizing: border-box; }
    h1 { font-size: 2em; font-weight: bold; margin: 0.67em 0; }
    h2 { font-size: 1.5em; font-weight: bold; margin: 0.75em 0; }
    h3 { font-size: 1.17em; font-weight: bold; margin: 0.83em 0; }
    h4 { font-size: 1em; font-weight: bold; margin: 1em 0; }
    p, div { margin: 0.5em 0; word-wrap: break-word; overflow-wrap: break-word; }
    ul, ol { padding-left: 1.5em; margin: 0.5em 0; }
    ul { list-style-type: disc; }
    ol { list-style-type: decimal; }
    li { margin: 0.25em 0; }
    a { color: #2563eb; text-decoration: underline; }
    blockquote {
      border-left: 3px solid #ccc;
      margin: 1em 0;
      padding-left: 1em;
      color: #666;
      font-style: italic;
    }
    pre {
      background: #f5f5f5;
      color: #333;
      font-family: 'Courier New', Courier, monospace;
      padding: 12px 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 1em 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    code {
      background: #f1f5f9;
      color: #e11d48;
      padding: 0.2em 0.4em;
      border-radius: 0.25em;
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.9em;
    }
    pre code { background: none; color: inherit; padding: 0; }
    hr { border: none; border-top: 2px solid #e5e7eb; margin: 1.5em 0; }
    table { border-collapse: collapse; margin: 1em 0; width: 100%; }
    th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
    th { background: #f3f4f6; font-weight: bold; }
    img { max-width: 100%; height: auto; }
    mark { background-color: #fef08a; border-radius: 0.25em; padding: 0.1em 0.2em; }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;
}
