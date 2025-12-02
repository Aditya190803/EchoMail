/**
 * Email Service
 *
 * A centralized service class for handling all email-related operations.
 * This extracts email sending logic from API routes and components into
 * a single, testable, and reusable service.
 *
 * @module services/email-service
 * @see {@link /docs/ADR/002-email-service-extraction.md} for architecture decision
 */

import {
  sendEmailViaAPI,
  replacePlaceholders,
  preResolveAttachments,
  clearAttachmentCache,
  preBuildEmailTemplate,
  sendEmailWithTemplate,
  type AttachmentData,
} from "@/lib/gmail";
import { emailLogger } from "@/lib/logger";

/**
 * Email recipient with personalization data
 */
export interface EmailRecipient {
  /** Email address of the recipient */
  email: string;
  /** Name of the recipient for personalization */
  name?: string;
  /** Additional custom fields for personalization */
  customFields?: Record<string, string>;
}

/**
 * Email content configuration
 */
export interface EmailContent {
  /** Email subject line (supports {{placeholders}}) */
  subject: string;
  /** HTML body of the email (supports {{placeholders}}) */
  body: string;
  /** Optional email signature to append */
  signature?: string;
}

/**
 * Email sending options
 */
export interface SendOptions {
  /** Array of file attachments */
  attachments?: AttachmentData[];
  /** Delay between emails in milliseconds (default: 1000) */
  delayBetweenEmails?: number;
  /** Whether to use bulk optimization for identical content */
  useBulkOptimization?: boolean;
  /** Callback for progress updates */
  onProgress?: (sent: number, total: number, currentEmail: string) => void;
  /** Callback for individual email results */
  onEmailResult?: (email: string, success: boolean, error?: string) => void;
}

/**
 * Result of a single email send operation
 */
export interface EmailResult {
  email: string;
  status: "success" | "error" | "skipped";
  error?: string;
  messageId?: string;
}

/**
 * Summary of a campaign send operation
 */
export interface CampaignSummary {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  results: EmailResult[];
}

/**
 * Personalized email ready for sending
 */
export interface PersonalizedEmail {
  to: string;
  subject: string;
  message: string;
  originalRowData: Record<string, string>;
  attachments?: AttachmentData[];
  personalizedAttachment?: {
    url: string;
    fileName?: string;
  };
}

/**
 * EmailService - Centralized email operations handler
 *
 * This service encapsulates all email sending logic including:
 * - Single email sending
 * - Bulk email campaigns
 * - Personalization with placeholders
 * - Attachment handling
 * - Rate limiting and retry logic
 *
 * @example
 * ```typescript
 * const emailService = new EmailService(accessToken);
 *
 * // Send a single email
 * await emailService.sendSingle({
 *   email: 'user@example.com',
 *   name: 'John'
 * }, {
 *   subject: 'Hello {{name}}!',
 *   body: '<p>Welcome, {{name}}!</p>'
 * });
 *
 * // Send bulk campaign
 * const results = await emailService.sendCampaign(recipients, content, {
 *   onProgress: (sent, total) => console.log(`${sent}/${total} sent`)
 * });
 * ```
 */
export class EmailService {
  private accessToken: string;
  private defaultDelayMs: number = 1000;

  /**
   * Create a new EmailService instance
   * @param accessToken - Gmail API OAuth access token
   */
  constructor(accessToken: string) {
    if (!accessToken) {
      throw new Error("Access token is required for EmailService");
    }
    this.accessToken = accessToken;
  }

  /**
   * Update the access token (e.g., after refresh)
   * @param newToken - New OAuth access token
   */
  updateAccessToken(newToken: string): void {
    this.accessToken = newToken;
  }

