"use client";

import * as React from "react";

/**
 * Skip Navigation Component
 * Provides keyboard-accessible skip links for screen readers and keyboard users
 */
export function SkipNavigation() {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <a
        href="#main-content"
        className="absolute top-0 left-0 z-50 px-4 py-2 m-2 text-sm font-medium text-white bg-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-transform transform -translate-y-full focus:translate-y-0"
      >
        Skip to main content
      </a>
      <a
        href="#main-navigation"
        className="absolute top-0 left-32 z-50 px-4 py-2 m-2 text-sm font-medium text-white bg-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-transform transform -translate-y-full focus:translate-y-0"
      >
        Skip to navigation
      </a>
    </div>
  );
}

/**
 * Main content wrapper with landmark
 * Use this to wrap your main page content
 */
export function MainContent({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      id="main-content"
      role="main"
      tabIndex={-1}
      className={`outline-none ${className}`}
      aria-label="Main content"
    >
      {children}
    </main>
  );
}

/**
 * Navigation wrapper with landmark
 * Use this to wrap your navigation elements
 */
export function NavigationLandmark({
  children,
  className = "",
  label = "Main navigation",
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <nav
      id="main-navigation"
      role="navigation"
      aria-label={label}
      className={className}
    >
      {children}
    </nav>
  );
}

/**
 * Screen reader only text
 * Visually hidden but accessible to screen readers
 */
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

/**
 * Announce content to screen readers
 * Use for dynamic content updates
 */
export function LiveRegion({
  children,
  politeness = "polite",
  atomic = true,
}: {
  children: React.ReactNode;
  politeness?: "polite" | "assertive" | "off";
  atomic?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      className="sr-only"
    >
      {children}
    </div>
  );
}

/**
 * Focus trap hook for modals and dialogs
 * Keeps focus within a container
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Tab" || !containerRef.current) {
      return;
    }

    const focusableElements =
      containerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement?.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement?.focus();
        e.preventDefault();
      }
    }
  };

  return { handleKeyDown };
}

/**
 * Focus management utilities
 * Helps manage focus for modals, dialogs, and dynamic content
 */
export function useFocusManagement() {
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  const saveFocus = () => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  };

  const restoreFocus = () => {
    if (previousFocusRef.current && "focus" in previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  };

  const focusFirst = (container: HTMLElement | null) => {
    if (!container) {
      return;
    }

    const focusable = container.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();
  };

  return { saveFocus, restoreFocus, focusFirst, previousFocusRef };
}

/**
 * Loading state announcer
 * Announces loading states to screen readers
 */
export function LoadingAnnouncer({
  isLoading,
  loadingMessage = "Loading...",
  completeMessage = "Content loaded",
}: {
  isLoading: boolean;
  loadingMessage?: string;
  completeMessage?: string;
}) {
  const [announced, setAnnounced] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading && announced) {
      // Small delay to ensure screen readers catch the change
      const timer = setTimeout(() => setAnnounced(false), 1000);
      return () => clearTimeout(timer);
    }
    if (isLoading) {
      setAnnounced(true);
    }
    return undefined;
  }, [isLoading, announced]);

  return (
    <LiveRegion politeness="polite">
      {isLoading ? loadingMessage : announced ? completeMessage : ""}
    </LiveRegion>
  );
}

/**
 * Error announcer
 * Announces errors to screen readers immediately
 */
export function ErrorAnnouncer({ error }: { error: string | null }) {
  return (
    <LiveRegion politeness="assertive">
      {error ? `Error: ${error}` : ""}
    </LiveRegion>
  );
}

/**
 * Accessible icon button
 * Ensures icon-only buttons have proper labels
 */
export function IconButton({
  icon,
  label,
  onClick,
  disabled = false,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-md p-2 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {icon}
      <VisuallyHidden>{label}</VisuallyHidden>
    </button>
  );
}

/**
 * Accessible form field wrapper
 * Provides proper labeling and error handling
 */
export function FormField({
  id,
  label,
  error,
  required = false,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required && (
          <span className="text-destructive ml-1" aria-hidden="true">
            *
          </span>
        )}
        {required && <VisuallyHidden>(required)</VisuallyHidden>}
      </label>

      {hint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}

      <div
        aria-describedby={
          [hint ? hintId : null, error ? errorId : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
      >
        {children}
      </div>

      {error && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Accessible table component
 * Provides proper table structure and captions
 */
export function AccessibleTable({
  caption,
  headers,
  rows,
  className = "",
}: {
  caption: string;
  headers: string[];
  rows: React.ReactNode[][];
  className?: string;
}) {
  return (
    <div className="overflow-x-auto" role="region" aria-label={caption}>
      <table className={`min-w-full divide-y divide-border ${className}`}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {headers.map((header, i) => (
              <th
                key={i}
                scope="col"
                className="px-4 py-3 text-left text-sm font-semibold"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 text-sm">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Keyboard navigation helper
 * Provides keyboard navigation for lists
 */
export function useKeyboardNavigation<T>(
  items: T[],
  onSelect: (item: T, index: number) => void,
  options: {
    loop?: boolean;
    orientation?: "horizontal" | "vertical";
  } = {},
) {
  const { loop = true, orientation = "vertical" } = options;
  const [focusedIndex, setFocusedIndex] = React.useState(0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const prevKey = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
    const nextKey = orientation === "vertical" ? "ArrowDown" : "ArrowRight";

    switch (e.key) {
      case prevKey:
        e.preventDefault();
        setFocusedIndex((prev) => {
          const newIndex = prev - 1;
          if (newIndex < 0) {
            return loop ? items.length - 1 : 0;
          }
          return newIndex;
        });
        break;
      case nextKey:
        e.preventDefault();
        setFocusedIndex((prev) => {
          const newIndex = prev + 1;
          if (newIndex >= items.length) {
            return loop ? 0 : items.length - 1;
          }
          return newIndex;
        });
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (items[focusedIndex]) {
          onSelect(items[focusedIndex], focusedIndex);
        }
        break;
      case "Home":
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case "End":
        e.preventDefault();
        setFocusedIndex(items.length - 1);
        break;
    }
  };

  return { focusedIndex, setFocusedIndex, handleKeyDown };
}

/**
 * ARIA live region for status updates
 */
export function StatusAnnouncer() {
  const [message, setMessage] = React.useState("");

  // Expose globally for use across the app
  React.useEffect(() => {
    (window as any).__announceStatus = (msg: string) => {
      setMessage("");
      // Force re-announcement by clearing and setting
      requestAnimationFrame(() => setMessage(msg));
    };

    return () => {
      delete (window as any).__announceStatus;
    };
  }, []);

  return <LiveRegion politeness="polite">{message}</LiveRegion>;
}

/**
 * Helper to announce status updates
 */
export function announceStatus(message: string) {
  if (typeof window !== "undefined" && (window as any).__announceStatus) {
    (window as any).__announceStatus(message);
  }
}
