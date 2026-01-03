/**
 * Analytics and reporting type definitions
 */

/**
 * Data for analytics export
 */
export interface AnalyticsExportData {
  campaigns: CampaignAnalytics[];
  summary: AnalyticsSummary;
  dateRange: DateRange;
}

/**
 * Individual campaign analytics data
 */
export interface CampaignAnalytics {
  id: string;
  subject: string;
  status: "completed" | "sending" | "failed";
  recipients: number;
  sent: number;
  failed: number;
  successRate: number;
  campaignType: string;
  createdAt: string;
  opens?: number;
  clicks?: number;
  openRate?: number;
  clickRate?: number;
}

/**
 * Overall analytics summary
 */
export interface AnalyticsSummary {
  totalCampaigns: number;
  totalRecipients: number;
  totalSent: number;
  totalFailed: number;
  overallSuccessRate: number;
  averageRecipientsPerCampaign: number;
  totalOpens?: number;
  totalClicks?: number;
  averageOpenRate?: number;
  averageClickRate?: number;
}

/**
 * Date range for analytics queries
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Comparison period types
 */
export type ComparisonPeriod = "week" | "month" | "campaign";

/**
 * Comparison report data
 */
export interface ComparisonReport {
  period: ComparisonPeriod;
  current: PeriodMetrics;
  previous: PeriodMetrics;
  changes: MetricChanges;
}

/**
 * Metrics for a specific period
 */
export interface PeriodMetrics {
  label: string;
  startDate: string;
  endDate: string;
  campaigns: number;
  sent: number;
  failed: number;
  successRate: number;
  opens?: number;
  clicks?: number;
  openRate?: number;
  clickRate?: number;
}

/**
 * Changes between periods
 */
export interface MetricChanges {
  campaigns: ChangeValue;
  sent: ChangeValue;
  successRate: ChangeValue;
  opens?: ChangeValue;
  clicks?: ChangeValue;
  openRate?: ChangeValue;
  clickRate?: ChangeValue;
}

/**
 * Value change with direction
 */
export interface ChangeValue {
  value: number;
  percentage: number;
  direction: "up" | "down" | "same";
}

/**
 * Email click heatmap data
 */
export interface ClickHeatmapData {
  campaignId: string;
  links: LinkClickData[];
  totalClicks: number;
}

/**
 * Individual link click data for heatmap
 */
export interface LinkClickData {
  url: string;
  displayText?: string;
  clicks: number;
  uniqueClicks: number;
  percentage: number;
  position?: { x: number; y: number };
}

/**
 * Tracking event from database
 */
export interface TrackingEvent {
  $id: string;
  campaign_id: string;
  email: string;
  event_type: "open" | "click";
  link_url?: string;
  user_agent?: string;
  ip_address?: string;
  user_email: string;
  created_at: string;
}

/**
 * Dashboard widget configuration
 */
export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  size: WidgetSize;
  position: { row: number; col: number };
  config?: WidgetConfig;
}

/**
 * Available widget types
 */
export type WidgetType =
  | "stats-card"
  | "line-chart"
  | "bar-chart"
  | "pie-chart"
  | "comparison"
  | "heatmap"
  | "recent-campaigns"
  | "quick-actions";

/**
 * Widget size options
 */
export type WidgetSize = "small" | "medium" | "large" | "full";

/**
 * Widget configuration options
 */
export interface WidgetConfig {
  metric?: string;
  dateRange?: DateRange;
  limit?: number;
  showTrend?: boolean;
  chartColor?: string;
}

/**
 * GA4 event configuration
 */
export interface GA4Event {
  name: string;
  params?: Record<string, string | number | boolean>;
}

/**
 * GA4 configuration
 */
export interface GA4Config {
  measurementId: string;
  enabled: boolean;
}

/**
 * PDF export options
 */
export interface PDFExportOptions {
  title?: string;
  includeCharts?: boolean;
  includeSummary?: boolean;
  includeDetailedList?: boolean;
  dateRange?: DateRange;
  branding?: {
    logo?: string;
    companyName?: string;
    primaryColor?: string;
  };
}

/**
 * CSV export options
 */
export interface CSVExportOptions {
  includeSummary?: boolean;
  includeHeaders?: boolean;
  delimiter?: "," | ";" | "\t";
  dateFormat?: string;
}
