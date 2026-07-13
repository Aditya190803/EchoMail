"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Check, Sparkles, Zap } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { startCheckout } from "@/hooks/useBilling";
import {
  formatInr,
  PLAN_ORDER,
  PLANS,
  type BillingInterval,
  type PlanId,
} from "@/lib/plans";

const FEATURE_ROWS: Array<{
  label: string;
  key: keyof typeof PLANS.free.limits.features | "emailsPerDay" | "contacts";
}> = [
  { label: "Emails per day", key: "emailsPerDay" },
  { label: "Contacts", key: "contacts" },
  { label: "Advanced analytics", key: "advancedAnalytics" },
  { label: "Report export", key: "exportReports" },
  { label: "A/B testing", key: "abTesting" },
  { label: "Drip campaigns", key: "drip" },
  { label: "Webhooks", key: "webhooks" },
  { label: "Teams", key: "teams" },
];

export default function PricingPage() {
  const { status } = useSession();
  const router = useRouter();
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);

  const onSelect = async (planId: PlanId) => {
    if (planId === "free") {
      router.push(status === "authenticated" ? "/dashboard" : "/");
      return;
    }
    if (planId === "enterprise") {
      router.push("/enterprise");
      return;
    }
    if (status !== "authenticated") {
      toast.message("Sign in to upgrade");
      router.push("/");
      return;
    }

    setLoadingPlan(planId);
    try {
      await startCheckout(planId, interval);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <Badge variant="secondary" className="mb-4">
          Pricing
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          Simple plans for every sender
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Free forever to start. Unlock analytics on Insights. Full product on
          Pro (500 emails/day — Gmail&apos;s free-account ceiling). Enterprise
          is custom.
        </p>

        <div className="mt-8 inline-flex items-center rounded-lg border p-1 bg-muted/40">
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
            <span className="ml-1.5 text-[10px] opacity-80">2 mo free</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const price =
            interval === "annual" ? plan.priceInrAnnual : plan.priceInrMonthly;
          const isPopular = plan.popular;

          return (
            <Card
              key={id}
              className={`relative flex flex-col ${
                isPopular ? "border-primary shadow-lg shadow-primary/10" : ""
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="gap-1">
                    <Sparkles className="h-3 w-3" /> Most popular
                  </Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {plan.name}
                  {id === "pro" && <Zap className="h-4 w-4 text-yellow-500" />}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-4">
                  {price === null ? (
                    <div className="text-2xl font-bold">Custom</div>
                  ) : price === 0 ? (
                    <div className="text-2xl font-bold">Free</div>
                  ) : (
                    <div>
                      <span className="text-3xl font-bold">
                        {formatInr(price)}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        /{interval === "annual" ? "year" : "month"}
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  {plan.limits.emailsPerDay} emails / day
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  {plan.limits.contacts.toLocaleString()} contacts
                </div>
                {FEATURE_ROWS.filter(
                  (r) =>
                    r.key !== "emailsPerDay" &&
                    r.key !== "contacts" &&
                    plan.limits.features[
                      r.key as keyof typeof plan.limits.features
                    ],
                ).map((r) => (
                  <div key={r.label} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    {r.label}
                  </div>
                ))}
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={isPopular ? "default" : "outline"}
                  disabled={loadingPlan === id}
                  onClick={() => void onSelect(id)}
                >
                  {loadingPlan === id
                    ? "Opening…"
                    : id === "free"
                      ? "Get started"
                      : id === "enterprise"
                        ? "Contact sales"
                        : `Upgrade to ${plan.name}`}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-10">
        Payments via Razorpay (UPI, cards, netbanking).{" "}
        <Link href="/enterprise" className="underline underline-offset-2">
          Need custom limits?
        </Link>
      </p>
    </div>
  );
}
