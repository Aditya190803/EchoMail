/**
 * Email Bounce Handler
 *
 * Tracks and manages email bounces, soft/hard bounce categorization,
 * and automatic list cleaning for better deliverability.
 */

import { logger } from "./logger";

/**
 * Bounce types
 */
export type BounceType = "hard" | "soft" | "complaint" | "unsubscribe";

/**
 * Bounce reason categories
 */
export type BounceCategory =
  | "invalid_address"
  | "mailbox_full"
  | "server_error"
  | "blocked"
  | "spam_complaint"
  | "policy_violation"
  | "unknown";

/**
 * Bounce record
 */
export interface BounceRecord {
  id: string;
  email: string;
  type: BounceType;
  category: BounceCategory;
  reason: string;
  timestamp: Date;
  campaignId?: string;
  messageId?: string;
  diagnosticCode?: string;
}

/**
 * Email health status
 */
export interface EmailHealthStatus {
  email: string;
  isValid: boolean;
  bounceCount: number;
  lastBounceType?: BounceType;
  lastBounceDate?: Date;
  shouldSuppress: boolean;
  suppressionReason?: string;
}

/**
 * Bounce statistics
 */
export interface BounceStats {
  total: number;
  hard: number;
  soft: number;
  complaints: number;
  unsubscribes: number;
  bounceRate: number;
  suppressedCount: number;
}

/**
 * DSN (Delivery Status Notification) codes
 */
const DSN_CODES: Record<
  string,
  { type: BounceType; category: BounceCategory }
> = {
  // Hard bounces - permanent failures
  "5.1.0": { type: "hard", category: "invalid_address" },
  "5.1.1": { type: "hard", category: "invalid_address" }, // Bad destination mailbox
  "5.1.2": { type: "hard", category: "invalid_address" }, // Bad destination system
  "5.1.3": { type: "hard", category: "invalid_address" }, // Bad destination syntax
  "5.1.6": { type: "hard", category: "invalid_address" }, // Mailbox moved

  // Soft bounces - temporary failures
  "4.2.1": { type: "soft", category: "mailbox_full" }, // Mailbox full
  "4.2.2": { type: "soft", category: "mailbox_full" }, // Mailbox limit exceeded
  "4.4.1": { type: "soft", category: "server_error" }, // Connection timed out
  "4.4.2": { type: "soft", category: "server_error" }, // Bad connection
  "4.7.0": { type: "soft", category: "blocked" }, // Temporarily rejected

  // Policy violations
  "5.7.1": { type: "hard", category: "policy_violation" }, // Delivery not authorized
  "5.7.2": { type: "hard", category: "policy_violation" }, // Mailing list expansion prohibited
};

/**
 * In-memory bounce storage (replace with database in production)
 */
const bounceRecords: Map<string, BounceRecord[]> = new Map();
const suppressionList: Set<string> = new Set();

/**
 * Thresholds for suppression
 */
const SUPPRESSION_CONFIG = {
  hardBounceThreshold: 1, // Suppress after 1 hard bounce
  softBounceThreshold: 3, // Suppress after 3 soft bounces
  softBounceWindowDays: 7, // Within this time window
  complaintThreshold: 1, // Suppress after 1 complaint
};

/**
 * Parse bounce notification and categorize
 */
export function parseBounceNotification(notification: {
  email: string;
  bounceType?: string;
  diagnosticCode?: string;
  action?: string;
  campaignId?: string;
  messageId?: string;
}): BounceRecord {
  const { email, bounceType, diagnosticCode, campaignId, messageId } =
    notification;

  // Try to determine type from diagnostic code
  let type: BounceType = "soft";
  let category: BounceCategory = "unknown";

  if (diagnosticCode) {
    // Extract DSN code (e.g., "5.1.1" from "550 5.1.1 User unknown")
    const dsnMatch = diagnosticCode.match(/([45])\.\d+\.\d+/);
    if (dsnMatch) {
      const dsnCode = dsnMatch[0];
      const mapping = DSN_CODES[dsnCode];
      if (mapping) {
        type = mapping.type;
        category = mapping.category;
      } else if (dsnCode.startsWith("5")) {
        type = "hard";
      }
    }
  }

  // Override from explicit bounce type
  if (bounceType) {
    if (
      bounceType.toLowerCase().includes("permanent") ||
      bounceType.toLowerCase().includes("hard")
    ) {
      type = "hard";
    } else if (bounceType.toLowerCase().includes("complaint")) {
      type = "complaint";
      category = "spam_complaint";
    } else if (bounceType.toLowerCase().includes("unsubscribe")) {
      type = "unsubscribe";
    }
  }

  const record: BounceRecord = {
    id: generateBounceId(),
    email: email.toLowerCase(),
    type,
    category,
    reason: diagnosticCode || `${type} bounce`,
    timestamp: new Date(),
    campaignId,
    messageId,
    diagnosticCode,
  };

  return record;
}

