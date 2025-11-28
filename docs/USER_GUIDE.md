# EchoMail User Guide

Welcome to EchoMail! This guide will help you get started with sending email campaigns and managing your contacts.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Contacts](#managing-contacts)
4. [Creating Email Campaigns](#creating-email-campaigns)
5. [Using Templates](#using-templates)
6. [Draft Management](#draft-management)
7. [A/B Testing](#ab-testing)
8. [Email Signatures](#email-signatures)
9. [Managing Unsubscribes](#managing-unsubscribes)
10. [Webhooks](#webhooks)
11. [Team Collaboration](#team-collaboration)
12. [Privacy & Data Management](#privacy--data-management)
13. [Keyboard Shortcuts](#keyboard-shortcuts)
14. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Signing In

1. Navigate to the EchoMail homepage
2. Click **Sign in with Google**
3. Authorize EchoMail to access your Gmail account
4. You'll be redirected to your dashboard

> **Note:** EchoMail requires Gmail access to send emails on your behalf. Your password is never stored.

### Initial Setup

After signing in for the first time, we recommend:

1. **Import your Google Contacts** - Go to Contacts and click "Import from Google"
2. **Create an email signature** - Go to Settings → Signatures
3. **Set up templates** - Create reusable templates for common emails

---

## Dashboard Overview

The dashboard provides an at-a-glance view of your email activity:

### Statistics Cards
- **Total Sent** - Number of emails successfully sent
- **Success Rate** - Percentage of emails delivered
- **Recipients** - Total number of unique recipients
- **Campaigns** - Number of campaigns created

### Quick Actions
- **New Campaign** - Start composing a new email campaign
- **Manage Contacts** - View and edit your contact list
- **Email History** - Review past campaigns

### Recent Campaigns
View your most recent email campaigns with status indicators:
- 🟢 **Completed** - All emails sent successfully
- 🔵 **Sending** - Campaign is in progress
- 🔴 **Failed** - Some or all emails failed

---

## Managing Contacts

### Viewing Contacts

1. Click **Contacts** in the navigation bar
2. View all your contacts in a searchable list
3. Use the search bar to find specific contacts

### Adding Contacts

#### Manual Entry
1. Click **Add Contact**
2. Enter email, name, company, and phone
3. Click **Save**

#### CSV Import
1. Click **Import CSV**
2. Upload a CSV file with columns: email, name, company, phone
3. Preview and confirm the import

#### Google Contacts Import
1. Click **Import from Google**
2. Authorize access if prompted
3. Select contacts to import

### Contact Groups

Organize contacts into groups for targeted campaigns:

1. Go to Contacts
2. Click **Groups** tab
3. Click **Create Group**
4. Add contacts to the group

### Removing Duplicates

1. Go to Settings → Duplicate Contacts
2. Review detected duplicates
3. Choose which contact to keep or merge

---

## Creating Email Campaigns

### Composing an Email

1. Click **Compose** in the navigation
2. Add recipients:
   - Type email addresses
   - Select from contacts
   - Choose a contact group
3. Enter subject line
4. Write your email content using the rich text editor

### Rich Text Editor Features

- **Bold, Italic, Underline** - Format text
- **Headings** - H1, H2, H3 styles
- **Lists** - Bulleted and numbered lists
- **Links** - Add hyperlinks
- **Images** - Embed images
- **Tables** - Create data tables
- **Text Alignment** - Left, center, right, justify

### Adding Attachments

1. Click the **Attachment** button
2. Select files from your computer
3. Files are uploaded and attached to all recipients

### Personalization

Use placeholders to personalize emails:

- `{{name}}` - Recipient's name
- `{{email}}` - Recipient's email
- `{{company}}` - Company name

### Sending

1. Preview your email
2. Click **Send Campaign**
3. Monitor progress in real-time

---

## Using Templates

### Creating a Template

1. Go to **Templates**
2. Click **New Template**
3. Enter template name and category
4. Compose the email content
5. Click **Save Template**

### Using a Template

1. Go to **Compose**
2. Click **Load Template**
3. Select a template
4. Customize as needed

### Template Categories

Organize templates by category:
- Newsletter
- Promotional
- Transactional
- Follow-up
- Custom categories

---

## Draft Management

### Saving Drafts

Drafts are automatically saved as you type. You can also:

1. Click **Save Draft** to save manually
2. Go to **Drafts** to view all saved drafts

### Scheduling (Coming Soon)

Schedule drafts to be sent at a specific time:

1. Open a draft
2. Click **Schedule**
3. Select date and time
4. Confirm scheduling

---

## A/B Testing

Test different versions of your email to optimize performance.

### Creating an A/B Test

1. Go to **A/B Tests**
2. Click **New Test**
3. Choose test type:
   - **Subject Line** - Test different subject lines
   - **Content** - Test different email content
   - **Send Time** - Test different sending times
4. Configure variants A and B
5. Select recipient groups for each variant
6. Start the test

### Viewing Results

1. Go to **A/B Tests**
2. Click on a completed test
3. View metrics:
   - Open rates
   - Click rates
   - Winner determination

---

## Email Signatures

### Creating a Signature

1. Go to Settings → **Signatures**
2. Click **New Signature**
3. Enter signature name
4. Use the rich text editor to design your signature
5. Set as default if desired
6. Click **Save**

### Using Signatures

Signatures are automatically appended to your emails based on:
- Default signature setting
- Manual selection when composing

---

## Managing Unsubscribes

### Viewing Unsubscribes

1. Go to Settings → **Unsubscribes**
2. View all unsubscribed email addresses
3. See reason for unsubscribe (if provided)

### Automatic Filtering

Unsubscribed emails are automatically filtered out when:
- Composing new campaigns
- Importing contacts

### Re-subscribing

1. Find the email in the unsubscribe list
2. Click **Remove** to re-enable sending

---

## Webhooks

Receive real-time notifications about email events.

### Setting Up Webhooks

1. Go to Settings → **Webhooks**
2. Click **Add Webhook**
3. Enter:
   - Webhook URL
   - Events to listen for
   - Secret key (optional)
4. Click **Save**

### Available Events

- `campaign.sent` - Campaign completed
- `campaign.failed` - Campaign failed
- `email.opened` - Email was opened
- `email.clicked` - Link was clicked
- `email.bounced` - Email bounced

---

## Team Collaboration

Work with your team on email campaigns.

### Creating a Team

1. Go to Settings → **Teams**
2. Click **Create Team**
3. Enter team name and description
4. Click **Create**

### Inviting Members

1. Select your team
2. Click **Invite**
3. Enter member's email
4. Choose role:
   - **Admin** - Can manage members and settings
   - **Member** - Can create and send campaigns
   - **Viewer** - Read-only access
5. Send invitation

### Team Roles

| Role | View | Create | Send | Manage Members | Delete Team |
|------|------|--------|------|----------------|-------------|
| Owner | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ | ❌ |
| Member | ✅ | ✅ | ✅ | ❌ | ❌ |
| Viewer | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Privacy & Data Management

EchoMail is GDPR compliant and gives you full control over your data.

### Exporting Your Data

1. Go to Settings → **Privacy & Data**
2. Click **Download My Data**
3. A JSON file will download containing all your data

### Consent Management

Control how your data is used:

1. Go to Settings → **Privacy & Data**
2. Toggle consent preferences:
   - Data Processing (required)
   - Analytics
   - Marketing Communications
   - Third-Party Integrations

### Viewing Audit Logs

1. Go to Settings → **Audit Logs**
2. View all account activity:
   - Login events
   - Data modifications
   - Campaign sends
   - Settings changes

### Deleting Your Data

⚠️ **Warning: This action cannot be undone**

1. Go to Settings → **Privacy & Data**
2. Click **Delete All My Data**
3. Confirm deletion
4. All your data will be permanently removed

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Enter` | Send email |
| `Ctrl/Cmd + S` | Save draft |
| `Ctrl/Cmd + K` | Add link |
| `Ctrl/Cmd + B` | Bold |
| `Ctrl/Cmd + I` | Italic |
| `Ctrl/Cmd + U` | Underline |
| `Esc` | Close dialog |

---

## Troubleshooting

### Common Issues

#### "Failed to send email"
- Check your internet connection
- Verify recipient email addresses are valid
- Ensure you haven't exceeded Gmail's daily sending limit

#### "Session expired"
- Sign out and sign back in
- Clear browser cookies if the issue persists

#### "Contacts not importing"
- Verify CSV file format (email, name, company, phone)
- Check for special characters in the file
- Try a smaller batch of contacts

#### "Email marked as spam"
- Avoid spam trigger words
- Don't send to purchased email lists
- Include an unsubscribe link

### Getting Help

If you encounter issues not covered here:

1. Check the [API Documentation](./API.md)
2. Review the [Developer Guide](./DEVELOPER_GUIDE.md)
3. Contact support (if available)

---

## Tips for Success

### Email Best Practices

1. **Personalize** - Use recipient names and relevant content
2. **Mobile-friendly** - Most emails are read on mobile devices
3. **Clear CTA** - Include a clear call-to-action
4. **Test first** - Send test emails before campaigns
5. **Segment** - Target specific groups for better results
6. **Time it right** - Send when recipients are likely to read
7. **Track results** - Use A/B testing to improve

### Avoiding Spam Filters

1. Use a verified sender address
2. Avoid excessive caps and exclamation marks
3. Include a text version of your email
4. Maintain a healthy unsubscribe rate
5. Clean your contact list regularly

---

*Last updated: November 2025*
