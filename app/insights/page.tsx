"use client";

import { useEffect, useState, useCallback, useMemo } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Calendar,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  History,
  Loader2,
  Mail,
  MousePointer2,
  Paperclip,
  Percent,
  Plus,
  Search,
  Send,
  Users,
  XCircle,
  BarChart3,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  StatsCardWidget,
  LineChartWidget,
  ComparisonWidget,
  HeatmapWidget,
  RecentCampaignsWidget,
  PieChartWidget,
} from "@/components/activity/dashboard-widgets";
import { EmailHeatmapOverlay } from "@/components/activity/heatmap-overlay";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { generateWeekOverWeekComparison } from "@/lib/activity/comparison";
import { aggregateDeviceData } from "@/lib/activity/devices";
import {
  generateCSV,
  generatePDF,
  downloadFile,
  calculateSummary,
  transformCampaignToAnalytics,
} from "@/lib/activity/export";
import { aggregateClickData } from "@/lib/activity/heatmap";
import type { EmailCampaign } from "@/lib/appwrite";
import { campaignsService } from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";
import { metricsService } from "@/lib/services/metrics-service";
import { cn, formatDate } from "@/lib/utils";
import type {
  CampaignAnalytics,
  AnalyticsSummary,
  ComparisonReport,
  ClickHeatmapData,
  TrackingEvent,
} from "@/types/activity";

interface HistoryData {
  totalCampaigns: number;
  totalSent: number;
  totalRecipients: number;
  totalFailed: number;
  successRate: number;
  averageRecipientsPerCampaign: number;
  campaignsThisMonth: number;
  campaignsLastMonth: number;
  recentCampaigns: EmailCampaign[];
  monthlyTrend: "up" | "down" | "same";
}

