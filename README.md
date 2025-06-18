# EchoMail 📧

[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Gmail API](https://img.shields.io/badge/Gmail-API-red?style=for-the-badge&logo=gmail)](https://developers.google.com/gmail/api)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)

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
- Firebase-powered contact management
- Placeholder personalization ({{name}}, {{email}}, {{company}})
- Data validation and sanitization

### 📈 **Campaign Analytics**
- Real-time sending progress tracking
- Email delivery status monitoring
- Campaign history and analytics dashboard
- Firebase-powered data storage

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

- **Frontend**: Next.js 15, React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Authentication**: NextAuth.js with Google OAuth
- **Database**: Firebase Firestore
- **Email**: Gmail API
- **Rich Text**: TipTap editor
- **Icons**: Lucide React
- **Deployment**: Vercel

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- Gmail account
- Google Cloud Project with Gmail API enabled
- Firebase project set up

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/echomail.git
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

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 4. Configure Google Cloud & Gmail API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Gmail API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)

### 5. Set Up Firebase

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Set up authentication (optional, for user management)
4. Copy configuration to your `.env.local`

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

## 🏗️ Project Structure

```
echomail/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── compose/           # Email composer
│   ├── analytics/         # Analytics dashboard
│   └── ...
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── compose-form.tsx  # Main email composer
│   ├── rich-text-editor.tsx # Email editor
│   └── ...
├── lib/                   # Utility libraries
│   ├── auth.ts           # NextAuth configuration
│   ├── gmail.ts          # Gmail API functions
│   ├── firebase.ts       # Firebase configuration
│   ├── email-formatter.ts # Email formatting utilities
│   └── ...
├── types/                 # TypeScript type definitions
└── public/               # Static assets
```

## 🔧 Configuration

### Gmail API Scopes
The application requires these Gmail API scopes:
- `https://www.googleapis.com/auth/gmail.send`
- `https://www.googleapis.com/auth/gmail.readonly` (for user profile)

### Firebase Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /email_campaigns/{document} {
      allow read, write: if request.auth != null;
    }
    match /contacts/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🚀 Deployment

### Vercel (Recommended)

1. Fork this repository
2. Connect to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push

### Manual Deployment

```bash
npm run build
npm start
```

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Test Email Functionality
Visit `/test-email` to test:
- Email formatting
- Gmail API connection
- Database operations

## 🔒 Security Considerations

- **OAuth Tokens**: Automatically managed by NextAuth.js
- **API Keys**: Never exposed to client-side code
- **Data Sanitization**: All inputs are sanitized before processing
- **CORS**: Properly configured for security
- **Rate Limiting**: Built-in protection against abuse

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [Issues](https://github.com/yourusername/echomail/issues) page
2. Review the configuration steps
3. Ensure all environment variables are set correctly
4. Verify Gmail API and Firebase setup

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [TipTap](https://tiptap.dev/) - The rich text editor
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [Firebase](https://firebase.google.com/) - Backend services
- [Gmail API](https://developers.google.com/gmail/api) - Email integration

---

Made with ❤️ for effective email marketing
