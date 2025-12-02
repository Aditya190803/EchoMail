# ADR-001: API Route Architecture

## Status

Accepted

## Date

2024-01

## Context

EchoMail needs to communicate between the Next.js frontend and various backend services (Appwrite database, Gmail API, file storage). The application needs to:

1. Handle authentication tokens securely (not exposing them to the client)
2. Provide a consistent API for database operations
3. Manage Gmail OAuth tokens and refresh them when needed
4. Handle file uploads to Appwrite storage
5. Support server-side operations that can't run in the browser

We needed to decide on the architecture for these backend operations.

## Decision

We will use Next.js App Router API Routes (Route Handlers) as a Backend-for-Frontend (BFF) layer. All sensitive operations go through these routes:

```
/api/appwrite/*     - Database operations (contacts, campaigns, templates, etc.)
/api/send-email     - Bulk email sending with progress tracking
/api/send-single-email - Single email sending
/api/upload-attachment - File uploads to Appwrite storage
/api/refresh-token  - OAuth token refresh
/api/gdpr/*        - GDPR compliance operations
/api/teams/*       - Team management
```

### Key Implementation Details

1. **Server-side Appwrite Client**: Use `node-appwrite` SDK with API key on the server, avoiding client-side SDK complexity with authentication.

2. **Session-based User Context**: All API routes extract user email from NextAuth session to scope database queries.

3. **Client-side Service Layer**: The `lib/appwrite.ts` provides service objects that call API routes, abstracting the HTTP calls.

```typescript
// Client-side usage
export const contactsService = {
  async listByUser(userEmail: string) {
    return apiRequest('/api/appwrite/contacts')
  }
}

// Server-side API route
export async function GET() {
  const session = await getServerSession(authOptions)
  const contacts = await databases.listDocuments(...)
}
```

## Consequences

### Positive

- **Security**: API keys and OAuth tokens never exposed to client
- **Simplicity**: Single authentication model via NextAuth sessions
- **Flexibility**: Can add middleware, rate limiting, logging to API routes
- **Type Safety**: Shared types between client and server
- **Edge Compatibility**: Works with Vercel Edge runtime where needed

### Negative

- **Latency**: Extra hop through API routes adds some latency
- **No Real-time**: Can't use Appwrite's real-time subscriptions directly (requires polling)
- **Coupling**: Frontend depends on API route structure

### Neutral

- All database operations are centralized, making it easier to add audit logging

## Alternatives Considered

### Alternative 1: Direct Appwrite Client SDK

Using the Appwrite Web SDK directly from the client.

**Rejected because**:

- Would require creating Appwrite sessions for each user
- NextAuth doesn't create Appwrite sessions
- Would expose database IDs and structure to client
- More complex authentication flow

### Alternative 2: Separate Backend Service

Running a separate Express/Fastify backend.

**Rejected because**:

- Added infrastructure complexity
- Separate deployment and monitoring
- Next.js API routes provide sufficient functionality
- Would increase hosting costs

### Alternative 3: Server Actions Only

Using Next.js Server Actions for all mutations.

**Rejected because**:

- API routes provide better control for complex operations
- Easier to implement progress tracking for bulk operations
- Better suited for file uploads
- Server Actions are still used for simple mutations

## References

- [Next.js Route Handlers Documentation](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Appwrite Server SDKs](https://appwrite.io/docs/sdks#server)
