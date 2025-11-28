# EchoMail Developer Guide

This guide provides everything you need to set up, develop, and contribute to EchoMail.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [Project Structure](#project-structure)
4. [Technology Stack](#technology-stack)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup (Appwrite)](#database-setup-appwrite)
7. [Authentication](#authentication)
8. [Development Workflow](#development-workflow)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Contributing](#contributing)
12. [Architecture](#architecture)

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or later
- **Bun** (recommended) or npm/yarn
- **Git**
- An **Appwrite** instance (cloud or self-hosted)
- A **Google Cloud Console** project with Gmail API enabled

---

## Project Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Aditya190803/EchoMail.git
cd EchoMail
```

### 2. Install Dependencies

Using Bun (recommended):
```bash
bun install
```

Using npm:
```bash
npm install
```

### 3. Configure Environment

Copy the example environment file:
```bash
cp .env.example .env.local
```

See [Environment Configuration](#environment-configuration) for details.

### 4. Set Up Appwrite Collections

Run the setup script:
```bash
bun run appwrite:setup
```

This creates all required database collections with proper attributes and indexes.

### 5. Start Development Server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
EchoMail/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── appwrite/      # Appwrite database operations
│   │   ├── gdpr/          # GDPR compliance endpoints
│   │   ├── teams/         # Team management
│   │   ├── send-email/    # Email sending
│   │   └── ...
│   ├── auth/              # Authentication pages
│   ├── compose/           # Email composition
│   ├── contacts/          # Contact management
│   ├── dashboard/         # Main dashboard
│   ├── settings/          # Settings pages
│   │   ├── audit-logs/    # Audit log viewer
│   │   ├── gdpr/          # Privacy & data settings
│   │   ├── signatures/    # Email signatures
│   │   ├── teams/         # Team management
│   │   ├── unsubscribes/  # Unsubscribe management
│   │   └── webhooks/      # Webhook configuration
│   ├── templates/         # Email templates
│   └── ...
├── components/            # React components
│   ├── ui/               # Shadcn/ui components
│   └── ...
├── docs/                  # Documentation
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
│   ├── appwrite.ts       # Client-side Appwrite services
│   ├── appwrite-server.ts# Server-side Appwrite services
│   ├── auth.ts           # NextAuth configuration
│   └── ...
├── scripts/              # Setup and migration scripts
├── tests/                # Test files
│   ├── e2e/             # End-to-end tests (Playwright)
│   ├── unit/            # Unit tests (Vitest)
│   └── ...
├── types/                # TypeScript type definitions
└── public/               # Static assets
```

---

## Technology Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS
- **Shadcn/ui** - UI component library
- **TipTap** - Rich text editor
- **Lucide Icons** - Icon library

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **NextAuth.js** - Authentication
- **Appwrite** - Backend-as-a-Service (Database, Storage)
- **Gmail API** - Email sending

### Testing
- **Vitest** - Unit testing
- **Playwright** - End-to-end testing
- **Testing Library** - Component testing

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** - Static type checking

---

## Environment Configuration

Create a `.env.local` file with the following variables:

```env
# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key

# Appwrite Database
NEXT_PUBLIC_APPWRITE_DATABASE_ID=echomail

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

# GDPR & Compliance Collections (optional)
NEXT_PUBLIC_APPWRITE_AUDIT_LOGS_COLLECTION_ID=audit_logs
NEXT_PUBLIC_APPWRITE_CONSENT_RECORDS_COLLECTION_ID=consent_records
NEXT_PUBLIC_APPWRITE_DATA_EXPORT_REQUESTS_COLLECTION_ID=data_export_requests

# Team Collections (optional)
NEXT_PUBLIC_APPWRITE_TEAMS_COLLECTION_ID=teams
NEXT_PUBLIC_APPWRITE_TEAM_MEMBERS_COLLECTION_ID=team_members
NEXT_PUBLIC_APPWRITE_TEAM_INVITES_COLLECTION_ID=team_invites

# Appwrite Storage
NEXT_PUBLIC_APPWRITE_ATTACHMENTS_BUCKET_ID=attachments
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable the Gmail API
4. Configure OAuth consent screen
5. Create OAuth 2.0 credentials
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-domain.com/api/auth/callback/google`

### Appwrite Setup

1. Create an Appwrite account at [cloud.appwrite.io](https://cloud.appwrite.io)
2. Create a new project
3. Create an API key with database and storage permissions
4. Copy project ID and endpoint to environment variables

---

## Database Setup (Appwrite)

### Automatic Setup

Run the setup script to create all collections:

```bash
bun run appwrite:setup
```

### Manual Setup

If you prefer manual setup, create the following collections:

#### Contacts Collection
- `email` (string, required)
- `name` (string)
- `company` (string)
- `phone` (string)
- `user_email` (string, required)
- `created_at` (string)

#### Campaigns Collection
- `subject` (string, required)
- `content` (string)
- `recipients` (string) - JSON array
- `sent` (integer)
- `failed` (integer)
- `status` (string)
- `campaign_type` (string)
- `attachments` (string) - JSON array
- `send_results` (string) - JSON array
- `user_email` (string, required)
- `created_at` (string)

See `scripts/setup-appwrite.ts` for complete collection schemas.

### Adding New Collections

To add GDPR and Team collections, add these environment variables and run:

```bash
# Set the new collection IDs in .env.local
# Then run the setup script again
bun run appwrite:setup
```

---

## Authentication

EchoMail uses NextAuth.js with Google OAuth provider.

### Configuration

Authentication is configured in `lib/auth.ts`:

```typescript
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/gmail.send ...",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  // ...
}
```

### Using Authentication in API Routes

```typescript
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // User is authenticated
  const userEmail = session.user.email
}
```

### Using Authentication in Components

```typescript
"use client"

import { useSession } from "next-auth/react"

export function MyComponent() {
  const { data: session, status } = useSession()

  if (status === "loading") return <Loading />
  if (status === "unauthenticated") return <SignIn />

  return <div>Hello, {session.user.name}</div>
}
```

---

## Development Workflow

### Running Development Server

```bash
bun run dev
```

### Type Checking

```bash
# Check TypeScript types
bun run build  # or: npx tsc --noEmit
```

### Linting

```bash
bun run lint
```

### Building for Production

```bash
bun run build
```

### Running Production Build

```bash
bun run start
```

---

## Testing

### Unit Tests (Vitest)

```bash
# Run all unit tests
bun run test

# Run with UI
bun run test:ui

# Run with coverage
bun run test:coverage
```

### End-to-End Tests (Playwright)

```bash
# Run E2E tests
bun run test:e2e

# Run with UI
bun run test:e2e:ui

# Run headed (visible browser)
bun run test:e2e:headed
```

### Writing Tests

#### Unit Test Example

```typescript
// tests/unit/example.test.ts
import { describe, it, expect } from 'vitest'

describe('Example', () => {
  it('should work', () => {
    expect(1 + 1).toBe(2)
  })
})
```

#### E2E Test Example

```typescript
// tests/e2e/example.spec.ts
import { test, expect } from '@playwright/test'

test('homepage loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/EchoMail/)
})
```

---

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Configure environment variables
4. Deploy

### Manual Deployment

1. Build the application:
   ```bash
   bun run build
   ```

2. Start the server:
   ```bash
   bun run start
   ```

### Environment Variables for Production

Ensure all environment variables are set in your deployment platform:

- `NEXTAUTH_URL` - Your production URL
- `NEXTAUTH_SECRET` - Strong random secret
- All Appwrite and Google OAuth variables

---

## Contributing

### Getting Started

1. Fork the repository
2. Create a feature branch:
   ```bash
   git checkout -b feature/my-feature
   ```
3. Make your changes
4. Run tests:
   ```bash
   bun run test
   bun run lint
   ```
5. Commit your changes:
   ```bash
   git commit -m "feat: add new feature"
   ```
6. Push to your fork:
   ```bash
   git push origin feature/my-feature
   ```
7. Open a Pull Request

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance

### Code Style

- Use TypeScript for all new code
- Follow existing patterns in the codebase
- Add comments for complex logic
- Write tests for new features

---

## Architecture

### Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  Next.js    │────▶│  Appwrite   │
│  (Browser)  │◀────│  API Routes │◀────│  Database   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Gmail API  │
                    │  (Sending)  │
                    └─────────────┘
```

### Key Services

1. **Client Services** (`lib/appwrite.ts`)
   - Make API requests to Next.js routes
   - Handle client-side state

2. **Server Services** (`lib/appwrite-server.ts`)
   - Direct Appwrite database access
   - Server-side authentication

3. **Authentication** (`lib/auth.ts`)
   - NextAuth.js configuration
   - Token refresh logic

### Adding New Features

1. **Define Types** in `types/`
2. **Create API Route** in `app/api/`
3. **Add Client Service** in `lib/appwrite.ts`
4. **Create UI Page** in `app/`
5. **Add Tests** in `tests/`
6. **Update Documentation**

---

## Troubleshooting

### Common Issues

#### "Collection not found"
- Run `bun run appwrite:setup` to create collections
- Verify collection IDs in `.env.local`

#### "Unauthorized" errors
- Check Google OAuth credentials
- Verify `NEXTAUTH_SECRET` is set
- Ensure `NEXTAUTH_URL` matches your domain

#### Build errors
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && bun install`

### Getting Help

- Check the [API Documentation](./API.md)
- Review the [User Guide](./USER_GUIDE.md)
- Open an issue on GitHub

---

*Last updated: November 2025*
