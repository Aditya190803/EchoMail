"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { testAppwriteConnection } from "@/lib/appwrite";
import {
  Database,
  CheckCircle,
  XCircle,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export default function DebugPage() {
  const [appwriteStatus, setAppwriteStatus] = useState<
    "loading" | "success" | "error" | "untested"
  >("untested");
  const [appwriteError, setAppwriteError] = useState<string | null>(null);
  const [_campaignCount, setCampaignCount] = useState<number | null>(null);
  const [_contactCount, setContactCount] = useState<number | null>(null);

  const envVars = [
    {
      name: "GOOGLE_CLIENT_ID",
      value: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "Not set",
    },
    {
      name: "NEXTAUTH_URL",
      value: process.env.NEXT_PUBLIC_NEXTAUTH_URL || "Not set",
    },
    {
      name: "APPWRITE_PROJECT_ID",
      value: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "Not set",
    },
    {
      name: "APPWRITE_DATABASE_ID",
      value: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "Not set",
    },
  ];

  const testDatabase = async () => {
    setAppwriteStatus("loading");
    setAppwriteError(null);
    setCampaignCount(null);
    setContactCount(null);

    try {
      // Test Appwrite connection
      const result = await testAppwriteConnection();

      if (!result.success) {
        throw new Error(result.error);
      }

      setAppwriteStatus("success");
      setCampaignCount(0); // We'd need user context for real counts
      setContactCount(0);
    } catch (error) {
      setAppwriteStatus("error");
      setAppwriteError(
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Debug & Environment Check
          </h1>
        </div>

        {/* Environment Variables */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {envVars.map((env) => (
                <div
                  key={env.name}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <span className="font-mono text-sm">{env.name}</span>
                  <Badge
                    variant={
                      env.value === "Not set" ? "destructive" : "outline"
                    }
                  >
                    {env.value === "Not set" ? "❌ Not Set" : "✅ Set"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Appwrite Connection Test */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Appwrite Connection
              </CardTitle>
              <Button
                onClick={testDatabase}
                disabled={appwriteStatus === "loading"}
                size="sm"
                variant="outline"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${appwriteStatus === "loading" ? "animate-spin" : ""}`}
                />
                Test Connection
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">Status:</span>
              {appwriteStatus === "loading" && (
                <Badge variant="secondary" className="gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Testing...
                </Badge>
              )}
              {appwriteStatus === "success" && (
                <Badge
                  variant="outline"
                  className="gap-1 text-green-700 border-green-300 bg-green-50"
                >
                  <CheckCircle className="h-3 w-3" />
                  Connected
                </Badge>
              )}
              {appwriteStatus === "error" && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Failed
                </Badge>
              )}
              {appwriteStatus === "untested" && (
                <Badge variant="secondary">Not tested</Badge>
              )}
            </div>

            {appwriteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">
                  <strong>Error:</strong> {appwriteError}
                </p>
              </div>
            )}

            {appwriteStatus === "success" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="text-sm font-medium text-blue-900">
                    Connection Status
                  </div>
                  <div className="text-lg font-bold text-blue-700">Active</div>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="text-sm font-medium text-green-900">
                    Database
                  </div>
                  <div className="text-lg font-bold text-green-700">Ready</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {appwriteStatus === "error" && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-700">Troubleshooting</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p>If you're seeing connection errors, try these steps:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Check your Appwrite project configuration</li>
                  <li>Verify your environment variables are correct</li>
                  <li>
                    Ensure your Appwrite database and collections are created
                  </li>
                  <li>Check Appwrite collection permissions</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
