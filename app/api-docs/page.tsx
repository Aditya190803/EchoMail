"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

/**
 * API Documentation Page
 *
 * This page provides interactive API documentation using Swagger UI.
 * It loads the OpenAPI specification from /public/openapi.json
 */
export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            EchoMail API Documentation
          </h1>
          <p className="text-muted-foreground">
            Interactive API documentation for the EchoMail email campaign
            platform. All endpoints require authentication via NextAuth.js
            session.
          </p>
        </header>

        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <SwaggerUI
            url="/openapi.json"
            docExpansion="list"
            defaultModelsExpandDepth={-1}
            displayRequestDuration={true}
            filter={true}
            showExtensions={true}
            showCommonExtensions={true}
          />
        </div>

        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            For more information, see the{" "}
            <a href="/docs/API.md" className="text-primary hover:underline">
              API Markdown Documentation
            </a>{" "}
            or the{" "}
            <a
              href="/docs/DEVELOPER_GUIDE.md"
              className="text-primary hover:underline"
            >
              Developer Guide
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
