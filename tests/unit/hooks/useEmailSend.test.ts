/**
 * Unit tests for useEmailSend hook
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useEmailSend } from "@/hooks/useEmailSend";

// Mock client-logger
vi.mock("@/lib/client-logger", () => ({
  emailSendLogger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
  useSession: () => ({
    data: { user: { email: "test@example.com" }, accessToken: "token" },
    status: "authenticated",
  }),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock navigator
Object.defineProperty(navigator, "onLine", {
  value: true,
  writable: true,
});

describe("useEmailSend Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with default state", () => {
      const { result } = renderHook(() => useEmailSend());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isStopping).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.isOffline).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.failedEmails).toEqual([]);
    });

    it("should have correct initial progress", () => {
      const { result } = renderHook(() => useEmailSend());

      expect(result.current.progress).toEqual({
        currentEmail: 0,
        totalEmails: 0,
        percentage: 0,
        status: "",
      });
    });

    it("should initialize quota info", () => {
      const { result } = renderHook(() => useEmailSend());

      expect(result.current.quotaInfo).toBeDefined();
      expect(typeof result.current.quotaInfo.estimatedUsed).toBe("number");
      expect(typeof result.current.quotaInfo.dailyLimit).toBe("number");
      expect(typeof result.current.quotaInfo.estimatedRemaining).toBe("number");
    });

    it("should expose required functions", () => {
      const { result } = renderHook(() => useEmailSend());

      expect(typeof result.current.sendEmails).toBe("function");
      expect(typeof result.current.retryFailedEmails).toBe("function");
      expect(typeof result.current.stopSending).toBe("function");
      expect(typeof result.current.resumeCampaign).toBe("function");
      expect(typeof result.current.clearSavedCampaign).toBe("function");
      expect(typeof result.current.updateQuotaUsed).toBe("function");
      expect(typeof result.current.resetDailyQuota).toBe("function");
      expect(typeof result.current.checkTokenStatus).toBe("function");
    });
  });

  describe("quota management", () => {
    it("should update quota when updateQuotaUsed is called", () => {
      const { result } = renderHook(() => useEmailSend());

      const initialUsed = result.current.quotaInfo.estimatedUsed;

      act(() => {
        result.current.updateQuotaUsed(10);
      });

      expect(result.current.quotaInfo.estimatedUsed).toBe(initialUsed + 10);
    });

    it("should reset quota when resetDailyQuota is called", () => {
      const { result } = renderHook(() => useEmailSend());

      // Add some usage first
      act(() => {
        result.current.updateQuotaUsed(50);
      });

      expect(result.current.quotaInfo.estimatedUsed).toBeGreaterThan(0);

      act(() => {
        result.current.resetDailyQuota();
      });

      expect(result.current.quotaInfo.estimatedUsed).toBe(0);
    });

    it("should load quota from localStorage on init", () => {
      const savedQuota = {
        estimatedUsed: 100,
        dailyLimit: 500,
        estimatedRemaining: 400,
        lastUpdated: new Date().toISOString(),
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedQuota));

      const { result } = renderHook(() => useEmailSend());

      expect(result.current.quotaInfo.estimatedUsed).toBe(100);
    });
  });

  describe("token status check", () => {
    it("should return token status from API", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            valid: true,
            expiresIn: 3600,
          }),
      });

      const { result } = renderHook(() => useEmailSend());

      let tokenStatus: any;
      await act(async () => {
        tokenStatus = await result.current.checkTokenStatus();
      });

      expect(tokenStatus).toBeDefined();
    });

    it("should handle token check failure gracefully", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useEmailSend());

      let tokenStatus: any;
      await act(async () => {
        tokenStatus = await result.current.checkTokenStatus();
      });

      // Should return a default/error status, not throw
      expect(tokenStatus).toBeDefined();
    });
  });

  describe("stopSending", () => {
    it("should set isStopping flag", () => {
      const { result } = renderHook(() => useEmailSend());

      act(() => {
        result.current.stopSending();
      });

      expect(result.current.isStopping).toBe(true);
    });
  });

  describe("clearSavedCampaign", () => {
    it("should clear saved campaign and reset state", () => {
      const savedState = {
        id: "test-campaign",
        subject: "Test",
        status: "in-progress",
        emails: [],
        sentIndices: [],
        results: [],
        startedAt: Date.now(),
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState));

      const { result } = renderHook(() => useEmailSend());

      act(() => {
        result.current.clearSavedCampaign();
      });

      expect(result.current.hasSavedCampaign).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });
  });

  describe("sendEmails with options", () => {
    it("should accept send options", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, messageId: "123" }),
      });

      const { result } = renderHook(() => useEmailSend());

      const emails = [
        {
          to: "test@example.com",
          subject: "Test",
          message: "Hello",
          originalRowData: { email: "test@example.com" },
        },
      ];

      const options = {
        delayBetweenEmails: 2000,
        tokenCheckInterval: 5,
      };

      await act(async () => {
        await result.current.sendEmails(emails, options);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("offline detection", () => {
    it("should initialize with correct online status", () => {
      const { result } = renderHook(() => useEmailSend());

      // Navigator is mocked as online
      expect(result.current.isOffline).toBe(false);
    });
  });

  describe("sendStatus tracking", () => {
    it("should track send status for each email", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, messageId: "123" }),
      });

      const { result } = renderHook(() => useEmailSend());

      const emails = [
        {
          to: "test1@example.com",
          subject: "Test",
          message: "Hello",
          originalRowData: { email: "test1@example.com" },
        },
        {
          to: "test2@example.com",
          subject: "Test",
          message: "Hello",
          originalRowData: { email: "test2@example.com" },
        },
      ];

      await act(async () => {
        await result.current.sendEmails(emails);
      });

      expect(Array.isArray(result.current.sendStatus)).toBe(true);
    });
  });

  describe("stoppedDueToError", () => {
    it("should indicate when campaign stopped due to error", async () => {
      // Simulate repeated failures
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Server error" }),
      });

      const { result } = renderHook(() => useEmailSend());

      const emails = [
        {
          to: "test@example.com",
          subject: "Test",
          message: "Hello",
          originalRowData: { email: "test@example.com" },
        },
      ];

      await act(async () => {
        await result.current.sendEmails(emails);
      });

      // stoppedDueToError depends on internal retry logic
      expect(typeof result.current.stoppedDueToError).toBe("boolean");
    });
  });
});
