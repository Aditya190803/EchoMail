# Email Campaign Analytics Setup

## Firebase Configuration

### 1. Firestore Collections

The application uses the following Firestore collections:

#### `email_campaigns`
Stores detailed information about each email campaign sent through the application.

**Document Structure:**
```javascript
{
  subject: "string",                    // Email subject line
  content: "string",                    // Email content/body
  recipients: ["email1", "email2"],     // Array of recipient email addresses
  sent: 42,                            // Number of successfully sent emails
  failed: 3,                           // Number of failed sends
  status: "completed",                 // "completed", "sending", or "failed"
  user_email: "user@example.com",      // Email of the user who sent the campaign
  created_at: Timestamp,               // When the campaign was created
  campaign_type: "bulk",               // Type: "bulk", "contact_list", "manual", etc.
  attachments: [                       // Optional: attached files
    {
      fileName: "document.pdf",
      fileUrl: "https://storage.url",
      fileSize: 1024000
    }
  ],
  send_results: [                      // Detailed send results
    {
      email: "recipient@example.com",
      status: "success"
    }
  ]
}
```

#### `contacts`
Stores user contacts (already configured).

### 2. Firebase Storage

Email attachments are stored in Firebase Storage under the path:
```
/attachments/{user_email}/{timestamp}_{filename}
```

**CORS Configuration Required:**
To fix CORS issues with Firebase Storage, you need to configure CORS settings:

1. Install Google Cloud SDK (if not already installed)
2. Authenticate with your Google account:
   ```bash
   gcloud auth login
   ```
3. Set your project:
   ```bash
   gcloud config set project echomail-india
   ```
4. Apply CORS configuration:
   ```bash
   gsutil cors set firebase-storage-cors.json gs://echomail-india.firebasestorage.app
   ```

The `firebase-storage-cors.json` file is included in the project root and allows requests from localhost:3000 and your production domain.

### 3. Firestore Security Rules

The security rules ensure users can only access their own data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /contacts/{document} {
      allow read, write: if request.auth != null && 
        request.auth.token.email == resource.data.user_email;
      allow create: if request.auth != null && 
        request.auth.token.email == request.resource.data.user_email;
    }
    
    match /email_campaigns/{document} {
      allow read, write: if request.auth != null && 
        request.auth.token.email == resource.data.user_email;
      allow create: if request.auth != null && 
        request.auth.token.email == request.resource.data.user_email;
    }
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 4. Required Firestore Index

If you encounter an index error when loading analytics, create a composite index in the Firebase Console:

**Collection:** `email_campaigns`
**Fields:**
1. `user_email` (Ascending)
2. `created_at` (Descending)

**How to create the index:**
1. Go to Firebase Console
2. Navigate to Firestore Database > Indexes
3. Click "Create Index"
4. Set Collection ID to `email_campaigns`
5. Add field `user_email` with order "Ascending"
6. Add field `created_at` with order "Descending"
7. Click "Create"

Alternatively, when you see the index error in the console, click the provided link to automatically create the required index.

## Features

### Campaign Tracking
- **Total Campaigns**: Count of all campaigns sent by the user
- **Success Rate**: Percentage of successfully delivered emails
- **Monthly Trends**: Comparison of campaigns sent this month vs last month
- **Recent Activity**: List of recent campaigns with details

### Attachment Support
- Files are uploaded to Firebase Storage
- Attachment metadata is stored with campaign data
- File size and download URLs are tracked

### Analytics Display
- Real-time updates using Firestore listeners
- Responsive design for mobile and desktop
- Campaign details including recipient count, status, and attachments
- Monthly activity trends with visual indicators

## Usage

1. **Send Campaigns**: Use the compose page to send emails with optional attachments
2. **View Analytics**: Navigate to `/analytics` to see campaign statistics
3. **Real-time Updates**: Analytics update automatically as new campaigns are sent
4. **Campaign History**: View detailed information about past campaigns

## Data Privacy

- All campaign data is user-specific and isolated
- Firebase Security Rules prevent cross-user data access
- Attachments are stored with user-specific paths
- No sample data is stored in production
