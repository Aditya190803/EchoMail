"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AuthTestPage() {
  const { data: session, status: _status } = useSession();
  const [testResult, setTestResult] = useState<string>("");
  const testGmailAccess = async () => {
    if (!session?.accessToken) {
      setTestResult("❌ No access token available");
      return;
    }

    try {
      // Test 1: Basic Gmail profile access (requires gmail.readonly)
      setTestResult("Testing Gmail profile access...");
      const profileResponse = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/profile",
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        },
      );

      let result = "🧪 Gmail API Scope Tests:\n\n";

      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        result += `✅ Gmail Profile Access: SUCCESS\n`;
        result += `   Email: ${profile.emailAddress}\n`;
        result += `   Messages Total: ${profile.messagesTotal}\n\n`;
      } else {
        const error = await profileResponse.text();
        result += `❌ Gmail Profile Access: FAILED\n`;
        result += `   Error: ${error}\n\n`;
      }

      // Test 2: Test OAuth token info to see what scopes we actually have
      setTestResult(result + "Checking OAuth token scopes...");
      const tokenInfoResponse = await fetch(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${session.accessToken}`,
      );

      if (tokenInfoResponse.ok) {
        const tokenInfo = await tokenInfoResponse.json();
        result += `✅ Token Info Retrieved:\n`;
        result += `   Scopes: ${tokenInfo.scope}\n`;
        result += `   Expires in: ${tokenInfo.expires_in} seconds\n\n`;
      } else {
        result += `❌ Could not retrieve token info\n\n`;
      }

      setTestResult(result);
    } catch (error) {
      setTestResult(`❌ Error testing Gmail access: ${error}`);
    }
  };

  const refreshAuth = async () => {
    try {
      await signOut({ redirect: false });
      setTimeout(() => {
        signIn("google");
      }, 1000);
    } catch (error) {
      setTestResult(`❌ Error refreshing auth: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {session ? (
                <>
                  {" "}
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800">
                      ✅ Signed in as: {session.user?.email}
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      Token available: {session.accessToken ? "Yes" : "No"}
                    </p>
                    {session.error && (
                      <p className="text-sm text-red-600 mt-1">
                        ⚠️ Token error: {session.error}
                      </p>
                    )}
                  </div>
                  <Button onClick={testGmailAccess} className="w-full">
                    Test Gmail API Access
                  </Button>
                  <Button
                    onClick={refreshAuth}
                    variant="outline"
                    className="w-full"
                  >
                    Refresh Authentication
                  </Button>
                  <Button
                    onClick={() => signOut()}
                    variant="destructive"
                    className="w-full"
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800">❌ Not signed in</p>
                  </div>

                  <Button onClick={() => signIn("google")} className="w-full">
                    Sign In with Google
                  </Button>
                </>
              )}
            </div>

            {testResult && (
              <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
