# ADR-002: Authentication Strategy with NextAuth + Gmail

## Status

Accepted

## Date

2024-01

## Context

EchoMail is an email marketing application that sends emails through users' Gmail accounts. This requires:

1. User authentication for accessing the application
2. Gmail OAuth tokens for sending emails via Gmail API
3. Token refresh mechanism for long-running campaigns
4. Secure storage of OAuth credentials

We needed to choose an authentication solution that handles both user login and Gmail API access.

## Decision

We will use **NextAuth.js (Auth.js)** with the Google provider, configured to:

1. Authenticate users via Google OAuth
2. Request Gmail send scope (`https://www.googleapis.com/auth/gmail.send`)
3. Store access and refresh tokens in the JWT session
4. Implement token refresh via a dedicated API route

### Configuration

```typescript
// lib/auth.ts
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.send",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at! * 1000;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    },
  },
};
```

### Token Refresh Flow

1. Client checks token expiry before sending emails
2. If expired, calls `/api/refresh-token`
3. Server uses refresh token to get new access token
4. New token returned to client and used for Gmail API calls

## Consequences

### Positive

- **Unified Authentication**: Single sign-on with Google for both app access and Gmail
- **No Password Management**: Users don't need separate credentials
- **Secure Token Storage**: JWT tokens encrypted and signed by NextAuth
- **Automatic Session Management**: NextAuth handles session lifecycle
- **Trust Factor**: Users authenticate with their trusted Google account

### Negative

- **Google-Only**: Users must have a Google account
- **Token Expiry**: Need to handle token refresh during campaigns
- **Scope Sensitivity**: Gmail send scope requires Google verification for production
- **No Offline Access**: Can't send emails without user's browser session (mitigated with refresh tokens)

### Neutral

- Access tokens expire in 1 hour, requiring refresh for long campaigns
- Users see Google's OAuth consent screen on first login

## Alternatives Considered

### Alternative 1: Email/Password + Gmail OAuth

Separate login system with Gmail OAuth only for email sending.

**Rejected because**:

- More complex UX (two authentication flows)
- Users would need to maintain separate password
- Increased security surface area

### Alternative 2: SMTP with App Passwords

Using Gmail SMTP with App Passwords instead of OAuth.

**Rejected because**:

- Requires users to create App Passwords (Google Workspace only)
- Less secure than OAuth
- Not available for free Gmail accounts

### Alternative 3: Third-Party Email Service (SendGrid, etc.)

Using a dedicated email service provider.

**Rejected because**:

- Additional cost
- Emails wouldn't come from user's actual Gmail address
- Different sender reputation considerations

## Security Considerations

1. **Refresh Tokens**: Stored encrypted, only accessible server-side
2. **Access Tokens**: Short-lived (1 hour), refreshed as needed
3. **Scope Limitation**: Only `gmail.send` scope, not full Gmail access
4. **Session Security**: NextAuth handles CSRF, secure cookies, etc.

## References

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth 2.0 for Gmail](https://developers.google.com/identity/protocols/oauth2)
- [Gmail API Scopes](https://developers.google.com/gmail/api/auth/scopes)
