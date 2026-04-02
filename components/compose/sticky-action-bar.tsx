import * as React from "react";

import { ChevronLeft, ChevronRight, Loader2, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ComposeSectionId = "recipients" | "compose" | "preview";

export function StickyActionBar({
  activeSection,
  recipientsCount,
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  onDispatch,
  isDispatching,
  dispatchDisabled,
  className,
}: {
  activeSection: ComposeSectionId;
  recipientsCount: number;
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
  onDispatch: () => void;
  isDispatching: boolean;
  dispatchDisabled: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t bg-background shadow-[0_-12px_30px_-20px_hsl(var(--foreground)/0.25)]",
        className,
      )}
      role="region"
      aria-label="Campaign actions"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="outline" className="bg-background/60">
              {activeSection}
            </Badge>
            <span className="hidden sm:inline text-sm text-muted-foreground">
              {recipientsCount} recipients
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={onBack}
              disabled={!canGoBack}
              className="bg-background"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {activeSection === "preview" ? (
              <Button
                onClick={onDispatch}
                disabled={dispatchDisabled || isDispatching}
                className="shadow-sm"
              >
                {isDispatching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Dispatching…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Dispatch
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={onNext}
                disabled={!canGoNext}
                className="shadow-sm"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
