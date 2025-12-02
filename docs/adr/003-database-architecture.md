# ADR-003: Appwrite as Primary Database

## Status

Accepted

## Date

2024-01

## Context

EchoMail needs a database to store:

- User contacts
- Email campaigns and their results
- Email templates
- Draft emails
- Contact groups
- User signatures
- Unsubscribe lists
- A/B test configurations
- Webhooks
- Audit logs

Requirements:

- No server infrastructure to manage
- File storage for attachments
- User data isolation
- Good developer experience
- Cost-effective for small to medium scale

## Decision

We will use **Appwrite** as our primary database and file storage solution.

### Architecture

```
[Next.js App] --> [API Routes] --> [Appwrite Cloud]
                                        ├── Database (collections)
                                        └── Storage (file buckets)
```

### Collections Structure

```
Database: echomail
├── contacts           - User's email contacts
├── campaigns          - Email campaign records
├── templates          - Email templates
├── template_versions  - Template version history
├── contact_groups     - Contact grouping
├── draft_emails       - Saved email drafts
├── signatures         - Email signatures
├── unsubscribes      - Unsubscribed emails
├── webhooks          - User webhook configurations
├── ab_tests          - A/B test campaigns
├── tracking_events   - Email open/click tracking
├── audit_logs        - User action audit trail
├── consents          - GDPR consent records
├── teams             - Team/organization records
└── team_members      - Team membership
```

### Storage Buckets

```
├── attachments       - Email attachment files
```

### Data Isolation

All collections use `user_email` attribute for data isolation:

```typescript
// Every query filters by user
const contacts = await databases.listDocuments(
  DATABASE_ID,
  COLLECTIONS.CONTACTS,
  [Query.equal("user_email", session.user.email)],
);
```

## Consequences

### Positive

- **Managed Service**: No database server to maintain
- **Built-in Storage**: File attachments in same ecosystem
- **SDK Quality**: Good TypeScript support with `node-appwrite`
- **Free Tier**: Generous free tier for development and small projects
- **Self-Hostable**: Can self-host Appwrite if needed later
- **Real-time**: Supports real-time subscriptions (though not currently used)

### Negative

- **Query Limitations**: Less flexible than SQL for complex queries
- **No Joins**: Must denormalize or do client-side joins
- **Vendor Lock-in**: Data model tied to Appwrite's structure
- **Rate Limits**: Need to respect API rate limits

### Neutral

- Document-based model fits our data well
- Learning curve for developers new to Appwrite

## Data Model Examples

### Contact Document

```json
{
  "$id": "unique_id",
  "email": "contact@example.com",
  "name": "John Doe",
  "company": "Acme Inc",
  "tags": "[\"customer\", \"vip\"]",
  "user_email": "owner@example.com",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Campaign Document

```json
{
  "$id": "campaign_id",
  "subject": "Newsletter",
  "content": "<html>...</html>",
  "recipients": "[\"a@b.com\", \"c@d.com\"]",
  "sent": 100,
  "failed": 2,
  "status": "completed",
  "send_results": "[{...}]",
  "user_email": "owner@example.com",
  "created_at": "2024-01-01T00:00:00Z"
}
```

## Alternatives Considered

### Alternative 1: PostgreSQL (Supabase/Neon)

Using a managed PostgreSQL service.

**Rejected because**:

- More complex setup for file storage
- Overkill for current query needs
- Higher learning curve for team

### Alternative 2: MongoDB Atlas

Using managed MongoDB.

**Rejected because**:

- More expensive at scale
- No built-in file storage
- Appwrite provides similar document model with extras

### Alternative 3: Firebase

Using Firebase Firestore + Storage.

**Rejected because**:

- More complex pricing model
- Less control over data
- Appwrite offers better self-hosting option

## Migration Path

If we need to migrate away from Appwrite:

1. Export all documents using Appwrite CLI
2. Transform JSON to target format
3. Use Repository pattern (ADR-007) to minimize code changes
4. Update database adapter implementation

## References

- [Appwrite Documentation](https://appwrite.io/docs)
- [Appwrite Node SDK](https://github.com/appwrite/sdk-for-node)
- [Appwrite Cloud](https://cloud.appwrite.io/)
