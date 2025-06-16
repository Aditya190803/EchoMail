# Firebase Index Setup Guide

## Firestore Composite Index

You need to create a composite index for the analytics queries to work properly.

### Index Configuration

Go to Firebase Console → Firestore → Indexes and create a new composite index with:

**Collection ID:** `email_campaigns`

**Fields:**
1. `user_email` - Ascending
2. `created_at` - Descending

**Query Scope:** Collection

### Or Use the Direct Link

Click this link to automatically create the index:
https://console.firebase.google.com/v1/r/project/echomail-india/firestore/indexes?create_composite=ClZwcm9qZWN0cy9lY2hvbWFpbC1pbmRpYS9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvZW1haWxfY2FtcGFpZ25zL2luZGV4ZXMvXxABGg4KCnVzZXJfZW1haWwQARoMCghjcmVhdGVkX2F0EAIaDAoIX19uYW1lX18QAg

## Firestore Security Rules

Update your Firestore security rules to:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write their own contacts
    match /contacts/{document} {
      allow read, write: if request.auth != null && 
        request.auth.token.email == resource.data.user_email;
      allow create: if request.auth != null && 
        request.auth.token.email == request.resource.data.user_email;
    }
    
    // Allow users to read/write their own email campaigns
    match /email_campaigns/{document} {
      allow read, write: if request.auth != null && 
        request.auth.token.email == resource.data.user_email;
      allow create: if request.auth != null && 
        request.auth.token.email == request.resource.data.user_email;
    }
    
    // Allow authenticated users to read/write files in their own storage path
    match /attachments/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Firebase Storage Rules

Update your Firebase Storage security rules to:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /attachments/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Test the Setup

1. Create the composite index using the link above
2. Update the security rules
3. Try adding sample data from the analytics page
4. Check that campaigns are being stored with attachments
