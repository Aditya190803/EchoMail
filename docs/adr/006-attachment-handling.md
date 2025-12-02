# ADR-006: Attachment Storage and Delivery

## Status

Accepted

## Date

2024-01

## Context

EchoMail users need to attach files to their emails. Requirements:

1. Support common file types (PDF, images, documents)
2. Handle files up to Gmail's 25MB attachment limit
3. Store files persistently for draft emails and campaign history
4. Optimize for bulk sending (same attachment to many recipients)
5. Support personalized attachments (e.g., certificates with recipient name)

Challenges:

- Large files slow down uploads and API calls
- Base64 encoding increases data size by ~33%
- Sending 100 emails with a 10MB attachment = 1.3GB of data transfer
- Gmail API timeout for large payloads

## Decision

We will use a **hybrid attachment strategy**:

### Storage Architecture

```
[User Browser] --> [Upload API] --> [Appwrite Storage]
                                          |
                                    [Stored Files]
                                          |
[Send Email] --> [Fetch from Appwrite] --> [Gmail API]
```

### Upload Flow

1. **Small files (<5MB)**: Convert to base64 in browser, send with email data
2. **Large files (≥5MB)**: Upload to Appwrite Storage first, reference by ID

```typescript
// components/compose-form.tsx
const handleFileUpload = async (files: FileList) => {
  for (const file of files) {
    if (file.size >= LARGE_FILE_THRESHOLD) {
      // Upload to Appwrite
      const result = await uploadToAppwrite(file);
      attachments.push({
        name: file.name,
        data: "appwrite", // Placeholder
        appwriteFileId: result.fileId,
        appwriteUrl: result.url,
      });
    } else {
      // Convert to base64
      const base64 = await fileToBase64(file);
      attachments.push({
        name: file.name,
        data: base64,
      });
    }
  }
};
```

### Send Flow with Caching

```typescript
// lib/gmail.ts

// Cache resolved attachments (fileId -> base64)
const attachmentCache = new Map<string, string>();

export async function preResolveAttachments(attachments: AttachmentData[]) {
  const resolved = [];
  for (const att of attachments) {
    if (att.appwriteFileId) {
      // Check cache first
      if (attachmentCache.has(att.appwriteFileId)) {
        resolved.push({
          ...att,
          data: attachmentCache.get(att.appwriteFileId),
        });
      } else {
        // Download from Appwrite
        const buffer = await serverStorageService.getFileBuffer(
          att.appwriteFileId,
        );
        const base64 = buffer.toString("base64");
        attachmentCache.set(att.appwriteFileId, base64);
        resolved.push({ ...att, data: base64 });
      }
    } else {
      resolved.push(att);
    }
  }
  return resolved;
}
```

### Pre-built Template Optimization

For bulk sends, we build the entire MIME message once:

```typescript
// Build template ONCE with all attachments embedded
await preBuildEmailTemplate(accessToken, subject, content, resolvedAttachments);

// Send to each recipient (only header changes)
for (const recipient of recipients) {
  await sendEmailWithTemplate(accessToken, recipient.email);
}
```

This avoids re-encoding attachments for each email.

## Consequences

### Positive

- **Performance**: Same attachment sent 100 times only processed once
- **Reliability**: Files stored in Appwrite survive browser refresh
- **Draft Support**: Attachments preserved with draft emails
- **History**: Campaign attachments can be referenced later
- **Size Handling**: Large files don't block initial upload UX

### Negative

- **Complexity**: Two storage paths (inline vs. Appwrite)
- **Storage Costs**: Appwrite storage used for attachments
- **Download Time**: Must fetch from Appwrite before sending
- **Cache Memory**: Large attachments held in server memory during campaign

### Neutral

- Appwrite storage provides CDN-like access
- Files are user-scoped (owner's email in metadata)

## Personalized Attachments

For use cases like certificates, we support per-recipient attachments via CSV:

```typescript
// CSV data with PDF URLs
[
  {
    email: "user1@example.com",
    name: "Alice",
    certificate_pdf: "https://example.com/alice.pdf",
  },
  {
    email: "user2@example.com",
    name: "Bob",
    certificate_pdf: "https://example.com/bob.pdf",
  },
];

// Detected column with PDF URLs
const pdfColumn = detectPdfColumn(csvHeaders, csvData);

// Each email gets its own attachment
for (const recipient of csvData) {
  const personalAttachment = await fetchAttachment(recipient[pdfColumn]);
  await sendEmail(recipient.email, content, [personalAttachment]);
}
```

## File Size Limits

| Limit                  | Value | Source                       |
| ---------------------- | ----- | ---------------------------- |
| Gmail attachment limit | 25 MB | Gmail API                    |
| Appwrite file size     | 50 MB | Appwrite default             |
| Base64 size increase   | +33%  | Encoding overhead            |
| Recommended max        | 20 MB | Leave room for MIME overhead |

## Storage Structure

```
Appwrite Storage
└── attachments (bucket)
    ├── {unique_id}_filename.pdf
    ├── {unique_id}_image.png
    └── ...
```

File metadata includes:

- Original filename
- MIME type
- File size
- Upload timestamp
- Owner user email

## Alternatives Considered

### Alternative 1: Client-Only Base64

Keep all attachments in browser memory as base64.

**Rejected because**:

- Large files crash browser tabs
- Lost on page refresh
- Can't save drafts with attachments

### Alternative 2: Google Drive Integration

Store attachments in user's Google Drive.

**Rejected because**:

- Additional OAuth scope required
- More complex permission model
- Drive quota concerns

### Alternative 3: Temporary S3/R2 Storage

Use AWS S3 or Cloudflare R2 for temporary storage.

**Rejected because**:

- Additional infrastructure
- Appwrite Storage included with database
- Would need cleanup jobs

### Alternative 4: Stream Attachments

Stream attachments directly to Gmail API.

**Rejected because**:

- Gmail API requires complete message upfront
- No streaming upload support
- Would still need to hold in memory

## Cache Management

```typescript
// Clear cache after campaign completes
export function clearAttachmentCache() {
  attachmentCache.clear();
  cachedEmailTemplate = null;
}

// Called in useEmailSend after campaign ends
useEffect(() => {
  return () => {
    clearAttachmentCache();
  };
}, []);
```

## References

- [Gmail API Message Format](https://developers.google.com/gmail/api/reference/rest/v1/users.messages)
- [MIME Multipart Format](https://datatracker.ietf.org/doc/html/rfc2046)
- [Appwrite Storage](https://appwrite.io/docs/products/storage)
