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
  Plus,
  Search,
  Users,
  XCircle,
  BarChart3,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { CampaignFunnelWidget } from "@/components/activity/campaign-funnel";
import {
  LineChartWidget,
  ComparisonWidget,
  HeatmapWidget,
  RecentCampaignsWidget,
  PieChartWidget,
} from "@/components/activity/dashboard-widgets";
import { DeviceBreakdownChart } from "@/components/activity/device-breakdown";
import { GlobalLeaderboard } from "@/components/activity/global-leaderboard";
import { EmailHeatmapOverlay } from "@/components/activity/heatmap-overlay";
import { LinkPerformanceTable } from "@/components/activity/link-performance";
import { CampaignSelector } from "@/components/insights/campaign-selector";
import { InsightsExportActions } from "@/components/insights/insights-export-actions";
import { InsightsSummaryCards } from "@/components/insights/insights-summary-cards";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageHeader, PageShell, EmptyState } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { getAttachmentUrl } from "@/lib/activity/attachment-url";
import { buildCampaignChartData } from "@/lib/activity/chart-data";
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
import {
  formatEmailSendErrorForUser,
  formatSendResultLabel,
  sendResultBadgeVariant,
} from "@/lib/gmail-user-message";
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

export default function HistoryPage() {
  const { session, status, isLoading: _isLoading } = useAuthGuard();
  const router = useRouter();
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [insightsCampaigns, setInsightsCampaigns] = useState<
    CampaignAnalytics[]
  >([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [comparison, setComparison] = useState<ComparisonReport | null>(null);
  const [_deviceDistribution, setDeviceDistribution] = useState<
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
  const [selectedHeatmapCampaignId, setSelectedHeatmapCampaignId] = useState<
    string | null
  >(null);
  const [allTrackingEvents, setAllTrackingEvents] = useState<TrackingEvent[]>(
    [],
  );

  // Prepare chart data by aggregating by date
  const chartData = useMemo(
    () => buildCampaignChartData(insightsCampaigns),
    [insightsCampaigns],
  );

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
      setAllTrackingEvents(events);

      // If there's a recent campaign, show its heatmap and select it
      if (transformed.length > 0) {
        setSelectedHeatmapCampaignId(transformed[0].id);
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
      <PageShell>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </PageShell>
    );
  }

  if (!historyData || historyData.totalCampaigns === 0) {
    return (
      <PageShell>
        <EmptyState
          icon={<History className="w-8 h-8" />}
          title="No Emails Sent Yet"
          description="Start sending campaigns to see your email history and performance insights here."
          action={
            <Button asChild>
              <Link href="/compose">
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  return (
    <>
      <PageShell>
        <PageHeader
          title="Insights & History"
          description="Track your campaign performance and delivery metrics"
          actions={
            <InsightsExportActions
              isExporting={isExporting}
              onExportCSV={handleExportCSV}
              onExportPDF={handleExportPDF}
            />
          }
        />

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4 md:space-y-6"
        >
          <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 hide-scrollbar">
            <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 h-10 p-1 bg-muted/30">
              <TabsTrigger value="overview" className="rounded-md">
                Overview
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="rounded-md">
                Campaigns
              </TabsTrigger>
              <TabsTrigger value="performance" className="rounded-md">
                Performance
              </TabsTrigger>
              <TabsTrigger value="heatmap" className="rounded-md">
                Heatmap
              </TabsTrigger>
              <TabsTrigger value="recipients" className="rounded-md">
                Recipients
              </TabsTrigger>
              <TabsTrigger value="tracking" className="rounded-md">
                Raw Events
              </TabsTrigger>
            </TabsList>
          </div>

          {/* SHARED CAMPAIGN SELECTOR FOR ANALYTICS TABS */}
          {["performance", "heatmap", "recipients", "tracking"].includes(
            activeTab,
          ) && (
            <CampaignSelector
              campaigns={historyData?.recentCampaigns || []}
              allTrackingEvents={allTrackingEvents}
              selectedCampaignId={selectedHeatmapCampaignId}
              onSelectCampaign={(campaignId, heatmapData) => {
                setSelectedHeatmapCampaignId(campaignId);
                setHeatmap(heatmapData);
              }}
            />
          )}

          <TabsContent value="overview" className="space-y-8">
            <InsightsSummaryCards
              historyData={historyData}
              summary={summary}
              comparison={comparison}
            />

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
                campaigns={insightsCampaigns.slice(0, 3)}
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

            <div className="mt-8">
              <GlobalLeaderboard events={allTrackingEvents} limit={3} />
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

          <TabsContent value="tracking" className="space-y-6">
            {!selectedHeatmapCampaignId ? (
              <div className="border border-border/50 rounded-xl bg-card p-12 flex flex-col items-center justify-center text-center text-muted-foreground shadow-sm">
                <History className="h-10 w-10 mb-4 opacity-40 text-[var(--color-chart-1)]" />
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  No Campaign Selected
                </h3>
                <p className="max-w-sm text-sm">
                  Select a campaign from the selector above to view its
                  chronological raw event log.
                </p>
              </div>
            ) : (
              <div className="border border-border/50 rounded-xl bg-card shadow-sm flex flex-col">
                <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                      <History className="h-5 w-5 text-[var(--color-chart-1)]" />
                      Raw Event Stream
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Real-time chronological log of all interactions.
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="font-medium bg-background border shadow-xs px-3 py-1"
                  >
                    {
                      allTrackingEvents.filter(
                        (e) => e.campaign_id === selectedHeatmapCampaignId,
                      ).length
                    }{" "}
                    events
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b">
                      <tr>
                        <th className="px-6 py-4">Time (Local)</th>
                        <th className="px-6 py-4">Event</th>
                        <th className="px-6 py-4">Recipient</th>
                        <th className="px-6 py-4">Context (Link / Tech)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(() => {
                        const events = allTrackingEvents
                          .filter(
                            (e) => e.campaign_id === selectedHeatmapCampaignId,
                          )
                          .sort(
                            (a, b) =>
                              new Date(b.created_at).getTime() -
                              new Date(a.created_at).getTime(),
                          );

                        if (events.length === 0) {
                          return (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-6 py-16 text-center text-muted-foreground"
                              >
                                <History className="h-8 w-8 mx-auto mb-3 opacity-20" />
                                No tracking events recorded yet.
                              </td>
                            </tr>
                          );
                        }

                        return events.map((e) => (
                          <tr
                            key={e.$id}
                            className="hover:bg-muted/30 transition-colors group"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-muted-foreground text-[13px] font-medium">
                              {formatDate(e.created_at)}
                              <span className="text-[11px] opacity-70 ml-2 font-mono">
                                {new Date(e.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-[10px] uppercase font-bold tracking-wider rounded-md border",
                                  e.event_type === "open" &&
                                    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
                                  e.event_type === "click" &&
                                    "bg-[var(--color-chart-1)]/10 text-[var(--color-chart-1)] border-[var(--color-chart-1)]/20",
                                )}
                              >
                                {e.event_type}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 font-medium text-foreground">
                              {e.email}
                            </td>
                            <td className="px-6 py-4 text-[13px] text-muted-foreground">
                              {e.event_type === "click" && e.link_url ? (
                                <a
                                  href={e.link_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center gap-1.5 w-fit max-w-[350px] truncate"
                                  title={e.link_url}
                                >
                                  <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-50" />
                                  <span className="truncate">{e.link_url}</span>
                                </a>
                              ) : (
                                <div
                                  className="flex items-center gap-2 opacity-80"
                                  title={e.user_agent || "Unknown device"}
                                >
                                  <span className="truncate max-w-[150px]">
                                    {e.user_agent
                                      ? e.user_agent.split(" ")[0]
                                      : "Unknown device"}
                                  </span>
                                  <span className="text-border text-[10px]">
                                    •
                                  </span>
                                  <span className="font-mono text-[11px]">
                                    {e.ip_address || "Unknown IP"}
                                  </span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            {!selectedHeatmapCampaignId ? (
              <div className="border border-border/50 rounded-xl bg-card p-12 flex flex-col items-center justify-center text-center text-muted-foreground shadow-sm">
                <BarChart3 className="h-10 w-10 mb-4 opacity-40 text-primary" />
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  No Campaign Selected
                </h3>
                <p className="max-w-sm text-sm">
                  Select a campaign above to view its delivery funnel and link
                  performance.
                </p>
              </div>
            ) : (
              <div className="space-y-6 max-w-5xl mx-auto">
                {(() => {
                  const campaign = historyData?.recentCampaigns?.find(
                    (c) => c.$id === selectedHeatmapCampaignId,
                  );
                  const events = allTrackingEvents.filter(
                    (e) => e.campaign_id === selectedHeatmapCampaignId,
                  );
                  const sent = campaign?.sent || 0;

                  const openedEmails = new Set(
                    events
                      .filter((e) => e.event_type === "open")
                      .map((e) => e.email),
                  );

                  if (sent === 0) {
                    return (
                      <div className="rounded-xl border bg-card p-6 flex flex-col items-center justify-center min-h-[290px] text-muted-foreground text-sm">
                        <History className="h-8 w-8 mb-2 opacity-30" />
                        No tracking data available (0 sent)
                      </div>
                    );
                  }

                  return (
                    <>
                      <CampaignFunnelWidget sent={sent} events={events} />
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                        <DeviceBreakdownChart events={events} />
                        <LinkPerformanceTable
                          events={events}
                          uniqueOpens={openedEmails.size}
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </TabsContent>

          <TabsContent value="heatmap" className="space-y-6">
            {!selectedHeatmapCampaignId ? (
              <div className="border border-border/50 rounded-xl bg-card p-12 flex flex-col items-center justify-center text-center text-muted-foreground shadow-sm">
                <BarChart3 className="h-10 w-10 mb-4 opacity-40 text-primary" />
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  No Campaign Selected
                </h3>
                <p className="max-w-sm text-sm">
                  Select a campaign from the selector above to view its
                  send-time heatmap.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-foreground">
                  Send-Time Heatmap
                </h2>
                {heatmap && heatmap.links && heatmap.links.length > 0 ? (
                  <HeatmapWidget
                    links={heatmap.links}
                    totalClicks={heatmap.totalClicks}
                    title="When do your recipients open emails?"
                  />
                ) : (
                  <div className="border border-border/50 rounded-xl bg-card p-12 flex flex-col items-center justify-center text-center text-muted-foreground shadow-sm mt-4">
                    <MousePointer2 className="h-10 w-10 mb-4 opacity-40" />
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      Not enough open or click data
                    </h3>
                    <p className="max-w-sm text-sm">
                      This campaign hasn't generated enough tracking events to
                      display a heatmap yet.
                    </p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="recipients" className="space-y-6">
            {!selectedHeatmapCampaignId ? (
              <div className="border border-border/50 rounded-xl bg-card p-12 flex flex-col items-center justify-center text-center text-muted-foreground shadow-sm">
                <Users className="h-10 w-10 mb-4 opacity-40 text-primary" />
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  No Campaign Selected
                </h3>
                <p className="max-w-sm text-sm">
                  Select a campaign from the selector above to view its
                  recipient leaderboard.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Recipients Leaderboard
                  </h2>
                </div>

                <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
                  <div className="p-4 border-b flex flex-col md:flex-row justify-between items-center bg-muted/10 gap-3">
                    <div className="flex gap-2 w-full md:w-auto">
                      <Input
                        placeholder="Search recipients…"
                        value={recipientSearch}
                        onChange={(e) => setRecipientSearch(e.target.value)}
                        className="max-w-xs h-9 bg-background shadow-xs focus-visible:ring-primary/40"
                      />
                    </div>
                  </div>
                  <div className="divide-y divide-border overflow-x-auto min-h-[300px]">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/30 text-xs uppercase text-muted-foreground whitespace-nowrap">
                        <tr>
                          <th className="px-6 py-3 font-medium">Recipient</th>
                          <th className="px-6 py-3 font-medium">Status</th>
                          <th className="px-6 py-3 font-medium">Clicks</th>
                          <th className="px-6 py-3 font-medium text-right">
                            Last Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {/* Filter by selected campaign only */}
                        {(() => {
                          const recs: Record<
                            string,
                            { opens: number; clicks: number; lastAction: Date }
                          > = {};
                          allTrackingEvents
                            .filter(
                              (e) =>
                                e.campaign_id === selectedHeatmapCampaignId,
                            )
                            .forEach((e) => {
                              if (e.email) {
                                if (!recs[e.email]) {
                                  recs[e.email] = {
                                    opens: 0,
                                    clicks: 0,
                                    lastAction: new Date(0),
                                  };
                                }
                                if (e.event_type === "open") {
                                  recs[e.email].opens++;
                                }
                                if (e.event_type === "click") {
                                  recs[e.email].clicks++;
                                }

                                const t = new Date(e.created_at);
                                if (t > recs[e.email].lastAction) {
                                  recs[e.email].lastAction = t;
                                }
                              }
                            });

                          const entries = Object.entries(recs)
                            .filter(([email]) =>
                              email
                                .toLowerCase()
                                .includes(recipientSearch.toLowerCase()),
                            )
                            .sort(
                              (a, b) =>
                                b[1].lastAction.getTime() -
                                a[1].lastAction.getTime(),
                            );

                          if (entries.length === 0) {
                            return (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-6 py-8 text-center text-muted-foreground"
                                >
                                  No recipients found
                                </td>
                              </tr>
                            );
                          }

                          return entries.map(([email, stats]) => (
                            <tr
                              key={email}
                              className="hover:bg-muted/10 transition-colors"
                            >
                              <td className="px-6 py-3 font-medium text-foreground">
                                {email}
                              </td>
                              <td className="px-6 py-3">
                                <Badge
                                  variant={
                                    stats.opens > 0 ? "success" : "secondary"
                                  }
                                  className="font-normal capitalize text-xs"
                                >
                                  {stats.opens > 0 ? "Opened" : "Not Opened"}
                                </Badge>
                              </td>
                              <td className="px-6 py-3 text-muted-foreground">
                                {stats.clicks} clicks
                              </td>
                              <td className="px-6 py-3 text-right whitespace-nowrap text-muted-foreground">
                                {stats.lastAction.getTime() > 0
                                  ? formatDate(stats.lastAction.toISOString())
                                  : "Never"}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </PageShell>

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
              <div className="bg-muted/40 rounded-xl p-5 space-y-4 border border-border/70">
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
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        Email Clients
                      </h4>
                      {campaignStats.emailClients &&
                      campaignStats.emailClients.length > 0 &&
                      campaignStats.emailClients.some(
                        (c: any) => c.value > 0,
                      ) ? (
                        <PieChartWidget
                          title=""
                          data={campaignStats.emailClients}
                          size="small"
                          showLabels={false}
                          className="border-0 shadow-none p-0 bg-transparent"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
                          No email client data yet
                        </div>
                      )}
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
                                  <div className="text-xs text-muted-foreground">
                                    {formatEmailSendErrorForUser(result.error)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Badge
                              variant={sendResultBadgeVariant(result.status)}
                            >
                              {formatSendResultLabel(result.status)}
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
    </>
  );
}
