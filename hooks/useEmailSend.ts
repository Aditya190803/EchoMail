import { useState, useCallback, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import { emailSendLogger } from "@/lib/client-logger";
import type {
  EmailResult,
  SendStatus,
  EmailProgress,
  QuotaInfo,
  CampaignState,
  SendOptions,
  PersonalizedEmailData,
  SavedCampaignInfo,
} from "@/types/campaign";
import type { TokenStatus } from "@/types/auth";

interface UseEmailSendResult {
  sendEmails: (
    personalizedEmails: PersonalizedEmailData[],
    options?: SendOptions,
  ) => Promise<EmailResult[]>;
  retryFailedEmails: () => Promise<EmailResult[]>;
  stopSending: () => void;
  resumeCampaign: () => Promise<EmailResult[]>;
  clearSavedCampaign: () => void;
  progress: EmailProgress;
  sendStatus: SendStatus[];
  isLoading: boolean;
  isStopping: boolean;
  isPaused: boolean;
  isOffline: boolean;
  error: string | null;
  failedEmails: PersonalizedEmailData[];
  hasPendingRetries: boolean;
  stoppedDueToError: boolean;
  hasSavedCampaign: boolean;
  savedCampaignInfo: SavedCampaignInfo | null;
  quotaInfo: QuotaInfo;
  updateQuotaUsed: (count: number) => void;
  resetDailyQuota: () => void;
  checkTokenStatus: () => Promise<TokenStatus>;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // 2 seconds between retries
const DEFAULT_BETWEEN_EMAILS_DELAY_MS = 1000; // 1 second between different emails
const DEFAULT_TOKEN_CHECK_INTERVAL = 10; // Check token every 10 emails
const RATE_LIMIT_INITIAL_DELAY_MS = 60000; // 1 minute initial backoff for rate limits
const RATE_LIMIT_MAX_DELAY_MS = 300000; // 5 minutes max backoff
const NETWORK_RETRY_DELAY_MS = 5000; // 5 seconds between network retry checks

// Gmail API quotas (conservative estimates)
// Free Gmail: ~500 emails/day, Workspace: ~2000/day
const GMAIL_DAILY_LIMIT = 500; // Conservative default for free accounts

// Storage keys
const QUOTA_STORAGE_KEY = "echomail_gmail_quota";
const CAMPAIGN_STATE_KEY = "echomail_campaign_state";
const CAMPAIGN_LOCK_KEY = "echomail_campaign_lock";

/**
 * Unified email sending hook that sends emails one by one sequentially.
 * Features:
 * - Retries failed emails up to 3 times
 * - Configurable delay between emails to avoid rate limiting
 * - Tracks estimated Gmail quota usage
 * - Checks and refreshes OAuth token during long campaigns
 * - Stop/cancel sending mid-campaign
 * - Persists campaign state for resume after refresh
 * - Prevents duplicate sends with lock mechanism
 * - Allows users to retry remaining emails later
 */
export function useEmailSend(): UseEmailSendResult {
  const [progress, setProgress] = useState<EmailProgress>({
    currentEmail: 0,
    totalEmails: 0,
    percentage: 0,
    status: "",
  });

  const [sendStatus, setSendStatus] = useState<SendStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedEmails, setFailedEmails] = useState<PersonalizedEmailData[]>([]);
  const [stoppedDueToError, setStoppedDueToError] = useState(false);
  const [hasSavedCampaign, setHasSavedCampaign] = useState(false);
  const [savedCampaignInfo, setSavedCampaignInfo] =
    useState<SavedCampaignInfo | null>(null);

  // Quota tracking state
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo>(() => {
    // Load quota info from localStorage on init
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(QUOTA_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const lastUpdated = new Date(parsed.lastUpdated);
          const now = new Date();

          // Reset quota if it's a new day (based on UTC)
          if (lastUpdated.toDateString() !== now.toDateString()) {
            return {
              dailyLimit: GMAIL_DAILY_LIMIT,
              estimatedUsed: 0,
              estimatedRemaining: GMAIL_DAILY_LIMIT,
              lastUpdated: null,
            };
          }

          return {
            ...parsed,
            lastUpdated: lastUpdated,
          };
        }
      } catch (e) {
        // Failed to load quota, use defaults
      }
    }
    return {
      dailyLimit: GMAIL_DAILY_LIMIT,
      estimatedUsed: 0,
      estimatedRemaining: GMAIL_DAILY_LIMIT,
      lastUpdated: null,
    };
  });

  // Store remaining emails for retry
  const remainingEmailsRef = useRef<PersonalizedEmailData[]>([]);

  // Store current delay setting
  const currentDelayRef = useRef<number>(DEFAULT_BETWEEN_EMAILS_DELAY_MS);

  // Stop flag
  const shouldStopRef = useRef(false);

  // Pause flag for network issues
  const isPausedRef = useRef(false);

  // Rate limit backoff tracking
  const rateLimitBackoffRef = useRef(RATE_LIMIT_INITIAL_DELAY_MS);

  // Campaign ID for persistence
  const campaignIdRef = useRef<string>("");

  // Check for saved campaign on mount
  useEffect(() => {
    checkSavedCampaign();
  }, []);

  // Network status monitoring
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      emailSendLogger.info("Network restored");
      setIsOffline(false);
      if (isPausedRef.current && isLoading) {
        setProgress((prev) => ({
          ...prev,
          status: "🌐 Network restored! Resuming...",
        }));
        isPausedRef.current = false;
        setIsPaused(false);
      }
    };

    const handleOffline = () => {
      emailSendLogger.info("Network disconnected");
      setIsOffline(true);
      if (isLoading) {
        isPausedRef.current = true;
        setIsPaused(true);
        setProgress((prev) => ({
          ...prev,
          status: "📴 Network disconnected. Waiting for connection...",
        }));
      }
    };

    // Check initial status
    if (!navigator.onLine) {
      setIsOffline(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isLoading]);

  const checkSavedCampaign = () => {
    try {
      const saved = localStorage.getItem(CAMPAIGN_STATE_KEY);
      if (saved) {
        const state: CampaignState = JSON.parse(saved);
        if (state.status === "in-progress" || state.status === "paused") {
          const remaining = state.emails.length - state.sentIndices.length;
          setHasSavedCampaign(true);
          setSavedCampaignInfo({
            subject: state.subject,
            remaining,
            total: state.emails.length,
          });
        }
      }
    } catch (e) {
      emailSendLogger.error(
        "Error checking saved campaign",
        e instanceof Error ? e : undefined,
      );
    }
  };

  const generateCampaignId = () => {
    return `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const getTabId = (): string => {
    if (typeof window === "undefined") return "server";

    let tabId = sessionStorage.getItem("echomail_tab_id");
    if (!tabId) {
      tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem("echomail_tab_id", tabId);
    }
    return tabId;
  };

  const acquireLock = (): boolean => {
    try {
      const existingLock = localStorage.getItem(CAMPAIGN_LOCK_KEY);
      if (existingLock) {
        const lock = JSON.parse(existingLock);
        // Lock expires after 5 minutes of inactivity
        if (Date.now() - lock.timestamp < 5 * 60 * 1000) {
          if (lock.tabId !== getTabId()) {
            return false; // Another tab is sending
          }
        }
      }

      localStorage.setItem(
        CAMPAIGN_LOCK_KEY,
        JSON.stringify({
          tabId: getTabId(),
          timestamp: Date.now(),
        }),
      );
      return true;
    } catch (e) {
      emailSendLogger.error(
        "Error acquiring lock",
        e instanceof Error ? e : undefined,
      );
      return true; // Proceed anyway if localStorage fails
    }
  };

  const releaseLock = () => {
    try {
      const existingLock = localStorage.getItem(CAMPAIGN_LOCK_KEY);
      if (existingLock) {
        const lock = JSON.parse(existingLock);
        if (lock.tabId === getTabId()) {
          localStorage.removeItem(CAMPAIGN_LOCK_KEY);
        }
      }
    } catch (e) {
      emailSendLogger.error(
        "Error releasing lock",
        e instanceof Error ? e : undefined,
      );
    }
  };

  const refreshLock = () => {
    try {
      localStorage.setItem(
        CAMPAIGN_LOCK_KEY,
        JSON.stringify({
          tabId: getTabId(),
          timestamp: Date.now(),
        }),
      );
    } catch (e) {
      emailSendLogger.error(
        "Error refreshing lock",
        e instanceof Error ? e : undefined,
      );
    }
  };

  const saveCampaignState = (state: CampaignState) => {
    try {
      localStorage.setItem(CAMPAIGN_STATE_KEY, JSON.stringify(state));
    } catch (e) {
      emailSendLogger.error(
        "Error saving campaign state",
        e instanceof Error ? e : undefined,
      );
    }
  };

  const clearCampaignState = () => {
    try {
      localStorage.removeItem(CAMPAIGN_STATE_KEY);
      setHasSavedCampaign(false);
      setSavedCampaignInfo(null);
    } catch (e) {
      emailSendLogger.error(
        "Error clearing campaign state",
        e instanceof Error ? e : undefined,
      );
    }
  };

  // Wait for network to come back online
  const waitForNetwork = async (): Promise<boolean> => {
    if (typeof window === "undefined") return true;
    if (navigator.onLine) return true;

    emailSendLogger.info("Waiting for network...");

    return new Promise((resolve) => {
      const checkNetwork = () => {
        if (shouldStopRef.current) {
          resolve(false);
          return;
        }
        if (navigator.onLine) {
          resolve(true);
          return;
        }
        setTimeout(checkNetwork, NETWORK_RETRY_DELAY_MS);
      };

      // Also listen for the online event
      const handleOnline = () => {
        window.removeEventListener("online", handleOnline);
        resolve(true);
      };
      window.addEventListener("online", handleOnline);

      checkNetwork();
    });
  };

  // Check if error is a rate limit (429) error
  const isRateLimitError = (
    errorMessage: string,
    statusCode?: number,
  ): boolean => {
    if (statusCode === 429) return true;
    const rateLimitIndicators = [
      "429",
      "rate limit",
      "too many requests",
      "quota exceeded",
      "user-rate limit exceeded",
    ];
    return rateLimitIndicators.some((indicator) =>
      errorMessage.toLowerCase().includes(indicator.toLowerCase()),
    );
  };

  // Handle rate limit with exponential backoff
  const handleRateLimit = async (): Promise<void> => {
    const delay = rateLimitBackoffRef.current;
    const minutes = Math.ceil(delay / 60000);

    emailSendLogger.info(`Rate limited. Waiting ${minutes} minute(s)...`);
    setProgress((prev) => ({
      ...prev,
      status: `⏳ Rate limited by Gmail. Waiting ${minutes} minute(s) before retrying...`,
    }));

    // Wait with periodic checks for stop request
    const endTime = Date.now() + delay;
    while (Date.now() < endTime) {
      if (shouldStopRef.current) return;

      const remaining = Math.ceil((endTime - Date.now()) / 1000);
      if (remaining % 10 === 0) {
        // Update every 10 seconds
        setProgress((prev) => ({
          ...prev,
          status: `⏳ Rate limited. Resuming in ${remaining} seconds...`,
        }));
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Increase backoff for next time (exponential)
    rateLimitBackoffRef.current = Math.min(
      rateLimitBackoffRef.current * 2,
      RATE_LIMIT_MAX_DELAY_MS,
    );
  };

  // Reset rate limit backoff on success
  const resetRateLimitBackoff = () => {
    rateLimitBackoffRef.current = RATE_LIMIT_INITIAL_DELAY_MS;
  };

  // Update quota used count
  const updateQuotaUsed = useCallback((count: number) => {
    setQuotaInfo((prev) => {
      const newUsed = prev.estimatedUsed + count;
      const newRemaining = Math.max(0, prev.dailyLimit - newUsed);
      const updated = {
        ...prev,
        estimatedUsed: newUsed,
        estimatedRemaining: newRemaining,
        lastUpdated: new Date(),
      };

      // Persist to localStorage
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {
          emailSendLogger.error(
            "Error saving quota info",
            e instanceof Error ? e : undefined,
          );
        }
      }

      return updated;
    });
  }, []);

  // Reset daily quota (for manual reset or new day)
  const resetDailyQuota = useCallback(() => {
    const reset = {
      dailyLimit: GMAIL_DAILY_LIMIT,
      estimatedUsed: 0,
      estimatedRemaining: GMAIL_DAILY_LIMIT,
      lastUpdated: null,
    };
    setQuotaInfo(reset);

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(QUOTA_STORAGE_KEY);
      } catch (e) {
        emailSendLogger.error(
          "Error clearing quota info",
          e instanceof Error ? e : undefined,
        );
      }
    }
  }, []);

  // Check token status and trigger refresh if needed
  const checkTokenStatus = useCallback(async (): Promise<TokenStatus> => {
    try {
      const response = await fetch("/api/refresh-token", {
        method: "GET",
      });

      const data = await response.json();

      if (!response.ok) {
        emailSendLogger.warn("Token check failed", { error: data.error });
        return {
          valid: false,
          minutesRemaining: 0,
          requiresReauth: data.requiresReauth || true,
        };
      }

      // If token is expiring soon, trigger a background session refresh
      if (data.isExpiringSoon) {
        emailSendLogger.info(
          `Token expiring soon (${data.minutesRemaining} min remaining), refreshing...`,
        );
        // The NextAuth JWT callback will automatically refresh on next request
        await fetch("/api/auth/session");
      }

      return {
        valid: data.valid,
        minutesRemaining: data.minutesRemaining,
      };
    } catch (error) {
      emailSendLogger.error(
        "Token status check error",
        error instanceof Error ? error : undefined,
      );
      return { valid: false, minutesRemaining: 0, requiresReauth: true };
    }
  }, []);

  // Helper to check if error is retryable
  const isRetryableError = (errorMessage: string): boolean => {
    const nonRetryableErrors = [
      "Session expired",
      "Unauthorized",
      "401",
      "Invalid email",
      "invalid address",
      "Email too large",
      "413",
      "may have been sent", // Don't retry if email might have been sent (timeout with large attachment)
      "check your Gmail Sent folder", // Same as above
    ];
    return !nonRetryableErrors.some((e) =>
      errorMessage.toLowerCase().includes(e.toLowerCase()),
    );
  };

  // Helper to send a single email with retries
  const sendSingleEmailWithRetry = async (
    email: PersonalizedEmailData,
    index: number,
    totalEmails: number,
  ): Promise<EmailResult> => {
    let lastError = "";
    let lastStatusCode: number | undefined;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      // Check if stop was requested
      if (shouldStopRef.current) {
        return {
          email: email.to,
          status: "cancelled",
          error: "Cancelled by user",
          index,
        };
      }

      // Wait for network if offline
      if (typeof window !== "undefined" && !navigator.onLine) {
        setProgress((prev) => ({
          ...prev,
          status: `📴 Network offline. Waiting for connection...`,
        }));
        const networkRestored = await waitForNetwork();
        if (!networkRestored) {
          return {
            email: email.to,
            status: "cancelled",
            error: "Cancelled while waiting for network",
            index,
          };
        }
        setProgress((prev) => ({
          ...prev,
          status: `🌐 Network restored! Resuming...`,
        }));
      }

      try {
        // Update status to show retry attempt
        if (attempt > 1) {
          setProgress((prev) => ({
            ...prev,
            status: `Retrying ${email.to} (attempt ${attempt}/${MAX_RETRIES})...`,
          }));
          setSendStatus((prev) =>
            prev.map((s) =>
              s.index === index
                ? { ...s, status: "retrying" as const, retryCount: attempt }
                : s,
            ),
          );

          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }

        // Refresh lock periodically
        refreshLock();

        emailSendLogger.debug(`Sending email to ${email.to}`, {
          attempt,
          maxRetries: MAX_RETRIES,
          hasPersonalizedAttachment: !!email.personalizedAttachment?.url,
        });

        const payload = {
          to: email.to,
          subject: email.subject,
          message: email.message,
          originalRowData: email.originalRowData || {},
          attachments: email.attachments || [],
          personalizedAttachment: email.personalizedAttachment || undefined,
        };

        const response = await fetch("/api/send-single-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        lastStatusCode = response.status;

        if (response.ok) {
          emailSendLogger.info(`Email sent successfully`, { to: email.to });
          resetRateLimitBackoff(); // Reset backoff on success
          return {
            email: email.to,
            status: "success",
            retryCount: attempt,
            index,
          };
        }

        const errorData = await response.json();
        lastError =
          errorData.userMessage || errorData.error || `HTTP ${response.status}`;

        // Handle rate limiting with exponential backoff
        if (isRateLimitError(lastError, response.status)) {
          emailSendLogger.warn(`Rate limit hit`, { email: email.to });
          await handleRateLimit();
          // Don't count this as a retry attempt - rate limits are external
          attempt--;
          continue;
        }

        // Check if error is non-retryable
        if (!isRetryableError(lastError)) {
          emailSendLogger.error(`Non-retryable error`, undefined, {
            email: email.to,
            error: lastError,
          });
          break;
        }

        emailSendLogger.warn(`Attempt ${attempt} failed`, {
          email: email.to,
          error: lastError,
        });
      } catch (fetchError) {
        lastError =
          fetchError instanceof Error ? fetchError.message : "Network error";

        // Check if it's a network error
        if (
          lastError.includes("Failed to fetch") ||
          lastError.includes("NetworkError") ||
          lastError.includes("network")
        ) {
          emailSendLogger.warn(
            "Network error detected, waiting for reconnection...",
          );
          setProgress((prev) => ({
            ...prev,
            status: `📴 Network error. Waiting for connection...`,
          }));

          const networkRestored = await waitForNetwork();
          if (!networkRestored) {
            return {
              email: email.to,
              status: "cancelled",
              error: "Cancelled while waiting for network",
              index,
            };
          }

          // Don't count network issues as a retry attempt
          attempt--;
          continue;
        }

        emailSendLogger.warn(`Attempt ${attempt} failed`, {
          email: email.to,
          error: lastError,
        });

        if (!isRetryableError(lastError)) {
          break;
        }
      }
    }

    // All retries exhausted or non-retryable error
    return {
      email: email.to,
      status: "error",
      error: lastError,
      retryCount: MAX_RETRIES,
      index,
    };
  };

  const stopSending = useCallback(() => {
    shouldStopRef.current = true;
    setIsStopping(true);
    setProgress((prev) => ({
      ...prev,
      status: "⏸️ Stopping... Please wait for current email to complete",
    }));
  }, []);

  const clearSavedCampaign = useCallback(() => {
    clearCampaignState();
    releaseLock();
  }, []);

  const sendEmails = useCallback(
    async (
      personalizedEmails: PersonalizedEmailData[],
      options?: SendOptions,
    ): Promise<EmailResult[]> => {
      // Check for duplicate sends
      if (!acquireLock()) {
        setError(
          "Another campaign is already running in a different tab. Please wait or close the other tab.",
        );
        return [];
      }

      // Set the delay from options or use default
      const delayBetweenEmails =
        options?.delayBetweenEmails ?? DEFAULT_BETWEEN_EMAILS_DELAY_MS;
      const tokenCheckInterval =
        options?.checkTokenEveryN ?? DEFAULT_TOKEN_CHECK_INTERVAL;
      const campaignSubject = options?.campaignSubject;
      currentDelayRef.current = delayBetweenEmails;

      shouldStopRef.current = false;
      setIsStopping(false);
      setIsLoading(true);
      setError(null);
      setFailedEmails([]);
      setStoppedDueToError(false);
      remainingEmailsRef.current = [];

      const campaignId = generateCampaignId();
      campaignIdRef.current = campaignId;

      const totalEmails = personalizedEmails.length;
      emailSendLogger.info(`Starting email campaign`, {
        totalEmails,
        maxRetries: MAX_RETRIES,
        delayMs: delayBetweenEmails,
      });

      // Check token status before starting
      const initialTokenStatus = await checkTokenStatus();
      if (!initialTokenStatus.valid) {
        setError("Your session has expired. Please sign in again.");
        setIsLoading(false);
        releaseLock();
        if (initialTokenStatus.requiresReauth) {
          signIn("google");
        }
        return [];
      }
      emailSendLogger.info(`Token valid`, {
        minutesRemaining: initialTokenStatus.minutesRemaining,
      });

      // Check quota before starting
      if (quotaInfo.estimatedRemaining < totalEmails) {
        emailSendLogger.warn(
          `Attempting to send ${totalEmails} emails but only ~${quotaInfo.estimatedRemaining} quota remaining`,
        );
      }

      setProgress({
        currentEmail: 0,
        totalEmails,
        percentage: 0,
        status: `Starting to send ${totalEmails} emails (${delayBetweenEmails / 1000}s delay between emails)...`,
      });

      // Initialize all emails as pending with unique index
      setSendStatus(
        personalizedEmails.map((email, index) => ({
          email: email.to,
          status: "pending" as const,
          index,
        })),
      );

      // Initialize campaign state for persistence
      const campaignState: CampaignState = {
        campaignId,
        emails: personalizedEmails,
        sentIndices: [],
        failedIndices: [],
        status: "in-progress",
        startedAt: new Date().toISOString(),
        subject: campaignSubject,
      };
      saveCampaignState(campaignState);

      const results: EmailResult[] = [];
      let successCount = 0;

      try {
        for (let i = 0; i < personalizedEmails.length; i++) {
          // Check if stop was requested
          if (shouldStopRef.current) {
            const remainingEmails = personalizedEmails.slice(i);
            remainingEmailsRef.current = remainingEmails;

            // Mark remaining as cancelled
            for (let j = 0; j < remainingEmails.length; j++) {
              const remainingEmail = remainingEmails[j];
              const remainingIndex = i + j;
              results.push({
                email: remainingEmail.to,
                status: "cancelled",
                error: "Cancelled by user",
                index: remainingIndex,
              });
              setSendStatus((prev) =>
                prev.map((s) =>
                  s.index === remainingIndex
                    ? {
                        ...s,
                        status: "cancelled" as const,
                        error: "Cancelled by user",
                      }
                    : s,
                ),
              );
            }

            // Update campaign state
            campaignState.status = "paused";
            campaignState.failedIndices = results
              .filter((r) => r.status === "error" || r.status === "cancelled")
              .map((r) => r.index!);
            saveCampaignState(campaignState);

            setProgress((prev) => ({
              ...prev,
              status: `⏸️ Stopped! ${results.filter((r) => r.status === "success").length} sent, ${remainingEmails.length} cancelled`,
            }));

            setHasSavedCampaign(true);
            setSavedCampaignInfo({
              subject: campaignSubject,
              remaining: remainingEmails.length,
              total: totalEmails,
            });

            setFailedEmails(remainingEmails);
            break;
          }

          const email = personalizedEmails[i];

          // Check token every N emails to prevent expiry during long campaigns
          if (i > 0 && i % tokenCheckInterval === 0) {
            setProgress((prev) => ({
              ...prev,
              status: `Checking session status...`,
            }));

            const tokenStatus = await checkTokenStatus();
            if (!tokenStatus.valid) {
              emailSendLogger.error("Token expired during campaign");
              // Store remaining emails for retry
              const remainingEmails = personalizedEmails.slice(i);
              remainingEmailsRef.current = remainingEmails;
              setFailedEmails(remainingEmails);
              setStoppedDueToError(true);
              setError(
                `Session expired after sending ${i} emails. ${remainingEmails.length} emails remaining. Please sign in again and retry.`,
              );

              // Update campaign state
              campaignState.status = "paused";
              saveCampaignState(campaignState);

              setHasSavedCampaign(true);
              setSavedCampaignInfo({
                subject: campaignSubject,
                remaining: remainingEmails.length,
                total: totalEmails,
              });

              // Mark remaining as skipped
              for (let j = 0; j < remainingEmails.length; j++) {
                const remainingIndex = i + j;
                results.push({
                  email: remainingEmails[j].to,
                  status: "skipped",
                  error: "Session expired",
                  index: remainingIndex,
                });
                setSendStatus((prev) =>
                  prev.map((s) =>
                    s.index === remainingIndex
                      ? {
                          ...s,
                          status: "skipped" as const,
                          error: "Session expired",
                        }
                      : s,
                  ),
                );
              }

              if (tokenStatus.requiresReauth) {
                signIn("google");
              }
              break;
            }
            emailSendLogger.debug(`Token still valid`, {
              minutesRemaining: tokenStatus.minutesRemaining,
            });
          }

          setProgress({
            currentEmail: i + 1,
            totalEmails,
            percentage: Math.round(((i + 1) / totalEmails) * 100),
            status: `Sending ${i + 1}/${totalEmails}: ${email.to}`,
          });

          const result = await sendSingleEmailWithRetry(email, i, totalEmails);
          results.push({ ...result, index: i });

          // Update campaign state
          if (result.status === "success") {
            campaignState.sentIndices.push(i);
            successCount++;
            updateQuotaUsed(1);
          } else {
            campaignState.failedIndices.push(i);
          }
          saveCampaignState(campaignState);

          // Update status using index to handle duplicate emails correctly
          setSendStatus((prev) =>
            prev.map((s) =>
              s.index === i
                ? {
                    ...s,
                    status: result.status as SendStatus["status"],
                    error: result.error,
                    retryCount: result.retryCount,
                  }
                : s,
            ),
          );

          // Check if we stopped due to user request
          if (result.status === "cancelled") {
            continue; // Already handled above
          }

          // If email failed after all retries, stop sending remaining emails
          if (result.status === "error") {
            emailSendLogger.error(
              `Stopping email campaign due to persistent error`,
              undefined,
              { error: result.error },
            );

            // Mark remaining emails as skipped
            const remainingEmails = personalizedEmails.slice(i + 1);
            remainingEmailsRef.current = remainingEmails;
            setFailedEmails([email, ...remainingEmails]);

            for (let j = 0; j < remainingEmails.length; j++) {
              const remainingEmail = remainingEmails[j];
              const remainingIndex = i + 1 + j;
              results.push({
                email: remainingEmail.to,
                status: "skipped",
                error: "Skipped due to previous error",
                index: remainingIndex,
              });
              setSendStatus((prev) =>
                prev.map((s) =>
                  s.index === remainingIndex
                    ? {
                        ...s,
                        status: "skipped" as const,
                        error:
                          "Skipped - campaign stopped due to previous error",
                      }
                    : s,
                ),
              );
            }

            // Update campaign state
            campaignState.status = "paused";
            saveCampaignState(campaignState);

            setStoppedDueToError(true);
            setError(
              `Campaign stopped: ${result.error}. ${remainingEmails.length} emails were not sent. You can retry them later.`,
            );

            setProgress((prev) => ({
              ...prev,
              status: `⚠️ Stopped! ${results.filter((r) => r.status === "success").length} sent, 1 failed, ${remainingEmails.length} skipped`,
            }));

            setHasSavedCampaign(true);
            setSavedCampaignInfo({
              subject: campaignSubject,
              remaining: remainingEmails.length + 1,
              total: totalEmails,
            });

            break;
          }

          // Wait between emails to avoid rate limits (using configurable delay)
          if (i < personalizedEmails.length - 1) {
            setProgress((prev) => ({
              ...prev,
              status: `Sent ${i + 1}/${totalEmails}. Waiting ${delayBetweenEmails / 1000}s before next...`,
            }));
            await new Promise((resolve) =>
              setTimeout(resolve, delayBetweenEmails),
            );
          }
        }

        // Check if completed successfully
        const errorCount = results.filter((r) => r.status === "error").length;
        const allProcessed =
          !shouldStopRef.current &&
          results.length === personalizedEmails.length;

        if (allProcessed && errorCount === 0) {
          // All sent successfully - clear saved state
          campaignState.status = "completed";
          saveCampaignState(campaignState);
          clearCampaignState();

          const sent = results.filter((r) => r.status === "success").length;

          setProgress((prev) => ({
            ...prev,
            status: `✅ Done! ${sent} emails sent successfully`,
          }));
        }

        return results;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        setProgress((prev) => ({ ...prev, status: `Error: ${errorMessage}` }));

        // Save state for resume
        campaignState.status = "paused";
        saveCampaignState(campaignState);

        throw err;
      } finally {
        setIsLoading(false);
        setIsStopping(false);
        shouldStopRef.current = false;
        releaseLock();
      }
    },
    [quotaInfo.estimatedRemaining, updateQuotaUsed, checkTokenStatus],
  );

  const resumeCampaign = useCallback(async (): Promise<EmailResult[]> => {
    try {
      const saved = localStorage.getItem(CAMPAIGN_STATE_KEY);
      if (!saved) {
        setError("No saved campaign to resume");
        return [];
      }

      const state: CampaignState = JSON.parse(saved);

      if (state.status !== "in-progress" && state.status !== "paused") {
        setError("Campaign already completed");
        return [];
      }

      // Get emails that weren't sent
      const unsentIndices = state.emails
        .map((_, i) => i)
        .filter((i) => !state.sentIndices.includes(i));

      const emailsToSend = unsentIndices.map((i) => state.emails[i]);

      if (emailsToSend.length === 0) {
        clearCampaignState();
        return [];
      }

      return sendEmails(emailsToSend, { campaignSubject: state.subject });
    } catch (e) {
      emailSendLogger.error(
        "Error resuming campaign",
        e instanceof Error ? e : undefined,
      );
      setError("Failed to resume campaign");
      return [];
    }
  }, [sendEmails]);

  // Function to retry failed/skipped emails
  const retryFailedEmails = useCallback(async (): Promise<EmailResult[]> => {
    if (failedEmails.length === 0) {
      return [];
    }

    emailSendLogger.info(`Retrying failed/skipped emails`, {
      count: failedEmails.length,
    });

    // Reset states
    setStoppedDueToError(false);
    setError(null);

    // Use the sendEmails function with failed emails
    const emailsToRetry = [...failedEmails];
    setFailedEmails([]);

    return sendEmails(emailsToRetry);
  }, [failedEmails, sendEmails]);

  return {
    sendEmails,
    retryFailedEmails,
    stopSending,
    resumeCampaign,
    clearSavedCampaign,
    progress,
    sendStatus,
    isLoading,
    isStopping,
    isPaused,
    isOffline,
    error,
    failedEmails,
    hasPendingRetries: failedEmails.length > 0,
    stoppedDueToError,
    hasSavedCampaign,
    savedCampaignInfo,
    quotaInfo,
    updateQuotaUsed,
    resetDailyQuota,
    checkTokenStatus,
  };
}
