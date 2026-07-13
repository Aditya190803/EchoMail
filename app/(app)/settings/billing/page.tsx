"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { CreditCard, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { Progress } from "@/components/ui/progress";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { startCheckout, useBilling } from "@/hooks/useBilling";
import { formatInr, type BillingInterval, type PlanId } from "@/lib/plans";

export default function BillingSettingsPage() {
  const { isLoading: authLoading } = useAuthGuard();
  const { data, loading, refresh, plan } = useBilling();
  const searchParams = useSearchParams();
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (searchParams.get("upgraded") === "1") {
      toast.success("Payment received — plan updates within a minute.");
      void refresh();
    }
  }, [searchParams, refresh]);

  if (authLoading || loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const usage = data?.usage;
  const contacts = data?.contacts;
  const dailyPct =
    plan && usage
      ? Math.min(100, (usage.emailsToday / plan.emailsPerDay) * 100)
      : 0;

  const upgrade = async (planId: PlanId) => {
    setBusy(true);
    try {
      await startCheckout(planId, interval);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Cancel failed");
      }
      toast.success(json.message || "Cancelled at period end");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell className="max-w-3xl">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            Billing
          </div>
        }
        description="Plan, usage, and payment"
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Current plan
              <Badge variant="secondary">{plan?.planName ?? "Free"}</Badge>
            </CardTitle>
            <CardDescription>
              Status: {plan?.status === "none" ? "active" : plan?.status}
              {plan?.cancelAtPeriodEnd && plan.currentPeriodEnd
                ? ` · cancels ${new Date(plan.currentPeriodEnd).toLocaleDateString()}`
                : plan?.currentPeriodEnd
                  ? ` · renews ${new Date(plan.currentPeriodEnd).toLocaleDateString()}`
                  : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Emails today</span>
                <span className="tabular-nums">
                  {usage?.emailsToday ?? 0} / {plan?.emailsPerDay ?? 100}
                </span>
              </div>
              <Progress value={dailyPct} />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">This month</div>
                <div className="font-medium tabular-nums">
                  {usage?.emailsThisMonth ?? 0} / {plan?.emailsPerMonth ?? 2000}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Contacts</div>
                <div className="font-medium tabular-nums">
                  {contacts?.used ?? 0} / {contacts?.max ?? 1000}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change plan</CardTitle>
            <CardDescription>
              Payments via Razorpay.{" "}
              <Link href="/pricing" className="underline underline-offset-2">
                Full comparison
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="inline-flex rounded-lg border p-1 bg-muted/40">
              <Button
                size="sm"
                variant={interval === "monthly" ? "default" : "ghost"}
                onClick={() => setInterval("monthly")}
              >
                Monthly
              </Button>
              <Button
                size="sm"
                variant={interval === "annual" ? "default" : "ghost"}
                onClick={() => setInterval("annual")}
              >
                Annual
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {data?.catalog
                .filter((p) => p.selfServe && p.id !== "free")
                .map((p) => {
                  const price =
                    interval === "annual"
                      ? p.priceInrAnnual
                      : p.priceInrMonthly;
                  const current = plan?.planId === p.id;
                  return (
                    <div
                      key={p.id}
                      className="rounded-xl border p-4 flex flex-col gap-2"
                    >
                      <div className="font-semibold flex items-center gap-2">
                        {p.name}
                        {p.popular && (
                          <Zap className="h-3.5 w-3.5 text-yellow-500" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {price != null ? formatInr(price) : "Custom"}/
                        {interval === "annual" ? "yr" : "mo"} ·{" "}
                        {p.limits.emailsPerDay}/day
                      </div>
                      <Button
                        size="sm"
                        disabled={busy || current}
                        onClick={() => void upgrade(p.id)}
                      >
                        {current ? "Current plan" : `Upgrade to ${p.name}`}
                      </Button>
                    </div>
                  );
                })}
            </div>

            <Button variant="outline" asChild>
              <Link href="/enterprise">Talk to Enterprise</Link>
            </Button>

            {plan && plan.planId !== "free" && plan.status === "active" && (
              <Button
                variant="ghost"
                className="text-destructive"
                disabled={busy}
                onClick={() => void cancel()}
              >
                Cancel at period end
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
