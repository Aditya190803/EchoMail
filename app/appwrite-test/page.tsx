"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { testAppwriteConnection } from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";

export default function AppwriteTestPage() {
  const [testData, _setTestData] = useState<any[]>([]);
  const [testMessage, setTestMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const testAppwriteConnectionHandler = async () => {
    setIsLoading(true);
    try {
      componentLogger.debug("Testing Appwrite connection...");

      const result = await testAppwriteConnection();
      componentLogger.debug("Appwrite connection result", result);

      if (result.success) {
        alert(`Appwrite connection successful! Project: ${result.projectId}`);
      } else {
        alert("Appwrite connection failed: " + result.error);
      }
    } catch (error) {
      componentLogger.error(
        "Appwrite connection error",
        error instanceof Error ? error : undefined,
      );
      alert("Appwrite connection error: " + (error as Error).message);
    }
    setIsLoading(false);
  };

  const addTestDocument = async () => {
    if (!testMessage.trim()) return;

    setIsLoading(true);
    try {
      componentLogger.debug("Testing Appwrite - message saved", {
        testMessage,
      });

      // For testing, we just log the message since we don't have a test collection
      alert(
        `Would save message: ${testMessage}\n\nNote: This is a test page. Use the Contacts or Compose pages for actual data operations.`,
      );
      setTestMessage("");
    } catch (error) {
      componentLogger.error(
        "Error",
        error instanceof Error ? error : undefined,
      );
      alert("Error: " + (error as Error).message);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    testAppwriteConnectionHandler();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Appwrite Connection Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Enter test message"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={addTestDocument}
                disabled={isLoading || !testMessage.trim()}
              >
                {isLoading ? "Adding..." : "Add Test Document"}
              </Button>
            </div>

            <Button
              onClick={testAppwriteConnectionHandler}
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? "Testing..." : "Test Appwrite Connection"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Data ({testData.length} documents)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testData.length > 0 ? (
                testData.map((item) => (
                  <div key={item.id} className="p-3 bg-gray-100 rounded">
                    <div>
                      <strong>ID:</strong> {item.id}
                    </div>
                    <div>
                      <strong>Message:</strong> {item.message}
                    </div>
                    <div>
                      <strong>Created:</strong> {item.created_at}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No test data found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
