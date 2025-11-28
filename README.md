# EchoMail 📧

[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js%2015-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Gmail API](https://img.shields.io/badge/Gmail-API-red?style=for-the-badge&logo=gmail)](https://developers.google.com/gmail/api)
[![Appwrite](https://img.shields.io/badge/Appwrite-FD366E?style=for-the-badge&logo=appwrite&logoColor=white)](https://appwrite.io/)

## 🚀 Overview

**EchoMail** is a powerful, modern email marketing platform that seamlessly integrates with Gmail API to send personalized bulk emails. Built with Next.js 15 and TypeScript, it offers a professional-grade solution for businesses and individuals looking to manage email campaigns with Gmail-like formatting and reliability.

## ✨ Key Features

### 📨 **Gmail Integration**
- Native Gmail API integration for authentic email delivery
- OAuth 2.0 authentication with Google
- Sends emails directly through your Gmail account
- Maintains Gmail's deliverability and reputation
- Automatic token refresh for uninterrupted sending

### 🎨 **Rich Email Composer**
- Advanced rich text editor with TipTap
- Gmail-style formatting and spacing
- Real-time email preview with Gmail appearance
- Support for formatting: **bold**, *italic*, underline, lists, links, images
- Text alignment and heading styles
- Email signatures support

### 📊 **Data Management**
- CSV file upload for bulk recipients
- Manual contact entry with validation
- Contact groups for organized recipient management
- Appwrite-powered contact management and file storage
- Placeholder personalization ({{name}}, {{email}}, {{company}}, and custom fields)
- Duplicate contact detection and merging
- Draft auto-save functionality

### 📈 **Campaign Analytics & A/B Testing**
- Real-time sending progress tracking
- Email open and click tracking
- Campaign history and analytics dashboard
- A/B testing for subject lines and content
- Performance comparison between variants

### 👥 **Team Collaboration**
- Create and manage teams
- Invite members with role-based permissions (Owner, Admin, Member, Viewer)
- Team settings for shared resources
- Collaborative campaign management

### 🔒 **Security, Privacy & GDPR Compliance**
- Secure OAuth 2.0 authentication
- No email credentials stored
- End-to-end encrypted API communications
- **GDPR Compliance Tools:**
  - Data export (download all your data as JSON)
  - Data deletion (right to be forgotten)
  - Consent management (marketing, analytics, data processing)
  - Privacy settings dashboard
- **Audit Logs:**
  - Track all account activities
  - Filterable log viewer with date ranges
  - IP address and user agent tracking

### 📝 **Templates & Signatures**
- Save and reuse email templates
- Create multiple email signatures
- Set default signature for all emails
- Quick template insertion while composing

### 🔗 **Webhooks & Integrations**
- Configure webhook notifications for email events
- Real-time event callbacks (sent, opened, clicked, bounced)
- Custom webhook endpoints with secret verification

### ⌨️ **Keyboard Shortcuts**
- `Ctrl+/` - Show keyboard shortcuts help
- `Ctrl+N` - New compose email
- `Escape` - Close dialogs
- Page-specific shortcuts for enhanced productivity

### 📱 **Modern UI/UX**
- Responsive design for all devices
- Dark/Light theme support
- Clean, intuitive interface
- Real-time feedback and error handling
- Professional email previews

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components, Radix UI
- **Authentication**: NextAuth.js with Google OAuth
- **Database & Storage**: Appwrite (Cloud or Self-hosted)
- **Email**: Gmail API with automatic token refresh
- **Rich Text**: TipTap editor
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Notifications**: Sonner toast
- **Testing**: Vitest, Playwright
- **Deployment**: Vercel

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js 20+ installed
- Gmail account
- Google Cloud Project with Gmail API enabled
- Appwrite project set up (Cloud or Self-hosted)

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/Aditya190803/echomail.git
cd echomail
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Google OAuth (Gmail API)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=your-database-id
APPWRITE_API_KEY=your-appwrite-api-key

# Appwrite Collections
NEXT_PUBLIC_APPWRITE_CONTACTS_COLLECTION_ID=contacts
NEXT_PUBLIC_APPWRITE_CAMPAIGNS_COLLECTION_ID=campaigns
NEXT_PUBLIC_APPWRITE_TEMPLATES_COLLECTION_ID=templates
NEXT_PUBLIC_APPWRITE_CONTACT_GROUPS_COLLECTION_ID=contact_groups
NEXT_PUBLIC_APPWRITE_DRAFT_EMAILS_COLLECTION_ID=draft_emails
NEXT_PUBLIC_APPWRITE_SIGNATURES_COLLECTION_ID=signatures
NEXT_PUBLIC_APPWRITE_UNSUBSCRIBES_COLLECTION_ID=unsubscribes
NEXT_PUBLIC_APPWRITE_WEBHOOKS_COLLECTION_ID=webhooks
NEXT_PUBLIC_APPWRITE_TRACKING_EVENTS_COLLECTION_ID=tracking_events
NEXT_PUBLIC_APPWRITE_AB_TESTS_COLLECTION_ID=ab_tests
NEXT_PUBLIC_APPWRITE_ATTACHMENTS_BUCKET_ID=attachments

# Teams & Organization
NEXT_PUBLIC_APPWRITE_TEAMS_COLLECTION_ID=teams
NEXT_PUBLIC_APPWRITE_TEAM_MEMBERS_COLLECTION_ID=team_members

# GDPR & Compliance
NEXT_PUBLIC_APPWRITE_AUDIT_LOGS_COLLECTION_ID=audit_logs
NEXT_PUBLIC_APPWRITE_CONSENTS_COLLECTION_ID=consents
```

### 4. Configure Google Cloud & Gmail API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Gmail API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)

### 5. Set Up Appwrite

1. Create an Appwrite project at [Appwrite Console](https://cloud.appwrite.io/) or self-host
2. Create a Database
3. Run the setup script to create all collections:
   ```bash
   npx tsx scripts/setup-appwrite.ts
   ```
4. Create a Storage Bucket for email attachments (or let the script create it)
5. Generate an API Key with appropriate permissions
6. Copy the generated environment variables to your `.env.local`

The setup script creates all required collections:
- **Core**: contacts, campaigns, templates, contact_groups, draft_emails
- **Features**: signatures, unsubscribes, webhooks, tracking_events, ab_tests
- **Teams**: teams, team_members
- **Compliance**: audit_logs, consents

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application.

## 📖 Usage Guide

### 1. **Authentication**
- Sign in with your Google account
- Grant Gmail API permissions
- Your credentials are securely managed by NextAuth.js

### 2. **Creating an Email Campaign**
- Navigate to `/compose`
- Enter subject line and compose your message
- Use the rich text editor for formatting
- Add personalization placeholders: `{{name}}`, `{{email}}`, `{{company}}`

### 3. **Adding Recipients**
- **CSV Upload**: Upload a CSV file with email, name, and other fields
- **Manual Entry**: Add individual recipients manually
- **Contacts**: Select from saved contacts

### 4. **Preview & Send**
- Review your email with Gmail-style preview
- Check recipient list and personalization
- Send emails with real-time progress tracking

### 5. **Analytics & A/B Testing**
- Monitor campaign performance at `/analytics`
- View delivery status and engagement metrics
- Create A/B tests at `/ab-testing`
- Compare subject line and content variants

### 6. **Team Collaboration**
- Create teams at `/settings/teams`
- Invite members with specific roles
- Collaborate on campaigns

### 7. **Privacy & Compliance**
- Manage privacy settings at `/settings/gdpr`
- Export or delete your data
- View activity history at `/settings/audit-logs`


## 🔒 Token Refresh

EchoMail includes automatic token refresh for long-running campaigns:

- Monitors token expiry during bulk email sends
- Automatically refreshes tokens every 10 emails
- Prompts for re-authentication when tokens expire
- Prevents campaign interruption due to expired credentials

## 📝 Draft Auto-Save

The compose form automatically saves drafts:

- Saves to localStorage every 30 seconds
- Persists subject, body, and recipient list
- Prompts to restore draft on page load
- Clear draft option available

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🙏 Acknowledgements

- [Next.js](https://nextjs.org/) - React framework
- [Appwrite](https://appwrite.io/) - Backend as a Service
- [TipTap](https://tiptap.dev/) - Rich text editor
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Gmail API](https://developers.google.com/gmail/api) - Email sending