/**
 * Record a bounce and update suppression list
 */
export function recordBounce(bounce: BounceRecord): EmailHealthStatus {
  const email = bounce.email.toLowerCase();

  // Add to records
  if (!bounceRecords.has(email)) {
    bounceRecords.set(email, []);
  }
  bounceRecords.get(email)!.push(bounce);

  logger.warn("Bounce recorded", {
    email,
    type: bounce.type,
    category: bounce.category,
  });

  // Check if should suppress
  const healthStatus = getEmailHealthStatus(email);

  if (healthStatus.shouldSuppress && !suppressionList.has(email)) {
    suppressionList.add(email);
    logger.info("Email suppressed", {
      email,
      reason: healthStatus.suppressionReason,
    });
  }

  return healthStatus;
}

/**
 * Get health status for an email address
 */
export function getEmailHealthStatus(email: string): EmailHealthStatus {
  const normalizedEmail = email.toLowerCase();
  const records = bounceRecords.get(normalizedEmail) || [];

  const status: EmailHealthStatus = {
    email: normalizedEmail,
    isValid: true,
    bounceCount: records.length,
    shouldSuppress: false,
  };

  if (records.length === 0) {
    return status;
  }

  // Get latest bounce
  const latestBounce = records[records.length - 1];
  status.lastBounceType = latestBounce.type;
  status.lastBounceDate = latestBounce.timestamp;

  // Check for hard bounces
  const hardBounces = records.filter((r) => r.type === "hard");
  if (hardBounces.length >= SUPPRESSION_CONFIG.hardBounceThreshold) {
    status.isValid = false;
    status.shouldSuppress = true;
    status.suppressionReason = `Hard bounce detected: ${hardBounces[0].reason}`;
    return status;
  }

  // Check for complaints
  const complaints = records.filter((r) => r.type === "complaint");
  if (complaints.length >= SUPPRESSION_CONFIG.complaintThreshold) {
    status.shouldSuppress = true;
    status.suppressionReason = "Spam complaint received";
    return status;
  }

  // Check for soft bounces within window
  const windowStart = new Date();
  windowStart.setDate(
    windowStart.getDate() - SUPPRESSION_CONFIG.softBounceWindowDays,
  );

  const recentSoftBounces = records.filter(
    (r) => r.type === "soft" && r.timestamp >= windowStart,
  );

  if (recentSoftBounces.length >= SUPPRESSION_CONFIG.softBounceThreshold) {
    status.shouldSuppress = true;
    status.suppressionReason = `${recentSoftBounces.length} soft bounces in ${SUPPRESSION_CONFIG.softBounceWindowDays} days`;
  }

  // Check suppression list
  if (suppressionList.has(normalizedEmail)) {
    status.shouldSuppress = true;
    status.suppressionReason =
      status.suppressionReason || "On suppression list";
  }

  return status;
}

/**
 * Check if email is suppressed
 */
export function isEmailSuppressed(email: string): boolean {
  return suppressionList.has(email.toLowerCase());
}

/**
 * Filter out suppressed emails from a list
 */
export function filterSuppressedEmails(emails: string[]): {
  valid: string[];
  suppressed: string[];
} {
  const valid: string[] = [];
  const suppressed: string[] = [];

  for (const email of emails) {
    if (isEmailSuppressed(email)) {
      suppressed.push(email);
    } else {
      valid.push(email);
    }
  }

  return { valid, suppressed };
}

/**
 * Get bounce statistics
 */
export function getBounceStats(campaignId?: string): BounceStats {
  const allRecords: BounceRecord[] = [];

  bounceRecords.forEach((records) => {
    if (campaignId) {
      allRecords.push(...records.filter((r) => r.campaignId === campaignId));
    } else {
      allRecords.push(...records);
    }
  });

  const stats: BounceStats = {
    total: allRecords.length,
    hard: allRecords.filter((r) => r.type === "hard").length,
    soft: allRecords.filter((r) => r.type === "soft").length,
    complaints: allRecords.filter((r) => r.type === "complaint").length,
    unsubscribes: allRecords.filter((r) => r.type === "unsubscribe").length,
    bounceRate: 0,
    suppressedCount: suppressionList.size,
  };

  return stats;
}

