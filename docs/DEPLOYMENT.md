# Deployment Guide

This document describes how to deploy EchoMail to various platforms.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Vercel Deployment](#vercel-deployment)
4. [Docker Deployment](#docker-deployment)
5. [Self-Hosted Deployment](#self-hosted-deployment)
6. [Appwrite Setup](#appwrite-setup)
7. [Google OAuth Setup](#google-oauth-setup)
8. [Post-Deployment Checklist](#post-deployment-checklist)

---

## Prerequisites

Before deploying, ensure you have:

- Node.js 18+ installed locally (for building)
- An [Appwrite](https://appwrite.io/) account (Cloud or self-hosted)
- A [Google Cloud](https://console.cloud.google.com/) project with OAuth configured
- Access to your deployment platform (Vercel, Docker host, etc.)

---

## Environment Variables

Create a `.env.local` file (or configure in your platform's environment settings):

```bash
# ===========================================
# NextAuth Configuration
# ===========================================
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-generated-secret-here

# ===========================================
# Google OAuth (for Gmail API access)
# ===========================================
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ===========================================
# Appwrite Configuration
# ===========================================
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key

# Database
NEXT_PUBLIC_APPWRITE_DATABASE_ID=echomail

# Collections
NEXT_PUBLIC_APPWRITE_CONTACTS_COLLECTION_ID=contacts
NEXT_PUBLIC_APPWRITE_CAMPAIGNS_COLLECTION_ID=campaigns
NEXT_PUBLIC_APPWRITE_TEMPLATES_COLLECTION_ID=templates
NEXT_PUBLIC_APPWRITE_TEMPLATE_VERSIONS_COLLECTION_ID=template_versions
NEXT_PUBLIC_APPWRITE_CONTACT_GROUPS_COLLECTION_ID=contact_groups
NEXT_PUBLIC_APPWRITE_DRAFT_EMAILS_COLLECTION_ID=draft_emails
NEXT_PUBLIC_APPWRITE_SIGNATURES_COLLECTION_ID=signatures
NEXT_PUBLIC_APPWRITE_UNSUBSCRIBES_COLLECTION_ID=unsubscribes
NEXT_PUBLIC_APPWRITE_WEBHOOKS_COLLECTION_ID=webhooks
NEXT_PUBLIC_APPWRITE_TRACKING_EVENTS_COLLECTION_ID=tracking_events
NEXT_PUBLIC_APPWRITE_AB_TESTS_COLLECTION_ID=ab_tests
NEXT_PUBLIC_APPWRITE_AUDIT_LOGS_COLLECTION_ID=audit_logs
NEXT_PUBLIC_APPWRITE_CONSENTS_COLLECTION_ID=consents
NEXT_PUBLIC_APPWRITE_TEAMS_COLLECTION_ID=teams
NEXT_PUBLIC_APPWRITE_TEAM_MEMBERS_COLLECTION_ID=team_members

# Storage
NEXT_PUBLIC_APPWRITE_ATTACHMENTS_BUCKET_ID=attachments
```

### Generating NEXTAUTH_SECRET

```bash
# Option 1: Using OpenSSL
openssl rand -base64 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Vercel Deployment

Vercel is the recommended deployment platform for Next.js applications.

### Step 1: Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub/GitLab repository
4. Select the EchoMail repository

### Step 2: Configure Environment Variables

1. In Project Settings → Environment Variables
2. Add all variables from the `.env.local` template above
3. Set variables for Production, Preview, and Development as needed

### Step 3: Configure Build Settings

Vercel auto-detects Next.js. Default settings should work:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### Step 4: Deploy

Click "Deploy" and wait for the build to complete.

### Step 5: Configure Domain

1. Go to Project Settings → Domains
2. Add your custom domain
3. Update `NEXTAUTH_URL` environment variable to match

### Vercel-Specific Configuration

The `vercel.json` file is already configured:

```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

This extends API route timeout for bulk email sending.

---

## Docker Deployment

### Dockerfile

Create a `Dockerfile` in the project root:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: "3.8"

services:
  echomail:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXTAUTH_URL=https://your-domain.com
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - NEXT_PUBLIC_APPWRITE_ENDPOINT=${NEXT_PUBLIC_APPWRITE_ENDPOINT}
      - NEXT_PUBLIC_APPWRITE_PROJECT_ID=${NEXT_PUBLIC_APPWRITE_PROJECT_ID}
      - APPWRITE_API_KEY=${APPWRITE_API_KEY}
      # ... add all other variables
    restart: unless-stopped

  # Optional: Nginx reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - echomail
    restart: unless-stopped
```

### Build and Run

```bash
# Build the image
docker build -t echomail .

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f echomail
```

### Enable Standalone Output

Add to `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // ... other config
};
```

---

## Self-Hosted Deployment

For VPS, dedicated servers, or cloud VMs (AWS EC2, DigitalOcean, etc.):

### Option A: PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Build the application
npm run build

# Start with PM2
pm2 start npm --name "echomail" -- start

# Enable startup on boot
pm2 startup
pm2 save

# Monitor
pm2 monit
```

### Option B: Systemd Service

Create `/etc/systemd/system/echomail.service`:

```ini
[Unit]
Description=EchoMail Next.js Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/echomail
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/var/www/echomail/.env.local

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl enable echomail
sudo systemctl start echomail
sudo systemctl status echomail
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Extended timeout for email sending
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

---

## Appwrite Setup

### Option 1: Appwrite Cloud

1. Go to [cloud.appwrite.io](https://cloud.appwrite.io)
2. Create a new project
3. Create a database named `echomail`
4. Create all required collections (see schema below)
5. Create a storage bucket named `attachments`
6. Generate an API key with appropriate permissions

### Option 2: Self-Hosted Appwrite

```bash
# Using Docker
docker run -it --rm \
    --volume /var/run/docker.sock:/var/run/docker.sock \
    --volume "$(pwd)"/appwrite:/usr/src/code/appwrite:rw \
    --entrypoint="install" \
    appwrite/appwrite:1.5.7
```

### Database Schema

Run the setup script to create collections:

```bash
npm run setup:appwrite
```

Or manually create collections with these attributes:

#### contacts

- `email` (string, required)
- `name` (string)
- `company` (string)
- `phone` (string)
- `tags` (string) - JSON array
- `user_email` (string, required)
- `created_at` (string)

#### campaigns

- `subject` (string, required)
- `content` (string, required)
- `recipients` (string) - JSON array
- `sent` (integer)
- `failed` (integer)
- `status` (string)
- `send_results` (string) - JSON array
- `attachments` (string) - JSON array
- `campaign_type` (string)
- `user_email` (string, required)
- `created_at` (string)

_(See `scripts/setup-appwrite.ts` for complete schema)_

---

## Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the Gmail API

### Step 2: Configure OAuth Consent Screen

1. Go to APIs & Services → OAuth consent screen
2. Choose "External" user type
3. Fill in app information:
   - App name: EchoMail
   - Support email: your email
   - Developer contact: your email
4. Add scopes:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/gmail.send`
5. Add test users (while in testing mode)

### Step 3: Create OAuth Credentials

1. Go to APIs & Services → Credentials
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: Web application
4. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
5. Save Client ID and Client Secret

### Step 4: Publish App (for production)

1. Go to OAuth consent screen
2. Click "Publish App"
3. Complete Google verification if sending to external users

---

## Post-Deployment Checklist

- [ ] All environment variables configured
- [ ] NEXTAUTH_URL matches your domain
- [ ] Google OAuth redirect URIs updated
- [ ] SSL certificate configured (HTTPS required)
- [ ] Appwrite database and collections created
- [ ] Storage bucket created with appropriate permissions
- [ ] Test user login flow
- [ ] Test sending a test email
- [ ] Configure monitoring/logging (optional)
- [ ] Set up backup strategy for Appwrite data

---

## Troubleshooting

### Common Issues

**1. OAuth Error: "redirect_uri_mismatch"**

- Ensure redirect URI in Google Console matches exactly
- Check for trailing slashes

**2. Appwrite Connection Failed**

- Verify `NEXT_PUBLIC_APPWRITE_ENDPOINT` is correct
- Check API key permissions
- Ensure collections exist

**3. Email Sending Fails**

- Verify Gmail API is enabled in Google Cloud
- Check OAuth token has `gmail.send` scope
- Review Gmail API quotas

**4. Session Issues**

- Regenerate `NEXTAUTH_SECRET`
- Clear browser cookies
- Check `NEXTAUTH_URL` matches current domain

### Getting Help

- Check [GitHub Issues](https://github.com/your-repo/issues)
- Review application logs
- Check Appwrite console for database errors
- Review Google Cloud Console for API errors
