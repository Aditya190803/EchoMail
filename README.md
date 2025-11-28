# EchoMail 📧

[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Gmail API](https://img.shields.io/badge/Gmail-API-red?style=for-the-badge&logo=gmail)](https://developers.google.com/gmail/api)
[![Appwrite](https://img.shields.io/badge/Appwrite-FD366E?style=for-the-badge&logo=appwrite&logoColor=white)](https://appwrite.io/)

## 🚀 Overview

**EchoMail** is a powerful, modern email marketing platform that seamlessly integrates with Gmail API to send personalized bulk emails. Built with Next.js and TypeScript, it offers a professional-grade solution for businesses and individuals looking to manage email campaigns with Gmail-like formatting and reliability.

## ✨ Key Features

### 📨 **Gmail Integration**
- Native Gmail API integration for authentic email delivery
- OAuth 2.0 authentication with Google
- Sends emails directly through your Gmail account
- Maintains Gmail's deliverability and reputation

### 🎨 **Rich Email Composer**
- Advanced rich text editor with TipTap
- Gmail-style formatting and spacing
- Real-time email preview with Gmail appearance
- Support for formatting: **bold**, *italic*, underline, lists, links, images
- Text alignment and heading styles

### 📊 **Data Management**
- CSV file upload for bulk recipients
- Manual contact entry
- Appwrite-powered contact management and file storage
- Placeholder personalization ({{name}}, {{email}}, {{company}})
- Data validation and sanitization
- Draft auto-save functionality

### 📈 **Campaign Analytics**
- Real-time sending progress tracking
- Email delivery status monitoring
- Campaign history and analytics dashboard
- Appwrite-powered data storage

### ⌨️ **Keyboard Shortcuts**
- `Ctrl+/` - Show keyboard shortcuts help
- `Ctrl+N` - New compose email
- `Escape` - Close dialogs
- Page-specific shortcuts for enhanced productivity

### 🔒 **Security & Privacy**
- Secure OAuth 2.0 authentication
- No email credentials stored
- End-to-end encrypted API communications
- Privacy-compliant data handling

### 📱 **Modern UI/UX**
- Responsive design for all devices
- Clean, intuitive interface
- Real-time feedback and error handling
- Professional email previews

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Authentication**: NextAuth.js with Google OAuth
- **Database & Storage**: Appwrite (Cloud or Self-hosted)
- **Email**: Gmail API with token refresh
- **Rich Text**: TipTap editor
- **Icons**: Lucide React
- **CI/CD**: GitHub Actions + Vercel
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
NEXT_PUBLIC_APPWRITE_CONTACTS_COLLECTION_ID=your-contacts-collection-id
NEXT_PUBLIC_APPWRITE_CAMPAIGNS_COLLECTION_ID=your-campaigns-collection-id
NEXT_PUBLIC_APPWRITE_BUCKET_ID=your-storage-bucket-id
APPWRITE_API_KEY=your-appwrite-api-key
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
2. Create a Database with:
   - **Contacts Collection**: Fields for name, email, company, etc.
   - **Campaigns Collection**: Fields for subject, body, status, sentCount, etc.
3. Create a Storage Bucket for email attachments
4. Generate an API Key with appropriate permissions
5. Copy configuration to your `.env.local`

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

### 5. **Analytics**
- Monitor campaign performance at `/analytics`
- View delivery status and engagement metrics
- Track historical campaign data

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + /` | Show keyboard shortcuts help |
| `Ctrl + N` | Open new compose email |
| `Escape` | Close dialogs/modals |

## 📁 Project Structure

```
app/
├── api/                    # API routes
│   ├── auth/              # NextAuth endpoints
│   ├── send-email/        # Email sending logic
│   ├── upload-attachment/ # Appwrite file uploads
│   └── refresh-token/     # Token refresh endpoint
├── compose/               # Email composer page
├── contacts/              # Contact management
├── dashboard/             # Main dashboard
└── analytics/             # Campaign analytics

components/
├── compose-form.tsx       # Full compose interface
├── rich-text-editor.tsx   # TipTap editor wrapper
├── csv-upload.tsx         # CSV import component
└── ui/                    # shadcn/ui components

hooks/
├── useEmailSend.ts        # Email sending with progress
├── useKeyboardShortcuts.ts # Keyboard shortcut system
└── useSimpleEmailSend.ts  # Simple email hook

lib/
├── appwrite.ts            # Client-side Appwrite
├── appwrite-server.ts     # Server-side Appwrite
├── auth.ts                # NextAuth configuration
├── gmail.ts               # Gmail API utilities
└── email-formatter.ts     # Email formatting helpers
```

## 🔄 CI/CD Pipeline

The project includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that:

1. **Linting**: Runs ESLint on all TypeScript/JavaScript files
2. **Type Checking**: Validates TypeScript types with `tsc --noEmit`
3. **Build**: Creates production build with Next.js
4. **Preview Deploy**: Deploys PR branches to Vercel preview URLs
5. **Production Deploy**: Automatically deploys `main` branch to production

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

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [Next.js](https://nextjs.org/) - React framework
- [Appwrite](https://appwrite.io/) - Backend as a Service
- [TipTap](https://tiptap.dev/) - Rich text editor
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Gmail API](https://developers.google.com/gmail/api) - Email sending

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Aditya190803">Aditya</a>
</p>
