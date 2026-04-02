import * as React from "react";

import { cn } from "@/lib/utils";

type SurfaceTone = "default" | "tinted";
type SurfaceDensity = "comfortable" | "compact";

export const Surface = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    tone?: SurfaceTone;
    density?: SurfaceDensity;
  }
>(({ className, tone = "default", density = "comfortable", ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-tone={tone}
      data-density={density}
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden",
        className,
      )}
      {...props}
    />
  );
});
Surface.displayName = "Surface";

export const SurfaceHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { sticky?: boolean }
>(({ className, sticky = false, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sticky={sticky ? "true" : "false"}
      className={cn(
        "border-b bg-muted/10",
        sticky && "sticky top-0 z-10 backdrop-blur bg-card/70",
        className,
      )}
      {...props}
    />
  );
});
SurfaceHeader.displayName = "SurfaceHeader";

export const SurfaceSection = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    tone?: SurfaceTone;
    density?: SurfaceDensity;
    withDivider?: boolean;
  }
>(
  (
    {
      className,
      tone = "default",
      density = "comfortable",
      withDivider = true,
      ...props
    },
    ref,
  ) => {
    return (
      <section
        ref={ref}
        data-tone={tone}
        data-density={density}
        data-divider={withDivider ? "true" : "false"}
        className={cn(
          "px-4 md:px-6 lg:px-8 py-6",
          density === "compact" && "py-4",
          tone === "tinted" && "bg-primary/[0.035]",
          withDivider && "border-b border-border/70",
          className,
        )}
        {...props}
      />
    );
  },
);
SurfaceSection.displayName = "SurfaceSection";

export function SurfaceSectionHeader({
  icon,
  title,
  description,
  actions,
  className = "",
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div className="h-9 w-9 rounded-xl border bg-muted/20 flex items-center justify-center text-muted-foreground shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
