import { describe, it, expect, vi, beforeEach } from "vitest";

import * as gmail from "@/lib/gmail";
import { EmailService } from "@/lib/services/email-service";
import { VerificationService } from "@/lib/services/verification-service";

const verifyEmailLikeReal = async (email: string) => {
  const trimmedEmail = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(trimmedEmail)) {
    return {
      isValid: false,
      reason: "Invalid syntax",
      score: 0,
    };
  }

  const [localPart, domain] = trimmedEmail.split("@");
  const isDisposable = new Set([
    "mailinator.com",
    "guerrillamail.com",
    "tempmail.com",
    "10minutemail.com",
    "throwawaymail.com",
    "yopmail.com",
    "sharklasers.com",
    "guerrillamailblock.com",
    "pokemail.net",
    "grr.la",
  ]).has(domain);
  const isRoleBased = new Set([
    "admin",
    "administrator",
    "webmaster",
    "hostmaster",
    "postmaster",
    "info",
    "support",
    "contact",
    "sales",
    "marketing",
    "billing",
    "noreply",
    "no-reply",
    "jobs",
    "hr",
  ]).has(localPart);

  let score = 100;
  if (isDisposable) {
    score -= 50;
  }
  if (isRoleBased) {
    score -= 20;
  }

  return {
    isValid: score > 0,
    reason: isDisposable
      ? "Disposable email domain"
      : isRoleBased
        ? "Role-based email"
        : undefined,
    isDisposable,
    isRoleBased,
    score,
  };
};

// Mock dependencies
vi.mock("@/lib/gmail", () => ({
  sendEmailViaAPI: vi.fn(),
  replacePlaceholders: vi.fn(
    (text: string, data: Record<string, string> = {}) =>
      text.replace(/{{(.*?)}}/g, (match, key) => data[key.trim()] ?? match),
  ),
  preResolveAttachments: vi.fn(async (attachments) => attachments),
  clearAttachmentCache: vi.fn(),
  preBuildEmailTemplate: vi.fn((subject, body) => ({ subject, body })),
  sendEmailWithTemplate: vi.fn(),
}));

vi.mock("@/lib/attachment-fetcher", () => ({
  fetchFileFromUrl: vi.fn(),
}));

vi.mock("@/lib/services/verification-service", () => ({
  VerificationService: {
    verifyEmail: vi.fn(verifyEmailLikeReal),
    verifyBatch: vi.fn(async (emails: string[]) => {
      const results = new Map();
      for (const email of emails) {
        results.set(email, await verifyEmailLikeReal(email));
      }
      return results;
    }),
  },
}));

describe("EmailService", () => {
  let emailService: EmailService;
  const mockAccessToken = "mock-token";

  beforeEach(() => {
    vi.clearAllMocks();
    (gmail.replacePlaceholders as any).mockImplementation(
      (text: string, data: Record<string, string> = {}) =>
        text.replace(/{{(.*?)}}/g, (match, key) => data[key.trim()] ?? match),
    );
    (VerificationService.verifyEmail as any).mockImplementation(
      verifyEmailLikeReal,
    );
    (VerificationService.verifyBatch as any).mockImplementation(
      async (emails: string[]) => {
        const results = new Map();
        for (const email of emails) {
          results.set(email, await verifyEmailLikeReal(email));
        }
        return results;
      },
    );
    emailService = new EmailService(mockAccessToken);
  });

  describe("sendCampaign", () => {
    it("should send emails to all recipients", async () => {
      const recipients = [
        { email: "test1@example.com", name: "Test 1" },
        { email: "test2@example.com", name: "Test 2" },
      ];
      const content = { subject: "Hello {{name}}", body: "World" };

      (gmail.sendEmailViaAPI as any).mockResolvedValue({
        success: true,
        messageId: "msg-123",
      });

      const summary = await emailService.sendCampaign(recipients, content, {
        delayBetweenEmails: 0,
      });

      expect(summary.total).toBe(2);
      expect(summary.sent).toBe(2);
      expect(gmail.sendEmailViaAPI).toHaveBeenCalledTimes(2);
    });

    it("should skip invalid emails if verifyBeforeSending is true", async () => {
      const recipients = [
        { email: "valid@example.com" },
        { email: "invalid@example.com" },
      ];
      const content = { subject: "Hello {{name}}", body: "World" };

      (VerificationService.verifyBatch as any).mockResolvedValue(
        new Map([
          [
            "valid@example.com",
            {
              isValid: true,
              score: 100,
              isDisposable: false,
              isRoleBased: false,
            },
          ],
          [
            "invalid@example.com",
            {
              isValid: false,
              score: 0,
              isDisposable: false,
              isRoleBased: false,
              reason: "Invalid syntax",
            },
          ],
        ]),
      );

      (gmail.sendEmailViaAPI as any).mockResolvedValue({
        success: true,
        messageId: "msg-123",
      });

      const summary = await emailService.sendCampaign(recipients, content, {
        verifyBeforeSending: true,
        delayBetweenEmails: 0,
      });

      expect(summary.total).toBe(2);
      expect(summary.sent).toBe(1);
      expect(summary.skipped).toBe(1);
      expect(gmail.sendEmailViaAPI).toHaveBeenCalledTimes(1);
    });

    it("should handle individual send failures", async () => {
      const recipients = [{ email: "fail@example.com" }];
      const content = { subject: "Hello {{name}}", body: "World" };

      (gmail.sendEmailViaAPI as any).mockRejectedValue(new Error("SMTP Error"));

      const summary = await emailService.sendCampaign(recipients, content, {
        delayBetweenEmails: 0,
      });

      expect(summary.sent).toBe(0);
      expect(summary.failed).toBe(1);
      expect(summary.results[0].status).toBe("error");
    });
  });
});
