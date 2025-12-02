"use client";

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
    if (e.key !== "Tab" || !containerRef.current) return;

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
