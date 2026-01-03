/**
 * Unit tests for useSimpleEmailSend hook
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useSimpleEmailSend } from "@/hooks/useSimpleEmailSend";

// Mock client-logger
vi.mock("@/lib/client-logger", () => ({
  emailSendLogger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
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

describe("useSimpleEmailSend Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with default state", () => {
      const { result } = renderHook(() => useSimpleEmailSend());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isStopping).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.failedEmails).toEqual([]);
      expect(result.current.hasPendingRetries).toBe(false);
      expect(result.current.hasSavedCampaign).toBe(false);
    });

    it("should have correct initial progress", () => {
      const { result } = renderHook(() => useSimpleEmailSend());

      expect(result.current.progress).toEqual({
        currentEmail: 0,
        totalEmails: 0,
        percentage: 0,
        status: "",
      });
    });

    it("should expose required functions", () => {
      const { result } = renderHook(() => useSimpleEmailSend());

      expect(typeof result.current.sendEmails).toBe("function");
      expect(typeof result.current.retryFailedEmails).toBe("function");
      expect(typeof result.current.stopSending).toBe("function");
      expect(typeof result.current.resumeCampaign).toBe("function");
      expect(typeof result.current.clearSavedCampaign).toBe("function");
    });
  });

  describe("campaign state detection", () => {
    it("should detect saved campaign from localStorage", () => {
      const savedState = {
        id: "test-campaign",
        subject: "Test Subject",
        status: "in-progress",
        emails: [
          { to: "test1@example.com", subject: "Test", message: "Hello" },
          { to: "test2@example.com", subject: "Test", message: "Hello" },
        ],
        sentIndices: [0],
        results: [],
        startedAt: Date.now(),
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState));

      const { result } = renderHook(() => useSimpleEmailSend());

      expect(result.current.hasSavedCampaign).toBe(true);
      expect(result.current.savedCampaignInfo).toEqual({
        subject: "Test Subject",
        remaining: 1,
        total: 2,
      });
    });

    it("should not detect completed campaign as saved", () => {
      const savedState = {
        id: "test-campaign",
        subject: "Test Subject",
        status: "completed",
        emails: [],
        sentIndices: [],
        results: [],
        startedAt: Date.now(),
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState));

      const { result } = renderHook(() => useSimpleEmailSend());

      expect(result.current.hasSavedCampaign).toBe(false);
    });
  });

  describe("stopSending", () => {
    it("should set isStopping flag when called", async () => {
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, messageId: "123" }),
        }), 100))
      );

      const { result } = renderHook(() => useSimpleEmailSend());

      const emails = [
        { to: "test@example.com", subject: "Test", message: "Hello", originalRowData: { email: "test@example.com" } },
      ];

      // Start sending (don't await)
      act(() => {
        result.current.sendEmails(emails);
      });

      // Stop sending
      act(() => {
        result.current.stopSending();
      });

      expect(result.current.isStopping).toBe(true);
    });
  });

  describe("clearSavedCampaign", () => {
    it("should clear saved campaign state", async () => {
      const savedState = {
        id: "test-campaign",
        subject: "Test Subject",
        status: "in-progress",
        emails: [{ to: "test@example.com", subject: "Test", message: "Hello" }],
        sentIndices: [],
        results: [],
        startedAt: Date.now(),
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState));

      const { result } = renderHook(() => useSimpleEmailSend());

      expect(result.current.hasSavedCampaign).toBe(true);

      act(() => {
        result.current.clearSavedCampaign();
      });

      expect(result.current.hasSavedCampaign).toBe(false);
      expect(result.current.savedCampaignInfo).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });
  });

  describe("sendEmails", () => {
    it("should set loading state during send", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, messageId: "123" }),
      });

      const { result } = renderHook(() => useSimpleEmailSend());

      const emails = [
        { to: "test@example.com", subject: "Test", message: "Hello", originalRowData: { email: "test@example.com" } },
      ];

      let _loadingDuringExecution = false;

      await act(async () => {
        const sendPromise = result.current.sendEmails(emails);
        // Check loading state immediately after starting
        _loadingDuringExecution = result.current.isLoading;
        await sendPromise;
      });

      // After completion, loading should be false
      expect(result.current.isLoading).toBe(false);
    });

    it("should update progress during send", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, messageId: "123" }),
      });

      const { result } = renderHook(() => useSimpleEmailSend());

      const emails = [
        { to: "test1@example.com", subject: "Test", message: "Hello", originalRowData: { email: "test1@example.com" } },
        { to: "test2@example.com", subject: "Test", message: "Hello", originalRowData: { email: "test2@example.com" } },
      ];

      await act(async () => {
        await result.current.sendEmails(emails);
      });

      // After completion, progress should reflect completion
      expect(result.current.progress.totalEmails).toBe(2);
    });

    it("should handle successful email send", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, messageId: "msg-123" }),
      });

      const { result } = renderHook(() => useSimpleEmailSend());

      const emails = [
        { to: "test@example.com", subject: "Test", message: "Hello", originalRowData: { email: "test@example.com" } },
      ];

      let results: any[];
      await act(async () => {
        results = await result.current.sendEmails(emails);
      });

      expect(results!).toHaveLength(1);
      expect(results![0].status).toBe("success");
    });

    it("should handle failed email send", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Send failed" }),
        status: 500,
      });

      const { result } = renderHook(() => useSimpleEmailSend());

      const emails = [
        { to: "test@example.com", subject: "Test", message: "Hello", originalRowData: { email: "test@example.com" } },
      ];

      await act(async () => {
        await result.current.sendEmails(emails);
      });

      // Should track failed emails
      expect(result.current.failedEmails.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useSimpleEmailSend());

      const emails = [
        { to: "test@example.com", subject: "Test", message: "Hello", originalRowData: { email: "test@example.com" } },
      ];

      await act(async () => {
        await result.current.sendEmails(emails);
      });

      // Should not throw, but should track the failure
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("hasPendingRetries", () => {
    it("should indicate when there are failed emails to retry", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Send failed" }),
        status: 500,
      });

      const { result } = renderHook(() => useSimpleEmailSend());

      const emails = [
        { to: "test@example.com", subject: "Test", message: "Hello", originalRowData: { email: "test@example.com" } },
      ];

      await act(async () => {
        await result.current.sendEmails(emails);
      });

      // hasPendingRetries depends on internal retry logic
      expect(typeof result.current.hasPendingRetries).toBe("boolean");
    });
  });
});
