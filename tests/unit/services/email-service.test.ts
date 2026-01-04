import { describe, it, expect, vi, beforeEach } from "vitest";

import * as gmail from "@/lib/gmail";
import { EmailService } from "@/lib/services/email-service";
import { VerificationService } from "@/lib/services/verification-service";

// Mock dependencies
vi.mock("@/lib/gmail", () => ({
  sendEmailViaAPI: vi.fn(),
  replacePlaceholders: vi.fn((text: string) => text),
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
    verifyBatch: vi.fn(),
  },
}));

describe("EmailService", () => {
  let emailService: EmailService;
  const mockAccessToken = "mock-token";

  beforeEach(() => {
    vi.clearAllMocks();
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
