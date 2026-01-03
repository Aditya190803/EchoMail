/**
 * Type definitions for Appwrite documents
 * These types extend Appwrite's Models.Document with specific fields
 */

import type { Models } from "appwrite";

/**
 * Base document type with Appwrite system fields
 */
export interface AppwriteDocument extends Models.Document {
  user_email: string;
}

/**
 * A/B Test document
 */
export interface ABTestDocument extends AppwriteDocument {
  name: string;
  status: "draft" | "running" | "completed" | "cancelled";
  test_type: "subject" | "content" | "both";
  variant_a_subject?: string;
  variant_a_content?: string;
  variant_b_subject?: string;
  variant_b_content?: string;
  variant_a_recipients: string | string[];
  variant_b_recipients: string | string[];
  variant_a_sent: number;
  variant_b_sent: number;
  variant_a_opens: number;
  variant_b_opens: number;
  variant_a_clicks: number;
  variant_b_clicks: number;
  winner?: "a" | "b" | null;
  created_at: string;
  completed_at?: string;
}

/**
 * Campaign document
 */
export interface CampaignDocument extends AppwriteDocument {
  name: string;
  subject: string;
  content?: string;
  status:
    | "draft"
    | "scheduled"
    | "sending"
    | "completed"
    | "failed"
    | "cancelled";
  recipients_count: number;
  sent_count: number;
  failed_count: number;
  open_rate?: number;
  click_rate?: number;
  bounce_rate?: number;
  template_id?: string;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  tags?: string[];
}

/**
 * Contact Group document
 */
export interface ContactGroupDocument extends AppwriteDocument {
  name: string;
  description?: string;
  contact_count: number;
  created_at: string;
  updated_at?: string;
}

/**
 * Contact document
 */
export interface ContactDocument extends AppwriteDocument {
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  company?: string;
  phone?: string;
  tags?: string[];
  groups?: string[];
  custom_fields?: Record<string, string>;
  subscribed: boolean;
  bounced: boolean;
  created_at: string;
  updated_at?: string;
  last_contacted?: string;
}

/**
 * Draft document
 */
export interface DraftDocument extends AppwriteDocument {
  name: string;
  subject: string;
  content: string;
  recipients?: string;
  attachments?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Template document
 */
export interface TemplateDocument extends AppwriteDocument {
  name: string;
  subject: string;
  content: string;
  category?: string;
  description?: string;
  is_default?: boolean;
  created_at: string;
  updated_at?: string;
}

/**
 * Signature document
 */
export interface SignatureDocument extends AppwriteDocument {
  name: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at?: string;
}

/**
 * Email history/log document
 */
export interface EmailHistoryDocument extends AppwriteDocument {
  campaign_id?: string;
  recipient_email: string;
  subject: string;
  status: "sent" | "delivered" | "opened" | "clicked" | "bounced" | "failed";
  error_message?: string;
  sent_at: string;
  opened_at?: string;
  clicked_at?: string;
  bounced_at?: string;
  metadata?: string;
}

/**
 * Webhook document
 */
export interface WebhookDocument extends AppwriteDocument {
  name: string;
  url: string;
  secret?: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  last_triggered?: string;
  failure_count: number;
}

/**
 * Unsubscribe document
 */
export interface UnsubscribeDocument extends AppwriteDocument {
  email: string;
  reason?: string;
  campaign_id?: string;
  unsubscribed_at: string;
}

/**
 * Team member document
 */
export interface TeamMemberDocument extends AppwriteDocument {
  member_email: string;
  role: "owner" | "admin" | "member" | "viewer";
  invited_by: string;
  invited_at: string;
  accepted_at?: string;
  status: "pending" | "active" | "revoked";
}

/**
 * Audit log document
 */
export interface AuditLogDocument extends AppwriteDocument {
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

/**
 * Analytics data document
 */
export interface AnalyticsDocument extends AppwriteDocument {
  date: string;
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  emails_bounced: number;
  emails_failed: number;
  unique_opens: number;
  unique_clicks: number;
}

/**
 * Type helper for casting Appwrite documents
 */
export function asDocument<T extends AppwriteDocument>(
  doc: Models.Document,
): T {
  return doc as T;
}

/**
 * Type helper for casting Appwrite document arrays
 */
export function asDocuments<T extends AppwriteDocument>(
  docs: Models.Document[],
): T[] {
  return docs as T[];
}