/**
 * Calculate bounce rate for a campaign
 */
export function calculateBounceRate(
  totalSent: number,
  campaignId?: string,
): number {
  if (totalSent === 0) {
    return 0;
  }

  const stats = getBounceStats(campaignId);
  return (stats.total / totalSent) * 100;
}

/**
 * Remove email from suppression list (for re-verification)
 */
export function unsuppressEmail(email: string): boolean {
  const normalizedEmail = email.toLowerCase();

  if (suppressionList.has(normalizedEmail)) {
    suppressionList.delete(normalizedEmail);
    logger.info("Email unsuppressed", { email: normalizedEmail });
    return true;
  }

  return false;
}

/**
 * Export suppression list
 */
export function exportSuppressionList(): string[] {
  return Array.from(suppressionList);
}

/**
 * Import suppression list
 */
export function importSuppressionList(emails: string[]): number {
  let imported = 0;

  for (const email of emails) {
    const normalized = email.toLowerCase().trim();
    if (normalized && !suppressionList.has(normalized)) {
      suppressionList.add(normalized);
      imported++;
    }
  }

  logger.info("Suppression list imported", { count: imported });
  return imported;
}

/**
 * Clean bounced emails from contact list
 */
export function cleanContactList(contacts: { id: string; email: string }[]): {
  clean: { id: string; email: string }[];
  bounced: { id: string; email: string; status: EmailHealthStatus }[];
} {
  const clean: { id: string; email: string }[] = [];
  const bounced: { id: string; email: string; status: EmailHealthStatus }[] =
    [];

  for (const contact of contacts) {
    const status = getEmailHealthStatus(contact.email);

    if (status.shouldSuppress) {
      bounced.push({ ...contact, status });
    } else {
      clean.push(contact);
    }
  }

  return { clean, bounced };
}

/**
 * Generate unique bounce ID
 */
function generateBounceId(): string {
  return `bounce_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Webhook handler for bounce notifications (e.g., from SendGrid, SES)
 */
export function handleBounceWebhook(
  payload: unknown,
  provider: "sendgrid" | "ses" | "gmail",
): BounceRecord | null {
  try {
    let notification: {
      email: string;
      bounceType?: string;
      diagnosticCode?: string;
      campaignId?: string;
      messageId?: string;
    };

    // Parse based on provider format
    switch (provider) {
      case "sendgrid":
        // SendGrid event webhook format
        const sgPayload = payload as {
          email: string;
          event: string;
          reason?: string;
          sg_message_id?: string;
        };
        notification = {
          email: sgPayload.email,
          bounceType: sgPayload.event,
          diagnosticCode: sgPayload.reason,
          messageId: sgPayload.sg_message_id,
        };
        break;

      case "ses":
        // AWS SES notification format
        const sesPayload = payload as {
          bounce?: {
            bounceType: string;
            bouncedRecipients: {
              emailAddress: string;
              diagnosticCode?: string;
            }[];
          };
          mail?: { messageId: string };
        };
        if (!sesPayload.bounce) {
          return null;
        }
        notification = {
          email: sesPayload.bounce.bouncedRecipients[0]?.emailAddress || "",
          bounceType: sesPayload.bounce.bounceType,
          diagnosticCode:
            sesPayload.bounce.bouncedRecipients[0]?.diagnosticCode,
          messageId: sesPayload.mail?.messageId,
        };
        break;

      case "gmail":
        // Gmail DSN format (simplified)
        const gmailPayload = payload as {
          email: string;
          status?: string;
          diagnostic?: string;
        };
        notification = {
          email: gmailPayload.email,
          diagnosticCode: gmailPayload.diagnostic || gmailPayload.status,
        };
        break;

      default:
        return null;
    }

    if (!notification.email) {
      logger.warn("Bounce webhook missing email", { provider, payload });
      return null;
    }

    const bounce = parseBounceNotification(notification);
    recordBounce(bounce);

    return bounce;
  } catch (error) {
    logger.error("Error processing bounce webhook", { provider, error });
    return null;
  }
}
