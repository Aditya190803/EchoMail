import React from "react";

/* ─────────────────────────────────────────────────────────── *
 *  PageShell — outermost constraint for every protected page  *
 * ─────────────────────────────────────────────────────────── */
export function PageShell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 ${className}`}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── *
 *  PageHeader — consistent title / description / actions row  *
 * ─────────────────────────────────────────────────────────── */
interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}
export function PageHeader({
  title,
  description,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}
    >
      <div className="space-y-1 min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <div className="text-sm text-muted-foreground">{description}</div>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── *
 *  EmptyState — shared zero-state display                     *
 * ─────────────────────────────────────────────────────────── */
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-20 text-center ${className}`}
    >
      <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-5 text-muted-foreground">
        {icon}
      </div>
      <h3 className="text-base font-semibold mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs mb-5">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── *
 *  StatCard — left-border accented KPI card                   *
 * ─────────────────────────────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  trend?: { direction: "up" | "down" | "same"; label: string };
  accentClass?: string; // e.g. "border-blue-500"
  children?: React.ReactNode; // slot for sparkline
}
export function StatCard({
  label,
  value,
  sub,
  icon,
  trend,
  accentClass = "border-primary",
  children,
}: StatCardProps) {
  const trendColour =
    trend?.direction === "up"
      ? "text-emerald-500"
      : trend?.direction === "down"
        ? "text-destructive"
        : "text-muted-foreground";
  const trendArrow =
    trend?.direction === "up" ? "↑" : trend?.direction === "down" ? "↓" : "→";

  return (
    <div
      className={`rounded-xl border-l-4 bg-card p-5 hover:shadow-md transition-all duration-200 ${accentClass}`}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="p-2 bg-muted/40 rounded-lg shrink-0">{icon}</div>
      </div>
      <div className="space-y-1">
        <p className="text-3xl font-bold tracking-tight tabular-nums">
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        {trend && (
          <p className={`text-xs font-medium ${trendColour}`}>
            {trendArrow} {trend.label}
          </p>
        )}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── *
 *  SectionHeader — card-internal section label               *
 * ─────────────────────────────────────────────────────────── */
export function SectionHeader({
  title,
  action,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {action}
    </div>
  );
}
