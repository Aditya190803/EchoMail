/**
 * Email Provider Abstraction
 *
 * Provides a unified interface for multiple email providers
 * with automatic fallback support.
 */

import { emailLogger } from "./logger";

/**
 * Email message to send
 */
export interface EmailMessage {
  to: string;
  from?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  tags?: string[];
}

/**
 * Email attachment
 */
export interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded
  contentType: string;
  contentId?: string; // For inline attachments
}

/**
 * Send result from a provider
 */
export interface SendResult {
  success: boolean;
  messageId?: string;
  provider: string;
  error?: string;
  errorCode?: string;
  timestamp: number;
}

/**
 * Email provider interface
 */
export interface EmailProvider {
  name: string;
  priority: number;
  isAvailable(): boolean;
  send(message: EmailMessage): Promise<SendResult>;
  verifyConfiguration(): Promise<boolean>;
}

/**
 * Gmail provider using OAuth
 */
export class GmailProvider implements EmailProvider {
  name = "gmail";
  priority = 1;

  constructor(private accessToken: string) {}

  isAvailable(): boolean {
    return !!this.accessToken;
  }

  async verifyConfiguration(): Promise<boolean> {
    if (!this.accessToken) {
      return false;
    }

    try {
      const response = await fetch(
        "https://www.googleapis.com/gmail/v1/users/me/profile",
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async send(message: EmailMessage): Promise<SendResult> {
    try {
      const rawMessage = this.buildMimeMessage(message);
      const encodedMessage = Buffer.from(rawMessage)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const response = await fetch(
        "https://www.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw: encodedMessage }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          provider: this.name,
          error: error.error?.message || "Gmail API error",
          errorCode: error.error?.code?.toString(),
          timestamp: Date.now(),
        };
      }

      const result = await response.json();
      return {
        success: true,
        messageId: result.id,
        provider: this.name,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        provider: this.name,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now(),
      };
    }
  }

  private buildMimeMessage(message: EmailMessage): string {
    const boundary = `----=_Part_${Date.now()}`;
    const lines: string[] = [];

    // Headers
    lines.push(`To: ${message.to}`);
    if (message.from) {
      lines.push(`From: ${message.from}`);
    }
    lines.push(
      `Subject: =?UTF-8?B?${Buffer.from(message.subject).toString("base64")}?=`,
    );
    lines.push("MIME-Version: 1.0");

    if (message.replyTo) {
      lines.push(`Reply-To: ${message.replyTo}`);
    }

    if (message.attachments && message.attachments.length > 0) {
      lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      lines.push("");
      lines.push(`--${boundary}`);
    }

    lines.push('Content-Type: text/html; charset="UTF-8"');
    lines.push("Content-Transfer-Encoding: base64");
    lines.push("");
    lines.push(Buffer.from(message.html).toString("base64"));

    // Add attachments
    if (message.attachments) {
      for (const attachment of message.attachments) {
        lines.push(`--${boundary}`);
        lines.push(
          `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
        );
        lines.push("Content-Transfer-Encoding: base64");
        lines.push(
          `Content-Disposition: attachment; filename="${attachment.filename}"`,
        );
        if (attachment.contentId) {
          lines.push(`Content-ID: <${attachment.contentId}>`);
        }
        lines.push("");
        lines.push(attachment.content);
      }
      lines.push(`--${boundary}--`);
    }

    return lines.join("\r\n");
  }
}

/**
 * SendGrid provider (fallback)
 */
export class SendGridProvider implements EmailProvider {
  name = "sendgrid";
  priority = 2;

  constructor(private apiKey: string) {}

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async verifyConfiguration(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await fetch("https://api.sendgrid.com/v3/user/profile", {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async send(message: EmailMessage): Promise<SendResult> {
    try {
      const payload = {
        personalizations: [{ to: [{ email: message.to }] }],
        from: { email: message.from || "noreply@echomail.adityamer.live" },
        subject: message.subject,
        content: [
          { type: "text/html", value: message.html },
          ...(message.text
            ? [{ type: "text/plain", value: message.text }]
            : []),
        ],
        ...(message.attachments && {
          attachments: message.attachments.map((a) => ({
            content: a.content,
            filename: a.filename,
            type: a.contentType,
            disposition: a.contentId ? "inline" : "attachment",
            content_id: a.contentId,
          })),
        }),
      };

      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          provider: this.name,
          error: error.errors?.[0]?.message || "SendGrid API error",
          timestamp: Date.now(),
        };
      }

      return {
        success: true,
        messageId: response.headers.get("X-Message-Id") || undefined,
        provider: this.name,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        provider: this.name,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now(),
      };
    }
  }
}

/**
 * SMTP provider using Nodemailer (for Outlook, custom SMTP)
 */
export class SmtpProvider implements EmailProvider {
  name = "smtp";
  priority = 3;

  constructor(
    private config: {
      host: string;
      port: number;
      secure: boolean;
      user: string;
      pass: string;
    },
  ) {}

  isAvailable(): boolean {
    return !!(this.config.host && this.config.user && this.config.pass);
  }

  async verifyConfiguration(): Promise<boolean> {
    // SMTP verification would require actual connection
    // This is a simplified check
    return this.isAvailable();
  }

  async send(_message: EmailMessage): Promise<SendResult> {
    // Note: This would use Nodemailer in the actual implementation
    // For now, we return a placeholder
    return {
      success: false,
      provider: this.name,
      error: "SMTP provider not fully implemented",
      timestamp: Date.now(),
    };
  }
}

/**
 * Email Provider Manager
 * Manages multiple providers with automatic fallback
 */
export class EmailProviderManager {
  private providers: EmailProvider[] = [];

  addProvider(provider: EmailProvider): void {
    this.providers.push(provider);
    // Sort by priority (lower is higher priority)
    this.providers.sort((a, b) => a.priority - b.priority);
  }

  removeProvider(name: string): void {
    this.providers = this.providers.filter((p) => p.name !== name);
  }

  getAvailableProviders(): EmailProvider[] {
    return this.providers.filter((p) => p.isAvailable());
  }

  async verifyAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    await Promise.all(
      this.providers.map(async (p) => {
        results[p.name] = await p.verifyConfiguration();
      }),
    );

    return results;
  }

  /**
   * Send email with automatic fallback
   */
  async send(message: EmailMessage): Promise<SendResult> {
    const availableProviders = this.getAvailableProviders();

    if (availableProviders.length === 0) {
      return {
        success: false,
        provider: "none",
        error: "No email providers available",
        timestamp: Date.now(),
      };
    }

    let lastError: SendResult | null = null;

    for (const provider of availableProviders) {
      emailLogger.debug(`Attempting to send via ${provider.name}`);

      try {
        const result = await provider.send(message);

        if (result.success) {
          emailLogger.info(`Email sent successfully via ${provider.name}`, {
            messageId: result.messageId,
            to: message.to,
          });
          return result;
        }

        lastError = result;
        emailLogger.warn(`${provider.name} failed, trying next provider`, {
          error: result.error,
        });
      } catch (error) {
        lastError = {
          success: false,
          provider: provider.name,
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: Date.now(),
        };
      }
    }

    emailLogger.error("All email providers failed", undefined, {
      to: message.to,
      lastError: lastError?.error,
    } as any);

    return (
      lastError || {
        success: false,
        provider: "unknown",
        error: "All providers failed",
        timestamp: Date.now(),
      }
    );
  }
}

/**
 * Create a configured email provider manager
 */
export function createEmailProviderManager(config: {
  gmailAccessToken?: string;
  sendGridApiKey?: string;
  smtpConfig?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };
}): EmailProviderManager {
  const manager = new EmailProviderManager();

  if (config.gmailAccessToken) {
    manager.addProvider(new GmailProvider(config.gmailAccessToken));
  }

  if (config.sendGridApiKey) {
    manager.addProvider(new SendGridProvider(config.sendGridApiKey));
  }

  if (config.smtpConfig) {
    manager.addProvider(new SmtpProvider(config.smtpConfig));
  }

  return manager;
}
