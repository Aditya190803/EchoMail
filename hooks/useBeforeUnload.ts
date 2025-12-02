"use client";

import { useEffect, useCallback } from "react";

/**
 * Hook to warn users before leaving a page with unsaved changes
 * @param shouldWarn - Whether to show the warning
 * @param message - Optional custom message (browsers may not display it)
 */
export function useBeforeUnload(shouldWarn: boolean, message?: string) {
  const handleBeforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      if (shouldWarn) {
        e.preventDefault();
        // Modern browsers require returnValue to be set
        e.returnValue =
          message ||
          "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    },
    [shouldWarn, message],
  );

  useEffect(() => {
    if (shouldWarn) {
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }
  }, [shouldWarn, handleBeforeUnload]);
}
