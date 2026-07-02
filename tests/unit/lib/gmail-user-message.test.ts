import { describe, expect, it } from "vitest";

import {
  formatEmailSendErrorForUser,
  formatSendResultLabel,
  gmailProfileFailureMessage,
} from "@/lib/gmail-user-message";

describe("gmailProfileFailureMessage", () => {
  it("maps 401 to reconnect guidance", () => {
    expect(gmailProfileFailureMessage(401)).toMatch(/sign in again/i);
  });

  it("maps generic profile error for users", () => {
    expect(
      formatEmailSendErrorForUser("Failed to get user profile from Gmail API"),
    ).toMatch(/Gmail connection/i);
  });
});

describe("formatSendResultLabel", () => {
  it("labels cancelled distinctly from failed", () => {
    expect(formatSendResultLabel("cancelled")).toBe("Cancelled");
    expect(formatSendResultLabel("error")).toBe("Failed");
  });
});
