import type { QuotaInfo } from "@/types/campaign";

export const GMAIL_DAILY_LIMIT = 500;
export const QUOTA_STORAGE_KEY = "echomail_gmail_quota";

export const loadInitialQuota = (): QuotaInfo => {
  if (typeof window === "undefined") {
    return {
      dailyLimit: GMAIL_DAILY_LIMIT,
      estimatedUsed: 0,
      estimatedRemaining: GMAIL_DAILY_LIMIT,
      lastUpdated: null,
    };
  }

  try {
    const stored = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const lastUpdated = new Date(parsed.lastUpdated);
      const now = new Date();

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
        lastUpdated,
      };
    }
  } catch {
    // Fall through to defaults when quota cannot be parsed.
  }

  return {
    dailyLimit: GMAIL_DAILY_LIMIT,
    estimatedUsed: 0,
    estimatedRemaining: GMAIL_DAILY_LIMIT,
    lastUpdated: null,
  };
};

export const persistQuota = (quotaInfo: QuotaInfo) => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(quotaInfo));
};

export const clearQuota = () => {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(QUOTA_STORAGE_KEY);
};
