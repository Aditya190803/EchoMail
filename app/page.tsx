"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthButton } from "@/components/auth-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Users,
  Send,
  Sparkles,
  Zap,
  Shield,
  Clock,
  CheckCircle,
  ArrowRight,
  BarChart3,
  Globe,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Users,
    title: "CSV Personalization",
    description:
      "Upload CSV files and automatically personalize emails with recipient data. Support for unlimited custom fields.",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    icon: Sparkles,
    title: "Rich Text Editor",
    description:
      "Create stunning emails with our advanced WYSIWYG editor. Add formatting, links, and images effortlessly.",
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
  {
    icon: Send,
    title: "Gmail Integration",
    description:
      "Send directly through your Gmail account with full API integration. Maintain your sender reputation.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Zap,
    title: "Bulk Sending",
    description:
      "Send hundreds of personalized emails with a single click. Real-time progress tracking included.",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description:
      "Your data never leaves your control. OAuth authentication and GDPR-compliant data handling.",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
  {
    icon: Clock,
    title: "Real-time Preview",
    description:
      "Preview your personalized emails before sending. See exactly how each recipient will receive them.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
];

const stats = [
  { value: "10K+", label: "Emails Sent" },
  { value: "99.9%", label: "Delivery Rate" },
  { value: "500+", label: "Happy Users" },
  { value: "24/7", label: "Support" },
];

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if authenticated AND no session error (token refresh worked)
    if (status === "authenticated" && session && !session.error) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-md shadow-primary/20">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                EchoMail
              </span>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <AuthButton />
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="info" className="mb-6 px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Professional Email Campaigns Made Easy
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Send Personalized Emails with{" "}
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                EchoMail
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Send personalized emails at scale with EchoMail's powerful Gmail
              API integration. Upload CSV data, craft beautiful messages, and
              reach your audience with precision.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <AuthButton />
              <Button variant="outline" size="lg" asChild>
                <Link href="#features">
                  Learn More
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Trust badges */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                Free to start
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                GDPR compliant
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to succeed
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to make your email campaigns more
              effective and efficient.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} hover className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div
                      className={`inline-flex p-3 rounded-xl ${feature.bgColor} mb-4`}
                    >
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 lg:py-32 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              How it Works
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Start sending in minutes
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get your email campaigns up and running in just three simple
              steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Connect Gmail",
                description:
                  "Sign in with your Google account to securely connect your Gmail.",
                icon: Lock,
              },
              {
                step: "02",
                title: "Upload Recipients",
                description:
                  "Import your contacts via CSV or add them manually to your list.",
                icon: Users,
              },
              {
                step: "03",
                title: "Send Campaigns",
                description:
                  "Compose your message, preview, and send personalized emails.",
                icon: Send,
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="relative">
                  <div className="text-7xl font-bold text-primary/10 absolute -top-4 -left-2">
                    {item.step}
                  </div>
                  <div className="relative pt-8">
                    <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10 border-0 shadow-2xl">
            <CardContent className="p-8 md:p-12 text-center">
              <div className="inline-flex p-4 rounded-full bg-success/10 mb-6">
                <CheckCircle className="h-10 w-10 text-success" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to get started?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of users who trust EchoMail for their email
                campaigns. Sign in with Google and start sending in minutes.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <AuthButton />
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Used worldwide
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Real-time analytics
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Enterprise security
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