  /**
   * Send a single email with personalization
   *
   * @param recipient - Email recipient with optional personalization data
   * @param content - Email content (subject, body, signature)
   * @param attachments - Optional file attachments
   * @returns Result of the send operation
   */
  async sendSingle(
    recipient: EmailRecipient,
    content: EmailContent,
    attachments?: AttachmentData[],
  ): Promise<EmailResult> {
    try {
      // Build personalization data from recipient
      const personalizationData: Record<string, string> = {
        email: recipient.email,
        name: recipient.name || "",
        ...recipient.customFields,
      };

      // Apply personalization to subject and body
      const personalizedSubject = replacePlaceholders(
        content.subject,
        personalizationData,
      );
      let personalizedBody = replacePlaceholders(
        content.body,
        personalizationData,
      );

      // Append signature if provided
      if (content.signature) {
        personalizedBody = `${personalizedBody}<br/><br/>${content.signature}`;
      }

      // Pre-resolve attachments if needed
      const resolvedAttachments = attachments
        ? await preResolveAttachments(attachments)
        : undefined;

      // Send the email
      const result = await sendEmailViaAPI(
        this.accessToken,
        recipient.email,
        personalizedSubject,
        personalizedBody,
        resolvedAttachments,
      );

      emailLogger.info("Single email sent successfully", {
        to: recipient.email,
        messageId: result.id,
      });

      return {
        email: recipient.email,
        status: "success",
        messageId: result.id,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      emailLogger.error(
        "Failed to send single email",
        undefined,
        error instanceof Error ? error : undefined,
      );

      return {
        email: recipient.email,
        status: "error",
        error: errorMessage,
      };
    }
  }

  /**
   * Send a bulk email campaign with optimization
   *
   * For campaigns with identical content (no personalization), uses template
   * caching for significantly faster sending. For personalized content,
   * processes each email individually with placeholder replacement.
   *
   * @param recipients - Array of email recipients
   * @param content - Email content configuration
   * @param options - Sending options (attachments, callbacks, etc.)
   * @returns Campaign summary with all results
   */
  async sendCampaign(
    recipients: EmailRecipient[],
    content: EmailContent,
    options: SendOptions = {},
  ): Promise<CampaignSummary> {
    const {
      attachments = [],
      delayBetweenEmails = this.defaultDelayMs,
      useBulkOptimization = true,
      onProgress,
      onEmailResult,
    } = options;

    const results: EmailResult[] = [];
    const total = recipients.length;

    emailLogger.info("Starting email campaign", {
      recipientCount: total,
      hasAttachments: attachments.length > 0,
      useBulkOptimization,
    });

    try {
      // Pre-resolve attachments once for all emails
      const resolvedAttachments =
        attachments.length > 0 ? await preResolveAttachments(attachments) : [];

      // Check if we can use bulk optimization
      // (all emails have same subject/body with no placeholders)
      const hasPlaceholders =
        content.subject.includes("{{") || content.body.includes("{{");

      const canUseBulkOptimization = useBulkOptimization && !hasPlaceholders;

      if (canUseBulkOptimization) {
        // Use template-based bulk sending for maximum efficiency
        await this.sendBulkWithTemplate(
          recipients,
          content,
          resolvedAttachments,
          delayBetweenEmails,
          results,
          onProgress,
          onEmailResult,
        );
      } else {
        // Use individual sending for personalized content
        await this.sendBulkPersonalized(
          recipients,
          content,
          resolvedAttachments,
          delayBetweenEmails,
          results,
          onProgress,
          onEmailResult,
        );
      }
    } finally {
      // Always clear cache after campaign
      clearAttachmentCache();
    }

    // Calculate summary
    const summary: CampaignSummary = {
      total,
      sent: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "error").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      results,
    };

    emailLogger.info("Campaign completed", {
      total: summary.total,
      sent: summary.sent,
      failed: summary.failed,
      skipped: summary.skipped,
    });

    return summary;
  }

  /**
   * Internal: Send bulk emails using pre-built template (fastest)
   */
  private async sendBulkWithTemplate(
    recipients: EmailRecipient[],
    content: EmailContent,
    attachments: AttachmentData[],
    delayMs: number,
    results: EmailResult[],
    onProgress?: (sent: number, total: number, email: string) => void,
    onEmailResult?: (email: string, success: boolean, error?: string) => void,
  ): Promise<void> {
    // Build body with signature
    let body = content.body;
    if (content.signature) {
      body = `${body}<br/><br/>${content.signature}`;
    }

    // Pre-build template once
    await preBuildEmailTemplate(
      this.accessToken,
      content.subject,
      body,
      attachments,
    );

    // Send to each recipient
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];

      try {
        await sendEmailWithTemplate(this.accessToken, recipient.email);

        results.push({
          email: recipient.email,
          status: "success",
        });
        onEmailResult?.(recipient.email, true);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        results.push({
          email: recipient.email,
          status: "error",
          error: errorMessage,
        });
        onEmailResult?.(recipient.email, false, errorMessage);
      }

      onProgress?.(i + 1, recipients.length, recipient.email);

      // Delay between emails (except last)
      if (i < recipients.length - 1) {
        await this.delay(delayMs);
      }
    }
  }

  /**
   * Internal: Send bulk emails with personalization (slower but customized)
   */
  private async sendBulkPersonalized(
    recipients: EmailRecipient[],
    content: EmailContent,
    attachments: AttachmentData[],
    delayMs: number,
    results: EmailResult[],
    onProgress?: (sent: number, total: number, email: string) => void,
    onEmailResult?: (email: string, success: boolean, error?: string) => void,
  ): Promise<void> {
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];

      const result = await this.sendSingle(recipient, content, attachments);
      results.push(result);

      onEmailResult?.(
        recipient.email,
        result.status === "success",
        result.error,
      );
      onProgress?.(i + 1, recipients.length, recipient.email);

      // Delay between emails (except last)
      if (i < recipients.length - 1) {
        await this.delay(delayMs);
      }
    }
  }

  /**
   * Validate an email address format
   * @param email - Email address to validate
   * @returns True if valid, false otherwise
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim().toLowerCase());
  }

  /**
   * Filter out invalid email addresses from a list
   * @param emails - Array of email addresses
   * @returns Object with valid and invalid emails
   */
  static filterValidEmails(emails: string[]): {
    valid: string[];
    invalid: string[];
  } {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const email of emails) {
      if (EmailService.validateEmail(email)) {
        valid.push(email.trim().toLowerCase());
      } else {
        invalid.push(email);
      }
    }

    return { valid, invalid };
  }

  /**
   * Utility: delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create an EmailService instance with the given access token
 * Factory function for convenience
 */
export function createEmailService(accessToken: string): EmailService {
  return new EmailService(accessToken);
}

export default EmailService;
