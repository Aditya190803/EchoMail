# EchoMail API Documentation

This document provides comprehensive documentation for all API endpoints available in EchoMail.

## Table of Contents

- [Authentication](#authentication)
- [Contacts API](#contacts-api)
- [Campaigns API](#campaigns-api)
- [Templates API](#templates-api)
- [Contact Groups API](#contact-groups-api)
- [Draft Emails API](#draft-emails-api)
- [Signatures API](#signatures-api)
- [Unsubscribes API](#unsubscribes-api)
- [Webhooks API](#webhooks-api)
- [A/B Tests API](#ab-tests-api)
- [Teams API](#teams-api)
- [GDPR API](#gdpr-api)
- [Email Sending API](#email-sending-api)
- [File Upload API](#file-upload-api)

---

## Authentication

All API endpoints require authentication via NextAuth.js session. The user must be signed in with Google OAuth to access the API.

### Session Check
All endpoints verify the session using:
```typescript
const session = await getServerSession(authOptions)
if (!session?.user?.email) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```

---

## Contacts API

Base URL: `/api/appwrite/contacts`

### List Contacts
```
GET /api/appwrite/contacts
```

**Response:**
```json
{
  "total": 100,
  "documents": [
    {
      "$id": "unique_id",
      "email": "contact@example.com",
      "name": "John Doe",
      "company": "Acme Inc",
      "phone": "+1234567890",
      "user_email": "user@example.com",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### Create Contact
```
POST /api/appwrite/contacts
Content-Type: application/json

{
  "email": "contact@example.com",
  "name": "John Doe",
  "company": "Acme Inc",
  "phone": "+1234567890"
}
```

### Delete Contact
```
DELETE /api/appwrite/contacts?id={documentId}
```

---

## Campaigns API

Base URL: `/api/appwrite/campaigns`

### List Campaigns
```
GET /api/appwrite/campaigns
```

**Response:**
```json
{
  "total": 50,
  "documents": [
    {
      "$id": "campaign_id",
      "subject": "Newsletter",
      "content": "<p>Email content...</p>",
      "recipients": ["email1@example.com", "email2@example.com"],
      "sent": 45,
      "failed": 5,
      "status": "completed",
      "campaign_type": "newsletter",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### Create Campaign
```
POST /api/appwrite/campaigns
Content-Type: application/json

{
  "subject": "Newsletter",
  "content": "<p>Email content...</p>",
  "recipients": ["email1@example.com", "email2@example.com"],
  "sent": 0,
  "failed": 0,
  "status": "sending",
  "campaign_type": "newsletter",
  "attachments": []
}
```

---

## Templates API

Base URL: `/api/appwrite/templates`

### List Templates
```
GET /api/appwrite/templates
```

### Create Template
```
POST /api/appwrite/templates
Content-Type: application/json

{
  "name": "Welcome Email",
  "subject": "Welcome to our service",
  "content": "<p>Welcome!</p>",
  "category": "onboarding"
}
```

### Update Template
```
PUT /api/appwrite/templates
Content-Type: application/json

{
  "id": "template_id",
  "name": "Updated Name",
  "subject": "Updated Subject",
  "content": "<p>Updated content</p>"
}
```

### Delete Template
```
DELETE /api/appwrite/templates?id={templateId}
```

---

## Contact Groups API

Base URL: `/api/appwrite/contact-groups`

### List Groups
```
GET /api/appwrite/contact-groups
```

### Create Group
```
POST /api/appwrite/contact-groups
Content-Type: application/json

{
  "name": "VIP Customers",
  "description": "High-value customers",
  "color": "#FF5733",
  "contact_ids": ["contact1", "contact2"]
}
```

### Update Group
```
PUT /api/appwrite/contact-groups
Content-Type: application/json

{
  "id": "group_id",
  "name": "Updated Name",
  "contact_ids": ["contact1", "contact2", "contact3"]
}
```

### Delete Group
```
DELETE /api/appwrite/contact-groups?id={groupId}
```

---

## Draft Emails API

Base URL: `/api/appwrite/draft-emails`

### List Drafts
```
GET /api/appwrite/draft-emails
```

### Create Draft
```
POST /api/appwrite/draft-emails
Content-Type: application/json

{
  "subject": "Draft Email",
  "content": "<p>Draft content...</p>",
  "recipients": ["email@example.com"],
  "saved_at": "2025-01-01T00:00:00Z"
}
```

### Update Draft
```
PUT /api/appwrite/draft-emails
Content-Type: application/json

{
  "id": "draft_id",
  "subject": "Updated Subject",
  "content": "<p>Updated content</p>"
}
```

### Delete Draft
```
DELETE /api/appwrite/draft-emails?id={draftId}
```

---

## Signatures API

Base URL: `/api/appwrite/signatures`

### List Signatures
```
GET /api/appwrite/signatures
```

### Get Default Signature
```
GET /api/appwrite/signatures?default=true
```

### Create Signature
```
POST /api/appwrite/signatures
Content-Type: application/json

{
  "name": "Work Signature",
  "content": "<p>Best regards,<br>John Doe</p>",
  "is_default": true
}
```

### Update Signature
```
PUT /api/appwrite/signatures
Content-Type: application/json

{
  "id": "signature_id",
  "name": "Updated Name",
  "content": "<p>Updated signature</p>",
  "is_default": false
}
```

### Set as Default
```
PUT /api/appwrite/signatures
Content-Type: application/json

{
  "id": "signature_id",
  "setAsDefault": true
}
```

### Delete Signature
```
DELETE /api/appwrite/signatures?id={signatureId}
```

---

## Unsubscribes API

Base URL: `/api/appwrite/unsubscribes`

### List Unsubscribes
```
GET /api/appwrite/unsubscribes
```

### Check if Email is Unsubscribed
```
GET /api/appwrite/unsubscribes?check={email}
```

**Response:**
```json
{
  "isUnsubscribed": true
}
```

### Create Unsubscribe
```
POST /api/appwrite/unsubscribes
Content-Type: application/json

{
  "email": "unsubscribed@example.com",
  "reason": "No longer interested"
}
```

### Filter Unsubscribed Emails
```
PATCH /api/appwrite/unsubscribes
Content-Type: application/json

{
  "emails": ["email1@example.com", "email2@example.com"]
}
```

**Response:**
```json
{
  "emails": ["email1@example.com"]  // Only non-unsubscribed emails
}
```

### Delete Unsubscribe
```
DELETE /api/appwrite/unsubscribes?id={unsubscribeId}
```

---

## Webhooks API

Base URL: `/api/appwrite/webhooks`

### List Webhooks
```
GET /api/appwrite/webhooks
```

### Create Webhook
```
POST /api/appwrite/webhooks
Content-Type: application/json

{
  "name": "Campaign Sent Hook",
  "url": "https://example.com/webhook",
  "events": ["campaign.sent", "email.opened"],
  "is_active": true,
  "secret": "webhook_secret"
}
```

### Update Webhook
```
PUT /api/appwrite/webhooks
Content-Type: application/json

{
  "id": "webhook_id",
  "name": "Updated Name",
  "is_active": false
}
```

### Delete Webhook
```
DELETE /api/appwrite/webhooks?id={webhookId}
```

---

## A/B Tests API

Base URL: `/api/appwrite/ab-tests`

### List A/B Tests
```
GET /api/appwrite/ab-tests
```

### Get Single Test
```
GET /api/appwrite/ab-tests?id={testId}
```

### Create A/B Test
```
POST /api/appwrite/ab-tests
Content-Type: application/json

{
  "name": "Subject Line Test",
  "status": "draft",
  "test_type": "subject",
  "variant_a_subject": "Save 50% Today!",
  "variant_b_subject": "Exclusive Offer Inside",
  "variant_a_recipients": ["email1@example.com"],
  "variant_b_recipients": ["email2@example.com"]
}
```

### Update A/B Test
```
PUT /api/appwrite/ab-tests
Content-Type: application/json

{
  "id": "test_id",
  "status": "running"
}
```

### Complete A/B Test
```
PUT /api/appwrite/ab-tests
Content-Type: application/json

{
  "id": "test_id",
  "complete": true
}
```

### Delete A/B Test
```
DELETE /api/appwrite/ab-tests?id={testId}
```

---

## Teams API

Base URL: `/api/teams`

### List Teams
```
GET /api/teams
```

**Response:**
```json
{
  "total": 2,
  "documents": [
    {
      "$id": "team_id",
      "name": "Marketing Team",
      "description": "Email marketing team",
      "owner_email": "owner@example.com",
      "created_at": "2025-01-01T00:00:00Z",
      "user_role": "owner",
      "settings": {
        "allow_member_invite": true,
        "require_approval": false,
        "shared_templates": true,
        "shared_contacts": false
      }
    }
  ]
}
```

### Create Team
```
POST /api/teams
Content-Type: application/json

{
  "name": "Marketing Team",
  "description": "Email marketing team"
}
```

### Update Team
```
PUT /api/teams
Content-Type: application/json

{
  "id": "team_id",
  "name": "Updated Name",
  "settings": {
    "allow_member_invite": true
  }
}
```

### Delete Team
```
DELETE /api/teams?id={teamId}
```

### Team Members

Base URL: `/api/teams/members`

#### List Members
```
GET /api/teams/members?team_id={teamId}
```

#### Invite Member
```
POST /api/teams/members
Content-Type: application/json

{
  "team_id": "team_id",
  "email": "member@example.com",
  "role": "member"  // "admin", "member", or "viewer"
}
```

#### Update Member Role
```
PUT /api/teams/members
Content-Type: application/json

{
  "member_id": "member_id",
  "role": "admin"
}
```

#### Remove Member
```
DELETE /api/teams/members?id={memberId}
```

---

## GDPR API

### Export User Data
```
GET /api/gdpr/export
```

Downloads a JSON file containing all user data including:
- Profile information
- Contacts
- Campaigns
- Templates
- Drafts
- Signatures
- Consent records

### Delete All User Data
```
DELETE /api/gdpr/delete
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully deleted 150 records",
  "details": {
    "contacts": 50,
    "campaigns": 30,
    "templates": 20,
    "drafts": 10,
    "signatures": 5,
    "groups": 10,
    "errors": []
  }
}
```

### Consent Management

Base URL: `/api/gdpr/consent`

#### Get Consents
```
GET /api/gdpr/consent
```

#### Update Consent
```
POST /api/gdpr/consent
Content-Type: application/json

{
  "consent_type": "marketing",  // "marketing", "analytics", "data_processing", "third_party"
  "given": true
}
```

### Audit Logs

Base URL: `/api/gdpr/audit-logs`

#### List Audit Logs
```
GET /api/gdpr/audit-logs?limit=100&offset=0&resource_type=contact
```

**Query Parameters:**
- `limit` - Number of records (default: 100)
- `offset` - Pagination offset (default: 0)
- `action` - Filter by action type
- `resource_type` - Filter by resource type
- `start_date` - Filter from date
- `end_date` - Filter to date

#### Create Audit Log
```
POST /api/gdpr/audit-logs
Content-Type: application/json

{
  "action": "contact.create",
  "resource_type": "contact",
  "resource_id": "contact_id",
  "details": { "name": "John Doe" }
}
```

---

## Email Sending API

### Send Email Campaign
```
POST /api/send-email
Content-Type: application/json

{
  "subject": "Newsletter",
  "htmlContent": "<p>Email content...</p>",
  "recipients": [
    { "email": "recipient@example.com", "name": "John" }
  ],
  "attachments": []
}
```

### Send Single Email
```
POST /api/send-single-email
Content-Type: application/json

{
  "to": "recipient@example.com",
  "subject": "Hello",
  "html": "<p>Email content...</p>"
}
```

### Send Draft Email
```
POST /api/send-draft
Content-Type: application/json

{
  "draftId": "draft_id"
}
```

---

## File Upload API

### Upload Attachment
```
POST /api/upload-attachment
Content-Type: multipart/form-data

files: [File objects]
```

**Response:**
```json
{
  "uploads": [
    {
      "fileName": "document.pdf",
      "fileSize": 102400,
      "fileType": "application/pdf",
      "url": "https://...",
      "appwrite_file_id": "file_id"
    }
  ]
}
```

---

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "error": "Error message describing what went wrong"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Not authenticated |
| 403 | Forbidden - Not allowed |
| 404 | Not Found |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

---

## Rate Limiting

Currently, there are no rate limits imposed by the application. However, the underlying services (Gmail API, Appwrite) may have their own rate limits.

## Pagination

Most list endpoints support pagination through `limit` and `offset` parameters. The default limit is typically 100 or 1000 depending on the endpoint.

---

## Changelog

### Version 1.0.0 (November 2025)
- Initial API documentation
- GDPR compliance endpoints added
- Team/Organization support added
- Audit logging implemented
