/**
 * Maps Gmail / send pipeline errors to short user-facing copy.
 */

export function gmailProfileFailureMessage(
  status: number,
  rawBody?: string,
): string {
  if (status === 401) {
    return "Gmail connection expired. Sign out, sign in again, then retry.";
  }
  if (status === 403) {
    return "Gmail denied access. Reconnect your Google account and allow Gmail permissions.";
  }
  if (status === 429) {
    return "Gmail rate limit hit. Wait a few minutes, then retry.";
  }

  let detail = "";
  if (rawBody) {
    try {
      const json = JSON.parse(rawBody) as {
        error?: { message?: string; status?: string };
      };
      detail = json.error?.message || "";
    } catch {
      detail = rawBody.slice(0, 120);
    }
  }

  if (/insufficient.*scope|access_not_configured/i.test(detail)) {
    return "Gmail permissions missing. Sign out and sign in again to grant send access.";
  }

  return detail
    ? `Could not reach Gmail (${status}): ${detail}`
    : `Could not reach Gmail (HTTP ${status}). Check your connection and try again.`;
}

export function formatEmailSendErrorForUser(error: string): string {
  const lower = error.toLowerCase();

  if (lower.includes("failed to get user profile")) {
    return "Gmail connection problem. Sign out, sign in again, then retry.";
  }
  if (
    lower.includes("unauthorized") ||
    lower.includes("invalid_grant") ||
    lower.includes("access token")
  ) {
    return "Session expired. Sign in again, then retry.";
  }
  if (lower.includes("rate limit") || lower.includes("ratelimitexceeded")) {
    return "Gmail rate limit reached. Wait and retry later.";
  }
  if (lower.includes("quota exceeded") || lower.includes("daily limit")) {
    return "Gmail daily sending limit reached. Try again tomorrow.";
  }
  if (lower.includes("invalid email") || lower.includes("invalid to header")) {
    return error.replace(/^Gmail API error \(\d+\): /i, "");
  }
  if (lower.includes("cancelled by user")) {
    return "Sending stopped before this message was sent.";
  }
  if (lower.includes("skipped due to") || lower.includes("session expired")) {
    return error;
  }
  if (lower.startsWith("gmail api error")) {
    const stripped = error.replace(/^Gmail API error \(\d+\): /i, "");
    return stripped.length > 200 ? `${stripped.slice(0, 197)}…` : stripped;
  }

  return error.length > 220 ? `${error.slice(0, 217)}…` : error;
}

export type SendResultStatus =
  | "success"
  | "error"
  | "skipped"
  | "cancelled"
  | "pending"
  | "retrying";

export function formatSendResultLabel(status: string): string {
  switch (status) {
    case "success":
      return "Sent";
    case "error":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    case "skipped":
      return "Skipped";
    case "pending":
      return "Pending";
    case "retrying":
      return "Retrying";
    default:
      return status;
  }
}

export function sendResultBadgeVariant(
  status: string,
): "success" | "destructive" | "secondary" | "outline" {
  if (status === "success") {
    return "success";
  }
  if (status === "cancelled" || status === "skipped") {
    return "secondary";
  }
  if (status === "pending" || status === "retrying") {
    return "outline";
  }
  return "destructive";
}
