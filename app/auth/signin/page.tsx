"use client";

import { signIn, getSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SignIn() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getSession().then((session) => {
      if (session) {
        router.push("/dashboard");
      }
    });
  }, [router]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError("");
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch (_err) {
      setError("Failed to sign in with Google. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl w-fit">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Welcome to EchoMail
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Sign in to access your email dashboard
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Sign in with your Google account to access Gmail API and start
              sending emails.
            </p>
            <Button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3"
              size="lg"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Continue with Google
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </Button>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Secure:</strong> EchoMail uses OAuth 2.0 for secure
                authentication. Your credentials are never stored on our
                servers.
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By signing in, you agree to our Terms of Service and Privacy
              Policy
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