// Helper to get authenticated attachment URL
const getAttachmentUrl = (attachment: {
  fileUrl?: string;
  appwrite_file_id?: string;
}) => {
  // If we have the Appwrite file ID, use our authenticated proxy
  if (attachment.appwrite_file_id) {
    return `/api/appwrite/attachments/${attachment.appwrite_file_id}`;
  }

  // Try to extract file ID from Appwrite URL
  if (attachment.fileUrl) {
    const match = attachment.fileUrl.match(/\/files\/([^\/]+)\//);
    if (match && match[1]) {
      return `/api/appwrite/attachments/${match[1]}`;
    }
  }

  // Fallback to original URL (for legacy/external attachments)
  return attachment.fileUrl || "#";
};

export default function HistoryPage() {
  const { session, status, isLoading: _isLoading } = useAuthGuard();
  const router = useRouter();
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [insightsCampaigns, setInsightsCampaigns] = useState<
    CampaignAnalytics[]
  >([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [comparison, setComparison] = useState<ComparisonReport | null>(null);
  const [deviceDistribution, setDeviceDistribution] = useState<
    { name: string; value: number; color: string }[]
  >([]);
  const [heatmap, setHeatmap] = useState<ClickHeatmapData | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [duplicatingCampaignId, setDuplicatingCampaignId] = useState<
    string | null
  >(null);

  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(
    new Set(),
  );
  const [selectedCampaign, setSelectedCampaign] =
    useState<EmailCampaign | null>(null);
  const [recipientEngagement, setRecipientEngagement] = useState<any[]>([]);
  const [campaignStats, setCampaignStats] = useState<any>(null);
  const [isLoadingEngagement, setIsLoadingEngagement] = useState(false);
  const [_isLoadingStats, setIsLoadingStats] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "success" | "failed"
  >("all");

  // Prepare chart data by aggregating by date
  const chartData = useMemo(() => {
    if (!insightsCampaigns.length) {
      return [];
    }

    // Sort by date ascending
    const sorted = [...insightsCampaigns].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    // Aggregate by date
    const aggregated = sorted.reduce(
      (acc: Record<string, number>, campaign) => {
        const date = formatDate(campaign.createdAt);
        acc[date] = (acc[date] || 0) + campaign.sent;
        return acc;
      },
      {},
    );

    // Convert to array format for Recharts and ensure chronological order
    return Object.entries(aggregated)
      .map(([name, value]) => ({
        name,
        value,
        // Use the first campaign's date for this group to ensure correct sorting
        date: new Date(name),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(({ name, value }) => ({ name, value }))
      .slice(-10); // Keep last 10 days of activity
  }, [insightsCampaigns]);

  // Helper function to safely get recipients as array
  const getRecipientsArray = (recipients: any): string[] => {
    if (Array.isArray(recipients)) {
      return recipients;
    }
    if (typeof recipients === "string") {
      try {
        return JSON.parse(recipients);
      } catch {
        return recipients
          .split(",")
          .map((email: string) => email.trim())
          .filter((email: string) => email);
      }
    }
    return [];
  };

  // Duplicate campaign - same behavior as dashboard
  const duplicateCampaign = useCallback(
    (campaign: EmailCampaign) => {
      setDuplicatingCampaignId(campaign.$id);

      const duplicateData = {
        subject: `${campaign.subject} (Copy)`,
        content: campaign.content || "",
        recipients: getRecipientsArray(campaign.recipients),
        attachments: campaign.attachments || [],
      };

      sessionStorage.setItem(
        "duplicateCampaign",
        JSON.stringify(duplicateData),
      );
      toast.success("Campaign data copied! Redirecting to compose...");
      router.push("/compose");
    },
    [router],
  );

  // Fetch recipient engagement and stats when a campaign is selected
  useEffect(() => {
    const fetchCampaignData = async () => {
      if (!selectedCampaign) {
        setRecipientEngagement([]);
        setCampaignStats(null);
        return;
      }

      setIsLoadingEngagement(true);
      setIsLoadingStats(true);

      try {
        // Fetch recipients
        const recipientsPromise = fetch(
          `/api/activity/campaign-recipients?campaignId=${selectedCampaign.$id}`,
        ).then((res) => (res.ok ? res.json() : { recipients: [] }));

        // Fetch advanced stats
        const statsPromise = fetch(
          `/api/activity/campaign-stats?campaign_id=${selectedCampaign.$id}&advanced=true`,
        ).then((res) => (res.ok ? res.json() : null));

        const [recipientsData, statsData] = await Promise.all([
          recipientsPromise,
          statsPromise,
        ]);

        setRecipientEngagement(recipientsData.recipients || []);
        setCampaignStats(statsData);
      } catch (error) {
        componentLogger.error("Error fetching campaign data", error as Error);
      } finally {
        setIsLoadingEngagement(false);
        setIsLoadingStats(false);
      }
    };

    fetchCampaignData();
  }, [selectedCampaign]);

  // Fetch campaigns and calculate history data
  const fetchHistory = useCallback(async () => {
    if (!session?.user?.email) {
      return;
    }

    setIsLoadingData(true);
    try {
      // Fetch campaigns first as they are the primary data
      const campaignsResponse = await campaignsService.listByUser(
        session.user.email,
      );
      const campaigns = campaignsResponse.documents;

      // Fetch events separately and handle failure gracefully
      let events: TrackingEvent[] = [];
      try {
        const eventsResponse = await metricsService.listEvents({
          limit: 1000,
        });
        events = eventsResponse.documents as unknown as TrackingEvent[];
      } catch (error) {
        componentLogger.error("Error fetching tracking events", error as Error);
        // Continue with empty events if tracking fails
      }

      // Transform to insights format
      const transformed = campaigns.map((c) => {
        const campaignEvents = events.filter((e) => e.campaign_id === c.$id);
        return transformCampaignToAnalytics(c, {
          opens: campaignEvents.filter((e) => e.event_type === "open").length,
          clicks: campaignEvents.filter((e) => e.event_type === "click").length,
        });
      });

      setInsightsCampaigns(transformed);
      setSummary(calculateSummary(transformed));
      setComparison(generateWeekOverWeekComparison(transformed));
      setDeviceDistribution(aggregateDeviceData(events));

      // If there's a recent campaign, show its heatmap
      if (transformed.length > 0) {
        setHeatmap(aggregateClickData(events, transformed[0].id));
      }

      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const totalCampaigns = campaigns.length;
      const totalSent = campaigns.reduce((sum, c) => sum + c.sent, 0);
      const totalRecipients = campaigns.reduce(
        (sum, c) => sum + getRecipientsArray(c.recipients).length,
        0,
      );
      const totalFailed = campaigns.reduce((sum, c) => sum + c.failed, 0);
      const successRate =
        totalRecipients > 0 ? (totalSent / totalRecipients) * 100 : 0;
      const averageRecipientsPerCampaign =
        totalCampaigns > 0 ? totalRecipients / totalCampaigns : 0;

      const campaignsThisMonth = campaigns.filter((c) => {
        const date = new Date(c.created_at || "");
        return date >= thisMonth;
      }).length;

      const campaignsLastMonth = campaigns.filter((c) => {
        const date = new Date(c.created_at || "");
        return date >= lastMonth && date <= lastMonthEnd;
      }).length;

      const monthlyTrend =
        campaignsThisMonth > campaignsLastMonth
          ? "up"
          : campaignsThisMonth < campaignsLastMonth
            ? "down"
            : "same";

      setHistoryData({
        totalCampaigns,
        totalSent,
        totalRecipients,
        totalFailed,
        successRate,
        averageRecipientsPerCampaign,
        campaignsThisMonth,
        campaignsLastMonth,
        recentCampaigns: campaigns,
        monthlyTrend,
      });
    } catch (error) {
      componentLogger.error(
        "Error fetching history",
        error instanceof Error ? error : undefined,
      );
    } finally {
      setIsLoadingData(false);
    }
  }, [session?.user?.email]);

  // Initial fetch and real-time subscription
  useEffect(() => {
    if (!session?.user?.email) {
      return;
    }

    // Initial fetch
    fetchHistory();

    // Subscribe to real-time updates
    const unsubscribe = campaignsService.subscribeToUserCampaigns(
      session.user.email,
      (_response) => {
        // Refetch on any change
        fetchHistory();
      },
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [session?.user?.email, fetchHistory]);

  // Helper functions for campaign details
  const toggleCampaignExpansion = (campaignId: string) => {
    setExpandedCampaigns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
      } else {
        newSet.add(campaignId);
      }
      return newSet;
    });
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

  const handleExportCSV = () => {
    if (!summary || insightsCampaigns.length === 0) {
      return;
    }
    const csv = generateCSV({
      campaigns: insightsCampaigns,
      summary,
      dateRange: {
        start: new Date(
          insightsCampaigns[insightsCampaigns.length - 1].createdAt,
        ),
        end: new Date(),
      },
    });
    downloadFile(
      csv,
      `echomail-insights-${new Date().toISOString().split("T")[0]}.csv`,
      "text/csv",
    );
    toast.success("CSV report exported!");
  };

  const handleExportPDF = async () => {
    if (!summary || insightsCampaigns.length === 0) {
      return;
    }
    setIsExporting(true);
    try {
      const pdf = await generatePDF({
        campaigns: insightsCampaigns,
        summary,
        dateRange: {
          start: new Date(
            insightsCampaigns[insightsCampaigns.length - 1].createdAt,
          ),
          end: new Date(),
        },
      });
      downloadFile(
        pdf,
        `echomail-insights-${new Date().toISOString().split("T")[0]}.pdf`,
        "application/pdf",
      );
      toast.success("PDF report exported!");
    } catch (error) {
      componentLogger.error("PDF export failed", error as Error);
      toast.error("Failed to generate PDF report");
    } finally {
      setIsExporting(false);
    }
  };

  if (status === "loading" || isLoadingData) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          {/* Header Skeleton */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-5 w-64" />
            </div>
            <Skeleton className="h-10 w-40" />
          </div>

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Campaigns List Skeleton */}
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <Skeleton className="h-5 w-64 mb-2" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!historyData || historyData.totalCampaigns === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-24">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <History className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No Emails Sent Yet</h2>
          <p className="text-muted-foreground text-center mb-6 max-w-sm">
            Start sending campaigns to see your email history and performance
            insights here.
          </p>
          <Button asChild>
            <Link href="/compose">
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              Insights & History
            </h1>
            <p className="text-muted-foreground">
              Track your campaign performance and delivery metrics
            </p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isExporting}>
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? "Exporting..." : "Export Report"}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button asChild>
              <Link href="/compose">
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Link>
            </Button>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-8"
        >
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCardWidget
                title="Total Campaigns"
                value={historyData.totalCampaigns}
                icon={<Mail className="h-5 w-5 text-primary" />}
                trend={comparison?.changes.campaigns}
              />
              <StatsCardWidget
                title="Delivery Rate"
                value={`${historyData.successRate.toFixed(1)}%`}
                icon={<Percent className="h-5 w-5 text-success" />}
                trend={comparison?.changes.successRate}
                gradientFrom="success/10"
                gradientTo="success/5"
              />
              <StatsCardWidget
                title="Emails Delivered"
                value={historyData.totalSent}
                icon={<Send className="h-5 w-5 text-secondary" />}
                trend={comparison?.changes.sent}
                gradientFrom="secondary/10"
                gradientTo="secondary/5"
              />
              <StatsCardWidget
                title="Open Rate"
                value={
                  summary?.averageOpenRate
                    ? `${summary.averageOpenRate.toFixed(1)}%`
                    : "N/A"
                }
                icon={<Eye className="h-5 w-5 text-accent" />}
                trend={comparison?.changes.openRate}
                gradientFrom="accent/10"
                gradientTo="accent/5"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Activity Chart */}
              <div className="lg:col-span-2">
                <LineChartWidget
                  title="Campaign Activity"
                  data={chartData}
                  label="Campaigns"
                  size="large"
                  className="h-full"
                />
              </div>

              {/* Comparison Widget */}
              <div className="h-full">
                {comparison && (
                  <ComparisonWidget report={comparison} className="h-full" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Campaigns */}
              <RecentCampaignsWidget
                campaigns={insightsCampaigns}
                onViewCampaign={(id) => {
                  const c = historyData.recentCampaigns.find(
                    (rc) => rc.$id === id,
                  );
                  if (c) {
                    setSelectedCampaign(c);
                  }
                }}
              />

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Performance Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Delivery Success
                      </span>
                      <span className="font-medium">
                        {historyData.successRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success transition-all"
                        style={{ width: `${historyData.successRate}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Open Rate</span>
                      <span className="font-medium">
                        {summary?.averageOpenRate?.toFixed(1) || 0}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all"
                        style={{ width: `${summary?.averageOpenRate || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Click Rate</span>
                      <span className="font-medium">
                        {summary?.averageClickRate?.toFixed(1) || 0}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${summary?.averageClickRate || 0}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Sent Campaigns</h2>
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
                  onClick={() =>
                    setExpandedCampaigns(
                      new Set(
                        historyData?.recentCampaigns.map((c) => c.$id) || [],
                      ),
                    )
                  }
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Expand All
                </Button>
              </div>
            </div>

            {historyData.recentCampaigns.map((campaign) => {
              const isExpanded = expandedCampaigns.has(campaign.$id);
              const analytics = insightsCampaigns.find(
                (a) => a.id === campaign.$id,
              );

              return (
                <Card
                  key={campaign.$id}
                  className={cn(
                    "transition-all duration-200",
                    isExpanded ? "ring-1 ring-primary/20" : "hover:bg-muted/50",
                  )}
                >
                  <CardContent className="p-0">
                    <div
                      className="p-4 sm:p-6 cursor-pointer flex items-center justify-between gap-4"
                      onClick={() => toggleCampaignExpansion(campaign.$id)}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div
                          className={cn(
                            "p-2 rounded-full shrink-0",
                            campaign.status === "completed"
                              ? "bg-success/10 text-success"
                              : "bg-warning/10 text-warning",
                          )}
                        >
                          {campaign.status === "completed" ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <Clock className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">
                            {campaign.subject}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(campaign.created_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {
                                getRecipientsArray(campaign.recipients).length
                              }{" "}
                              recipients
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="hidden sm:flex items-center gap-6 mr-4">
                          <div className="text-center">
                            <div className="text-sm font-bold">
                              {analytics?.opens || 0}
                            </div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                              Opens
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-bold">
                              {analytics?.clicks || 0}
                            </div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                              Clicks
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 sm:px-6 pb-6 pt-2 border-t bg-muted/30">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                              Campaign Details
                            </h4>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Status
                                </span>
                                <Badge
                                  variant={
                                    campaign.status === "completed"
                                      ? "success"
                                      : "secondary"
                                  }
                                >
                                  {campaign.status}
                                </Badge>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Sent At
                                </span>
                                <span className="font-medium">
                                  {new Date(
                                    campaign.created_at,
                                  ).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="md:col-span-2 space-y-4">
                            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                              Performance Metrics
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              <div className="p-3 bg-background rounded-lg border">
                                <div className="text-xs text-muted-foreground mb-1">
                                  Open Rate
                                </div>
                                <div className="text-lg font-bold">
                                  {(analytics?.openRate || 0).toFixed(1)}%
                                </div>
                              </div>
                              <div className="p-3 bg-background rounded-lg border">
                                <div className="text-xs text-muted-foreground mb-1">
                                  Click Rate
                                </div>
                                <div className="text-lg font-bold">
                                  {(analytics?.clickRate || 0).toFixed(1)}%
                                </div>
                              </div>
                              <div className="p-3 bg-background rounded-lg border">
                                <div className="text-xs text-muted-foreground mb-1">
                                  Delivered
                                </div>
                                <div className="text-lg font-bold">
                                  {campaign.sent || 0}
                                </div>
                              </div>
                              <div className="p-3 bg-background rounded-lg border">
                                <div className="text-xs text-muted-foreground mb-1">
                                  Bounced
                                </div>
                                <div className="text-lg font-bold">
                                  {campaign.failed || 0}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCampaign(campaign)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Content
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => duplicateCampaign(campaign)}
                            disabled={duplicatingCampaignId === campaign.$id}
                          >
                            {duplicatingCampaignId === campaign.$id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Copy className="h-4 w-4 mr-2" />
                            )}
                            {duplicatingCampaignId === campaign.$id
                              ? "Loading..."
                              : "Duplicate"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="tracking" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                {heatmap && (
                  <HeatmapWidget
                    links={heatmap.links}
                    totalClicks={heatmap.totalClicks}
                    title="Email Click Heatmap"
                  />
                )}
              </div>
              <div className="space-y-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Tracking Overview
                    </CardTitle>
                    <CardDescription>
                      Real-time engagement metrics across all campaigns
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-accent/10 rounded-lg">
                          <Eye className="h-4 w-4 text-accent" />
                        </div>
                        <span className="text-sm font-medium">Total Opens</span>
                      </div>
                      <span className="text-lg font-bold">
                        {summary?.totalOpens || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <MousePointer2 className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium">
                          Total Clicks
                        </span>
                      </div>
                      <span className="text-lg font-bold">
                        {summary?.totalClicks || 0}
                      </span>
                    </div>
                    <div className="pt-4 border-t">
                      <div className="text-xs text-muted-foreground mb-2">
                        Engagement Score
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="text-3xl font-bold text-primary">
                          {summary?.averageOpenRate
                            ? (
                                (summary.averageOpenRate +
                                  (summary.averageClickRate || 0) * 2) /
                                3
                              ).toFixed(1)
                            : "0.0"}
                        </div>
                        <div className="text-sm text-muted-foreground mb-1">
                          / 100
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <PieChartWidget
                  title="Device Distribution"
                  data={deviceDistribution}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Full Campaign Details Modal */}
      <Dialog
        open={!!selectedCampaign}
        onOpenChange={(open) => !open && setSelectedCampaign(null)}
      >
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
                        : "secondary"
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
                      {selectedCampaign.sent || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Sent</div>
                  </div>
                  <div className="bg-background rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-destructive">
                      {selectedCampaign.failed || 0}
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

                {/* Engagement Timeline */}
                {campaignStats?.timeSeries &&
                  campaignStats.timeSeries.length > 0 && (
                    <div className="bg-background rounded-lg p-4 border">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                        Engagement Timeline
                      </h4>
                      <LineChartWidget
                        title=""
                        data={campaignStats.timeSeries.map((d: any) => ({
                          name: new Date(d.date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          }),
                          opens: d.opens,
                          clicks: d.clicks,
                        }))}
                        dataKey="opens"
                        label="Opens"
                        color="hsl(var(--primary))"
                        size="small"
                        className="border-0 shadow-none p-0"
                      />
                    </div>
                  )}

                {/* Advanced Insights */}
                {campaignStats && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-background rounded-lg p-4 border">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        Timing
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            First Open
                          </span>
                          <span className="font-medium">
                            {campaignStats.timing?.timeToFirstOpen
                              ? `${Math.round(campaignStats.timing.timeToFirstOpen / 60)}m`
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            First Click
                          </span>
                          <span className="font-medium">
                            {campaignStats.timing?.timeToFirstClick
                              ? `${Math.round(campaignStats.timing.timeToFirstClick / 60)}m`
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            Avg. Open
                          </span>
                          <span className="font-medium">
                            {campaignStats.timing?.averageTimeToOpen
                              ? `${Math.round(campaignStats.timing.averageTimeToOpen / 3600)}h`
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-background rounded-lg p-4 border">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        Email Clients
                      </h4>
                      <PieChartWidget
                        title=""
                        data={campaignStats.emailClients || []}
                        size="small"
                        showLabels={false}
                        className="border-0 shadow-none p-0 bg-transparent h-24"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Email Content & Heatmap */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Email Content & Heatmap
                  </h4>
                  {heatmap && heatmap.campaignId === selectedCampaign.$id && (
                    <Badge variant="outline" className="text-[10px]">
                      {heatmap.totalClicks} Total Clicks
                    </Badge>
                  )}
                </div>

                {selectedCampaign.content ? (
                  <EmailHeatmapOverlay
                    htmlContent={selectedCampaign.content}
                    linkStats={
                      campaignStats?.linkStats
                        ? campaignStats.linkStats.map((l: any) => ({
                            link_id: l.linkId,
                            url: l.url,
                            clicks: l.clicks,
                            uniqueClicks: l.uniqueClicks,
                          }))
                        : heatmap && heatmap.campaignId === selectedCampaign.$id
                          ? heatmap.links.map((l) => ({
                              link_id: "", // We'll match by URL if link_id is missing
                              url: l.url,
                              clicks: l.clicks,
                              uniqueClicks: l.uniqueClicks,
                            }))
                          : []
                    }
                    className="border rounded-lg overflow-hidden"
                  />
                ) : (
                  <div className="bg-muted/50 border rounded-lg p-4 text-center italic text-sm text-muted-foreground">
                    No content preview available
                  </div>
                )}
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
                      {selectedCampaign.attachments.map(
                        (attachment: any, index: number) => (
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
                                  {(attachment.fileSize / 1024 / 1024).toFixed(
                                    2,
                                  )}{" "}
                                  MB
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              asChild
                              className="h-8 w-8"
                            >
                              <a
                                href={getAttachmentUrl(attachment)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          </div>
                        ),
                      )}
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.open(
                          `/api/activity/export?campaign_id=${selectedCampaign.$id}&format=csv`,
                          "_blank",
                        );
                      }}
                    >
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Export Tracking
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const analytics = insightsCampaigns.find(
                          (a) => a.id === selectedCampaign.$id,
                        );
                        if (!analytics) {
                          return;
                        }

                        setIsExporting(true);
                        try {
                          const pdf = await generatePDF({
                            campaigns: [analytics],
                            summary: {
                              totalCampaigns: 1,
                              totalRecipients: analytics.recipients,
                              totalSent: analytics.sent,
                              totalFailed: analytics.failed,
                              overallSuccessRate: analytics.successRate,
                              averageRecipientsPerCampaign:
                                analytics.recipients,
                              totalOpens: analytics.opens,
                              totalClicks: analytics.clicks,
                              averageOpenRate: analytics.openRate,
                              averageClickRate: analytics.clickRate,
                            },
                            dateRange: {
                              start: new Date(analytics.createdAt),
                              end: new Date(analytics.createdAt),
                            },
                          });
                          downloadFile(
                            pdf,
                            `campaign-${selectedCampaign.$id}-report.pdf`,
                            "application/pdf",
                          );
                          toast.success("Campaign report exported!");
                        } catch (_error) {
                          toast.error("Failed to export PDF");
                        } finally {
                          setIsExporting(false);
                        }
                      }}
                      disabled={isExporting}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      PDF Report
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete Data
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete Tracking Data?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete all tracking events
                            (opens, clicks) for this campaign. This action
                            cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={async () => {
                              try {
                                const res = await fetch(
                                  `/api/activity/delete?campaign_id=${selectedCampaign.$id}`,
                                  { method: "DELETE" },
                                );
                                if (res.ok) {
                                  toast.success("Tracking data deleted");
                                  setSelectedCampaign(null);
                                  fetchHistory();
                                } else {
                                  toast.error("Failed to delete data");
                                }
                              } catch (_error) {
                                toast.error("An error occurred");
                              }
                            }}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Search and Filter */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search recipients..."
                      value={recipientSearch}
                      onChange={(e) => setRecipientSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
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
                <div className="bg-muted/50 border rounded-lg max-h-80 overflow-y-auto">
                  {isLoadingEngagement ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Loading engagement data...
                      </p>
                    </div>
                  ) : recipientEngagement.length > 0 ? (
                    <div className="divide-y divide-border">
                      {recipientEngagement
                        .filter((r: any) =>
                          r.email
                            .toLowerCase()
                            .includes(recipientSearch.toLowerCase()),
                        )
                        .map((recipient: any, index: number) => (
                          <div
                            key={index}
                            className="p-3 flex items-center justify-between hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "p-1.5 rounded-full",
                                  recipient.opens > 0
                                    ? "bg-success/10 text-success"
                                    : "bg-muted text-muted-foreground",
                                )}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </div>
                              <div>
                                <div className="text-sm font-medium">
                                  {recipient.email}
                                </div>
                                <div className="flex gap-3 mt-0.5">
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Eye className="h-2.5 w-2.5" />{" "}
                                    {recipient.opens} opens
                                  </span>
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <MousePointer2 className="h-2.5 w-2.5" />{" "}
                                    {recipient.clicks} clicks
                                  </span>
                                  {recipient.last_active && (
                                    <span className="text-[10px] text-muted-foreground">
                                      Last active:{" "}
                                      {new Date(
                                        recipient.last_active,
                                      ).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {recipient.opens > 0 && (
                                <Badge
                                  variant="success"
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  Engaged
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : selectedCampaign.send_results &&
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
