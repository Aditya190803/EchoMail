import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, vi } from "vitest";

process.env.NODE_ENV = "test";
process.env.GOOGLE_CLIENT_ID ??= "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET ??= "test-google-client-secret";
process.env.NEXTAUTH_URL ??= "http://localhost:3000";
process.env.NEXTAUTH_SECRET ??= "test-nextauth-secret";
process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ??= "https://localhost/v1";
process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ??= "test-project-id";
process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ??= "test-database-id";
process.env.APPWRITE_API_KEY ??= "test-appwrite-api-key";

if (typeof window === "undefined" || typeof document === "undefined") {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    Event: dom.window.Event,
    CustomEvent: dom.window.CustomEvent,
    KeyboardEvent: dom.window.KeyboardEvent,
    requestAnimationFrame: (callback: FrameRequestCallback) =>
      setTimeout(() => callback(Date.now()), 16),
    cancelAnimationFrame: (id: number) => clearTimeout(id),
  });
}

for (const storageKey of ["localStorage", "sessionStorage"] as const) {
  Object.defineProperty(globalThis, storageKey, {
    configurable: true,
    get: () => window[storageKey],
    set: (value) => {
      Object.defineProperty(window, storageKey, {
        configurable: true,
        writable: true,
        value,
      });
    },
  });
}

type VitestCompat = typeof vi & {
  mocked?: <T>(item: T) => T;
  hoisted?: <T>(factory: () => T) => T;
  useFakeTimers?: () => void;
  useRealTimers?: () => void;
  setSystemTime?: (time: number | string | Date) => void;
  advanceTimersByTime?: (ms: number) => void;
  resetModules?: () => void;
};

const viCompat = vi as VitestCompat;
const RealDate = Date;
const realDateNow = RealDate.now.bind(RealDate);
let mockedNow = realDateNow();
let fakeTimersEnabled = false;

viCompat.mocked ??= <T>(item: T) => item;
viCompat.hoisted ??= <T>(factory: () => T) => factory();
viCompat.useFakeTimers ??= () => {
  if (!fakeTimersEnabled) {
    mockedNow = realDateNow();
  }

  class MockDate extends RealDate {
    constructor(...args: any[]) {
      super(...(args.length === 0 ? [mockedNow] : args));
    }

    static now() {
      return mockedNow;
    }
  }

  fakeTimersEnabled = true;
  globalThis.Date = MockDate as DateConstructor;
};
viCompat.setSystemTime ??= (time: number | string | Date) => {
  mockedNow = new RealDate(time).getTime();
  viCompat.useFakeTimers?.();
};
viCompat.advanceTimersByTime ??= (ms: number) => {
  mockedNow += ms;
};
viCompat.useRealTimers ??= () => {
  fakeTimersEnabled = false;
  globalThis.Date = RealDate;
};
viCompat.resetModules ??= () => {};

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: {
      user: {
        email: "test@example.com",
        name: "Test User",
      },
      accessToken: "mock-token",
    },
    status: "authenticated",
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock fetch globally
global.fetch = vi.fn();

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  viCompat.useRealTimers?.();
  (vi as any).doUnmock?.("@/lib/logger");
  (vi as any).doUnmock?.("@/lib/auth");
  (vi as any).resetModules?.();
});
