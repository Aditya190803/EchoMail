# ADR-005: Sequential Email Sending with Gmail API

## Status

Accepted

## Date

2024-01

## Context

EchoMail needs to send bulk emails through users' Gmail accounts. Key requirements:

1. Send emails from user's actual Gmail address
2. Handle hundreds or thousands of recipients
3. Respect Gmail's rate limits and quotas
4. Provide progress feedback during sending
5. Handle failures gracefully with retry logic
6. Allow stopping/resuming long campaigns
7. Support personalized content per recipient

Gmail API limitations:

- Free Gmail: ~100-500 emails/day (varies)
- Google Workspace: ~2000 emails/day
- Rate limiting can occur during bursts
- Large attachments slow down API calls

## Decision

We will send emails **sequentially, one at a time** with the following architecture:

### Client-Side Hook

```typescript
// hooks/useEmailSend.ts
export function useEmailSend() {
  const sendEmails = async (emails: PersonalizedEmailData[]) => {
    for (const email of emails) {
      // 1. Check if should stop
      if (shouldStopRef.current) break;

      // 2. Wait for network if offline
      await waitForNetwork();

      // 3. Check/refresh token
      if (needsTokenRefresh()) {
        await refreshToken();
      }

      // 4. Send single email
      await sendSingleEmail(email);

      // 5. Delay before next
      await delay(currentDelayRef.current);

      // 6. Update progress
      updateProgress(i + 1, emails.length);
    }
  };
}
```

### Server-Side API

```typescript
// api/send-single-email/route.ts
export async function POST(request: Request) {
  // 1. Validate session
  // 2. Pre-resolve attachments (if not done)
  // 3. Send via Gmail API
  // 4. Return result
}
```

### Optimization: Pre-built Email Templates

For campaigns with attachments, we pre-build the MIME template once:

```typescript
// Pre-build template before loop
await preBuildEmailTemplate(accessToken, subject, html, attachments);

// Fast send per recipient (only swaps To: header)
for (const recipient of recipients) {
  await sendEmailWithTemplate(accessToken, recipient.email);
}
```

## Consequences

### Positive

- **Rate Limit Safety**: Controlled send rate prevents Gmail blocks
- **Fault Tolerance**: Single email failure doesn't stop campaign
- **Resumable**: Can stop and continue from where left off
- **Progress Visibility**: Real-time progress updates
- **Personalization**: Each email can have unique content
- **Attachment Efficiency**: Templates pre-built once for all emails

### Negative

- **Slower**: Takes longer than parallel sends
- **Session Dependent**: Requires browser tab to stay open
- **Client Resources**: Uses client CPU/memory for duration

### Neutral

- Gmail's rate limiting would prevent parallel sends anyway
- Users can monitor progress in real-time

## Error Handling Strategy

### Retry Logic

```typescript
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

async function sendWithRetry(email: PersonalizedEmailData) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await sendEmail(email);
    } catch (error) {
      if (isRateLimitError(error)) {
        await exponentialBackoff();
      } else if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS);
      } else {
        throw error;
      }
    }
  }
}
```

### Rate Limit Backoff

```typescript
const RATE_LIMIT_INITIAL_DELAY = 60000; // 1 minute
const RATE_LIMIT_MAX_DELAY = 300000; // 5 minutes

let backoffDelay = RATE_LIMIT_INITIAL_DELAY;

function exponentialBackoff() {
  backoffDelay = Math.min(backoffDelay * 2, RATE_LIMIT_MAX_DELAY);
  return delay(backoffDelay);
}
```

### Campaign Persistence

```typescript
// Save state to localStorage
const campaignState = {
  id: campaignId,
  emails: allEmails,
  sentIndices: [0, 1, 2...],
  failedIndices: [5],
  status: 'in-progress'
}
localStorage.setItem(CAMPAIGN_STATE_KEY, JSON.stringify(campaignState))
```

## Progress Tracking

```typescript
interface EmailProgress {
  currentEmail: number;
  totalEmails: number;
  percentage: number;
  status: string; // "Sending to user@example.com..."
}
```

Updates sent to UI every email, showing:

- X of Y emails sent
- Current recipient (partially masked)
- Estimated time remaining
- Network status
- Token status

## Alternatives Considered

### Alternative 1: Parallel Sending

Send multiple emails concurrently.

**Rejected because**:

- Gmail rate limits would trigger immediately
- Harder to handle failures
- No benefit due to rate limiting

### Alternative 2: Queue-Based Backend

Use a job queue (Bull, etc.) for background sending.

**Rejected because**:

- Requires persistent backend infrastructure
- More complex deployment
- User can't see real-time progress easily
- Token refresh more complex

### Alternative 3: Gmail Batch API

Use Gmail's batch API endpoint.

**Rejected because**:

- Batch is for reading, not sending
- No batch send endpoint exists
- Would still need sequential for sending

### Alternative 4: Third-Party Email Service

Use SendGrid/Mailgun with Gmail SMTP relay.

**Rejected because**:

- Adds cost
- Different email headers (not pure Gmail)
- User's Gmail quota still applies

## Performance Optimizations

1. **Pre-resolve Attachments**: Download from Appwrite once, cache in memory
2. **Pre-build MIME Template**: Build full email body once, swap headers per recipient
3. **Connection Reuse**: Gmail API reuses HTTP connections
4. **Progress Batching**: Update UI every email, not every byte

## Quota Management

```typescript
interface QuotaInfo {
  dailyLimit: number; // 500 for free Gmail
  estimatedUsed: number; // Count from localStorage
  estimatedRemaining: number;
  lastUpdated: Date;
}
```

- Track estimated usage in localStorage
- Reset at midnight UTC
- Warn user when approaching limit
- Conservative estimates (may be more available)

## References

- [Gmail API Send Limits](https://developers.google.com/gmail/api/reference/quota)
- [Gmail Sending Limits](https://support.google.com/a/answer/166852)
- [MIME Message Format](https://datatracker.ietf.org/doc/html/rfc2045)
