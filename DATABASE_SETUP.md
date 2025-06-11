# EchoMail Database Setup

## Supabase Database Schema

This project requires two main tables in your Supabase database:

### 1. `email_campaigns` table
Stores information about sent email campaigns including subject, recipient count, success/failure rates, and timestamps.

### 2. `contacts` table
Stores user contacts with email addresses, names, companies, phone numbers, and tags.

## Setup Instructions

1. **Copy the SQL Schema**
   - Open the `schema.sql` file in this project
   - Copy all the SQL commands

2. **Run in Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor
   - Paste and execute the schema SQL
   - This will create all necessary tables, indexes, and security policies

3. **Verify Setup**
   - Check that both tables are created in the Table Editor
   - Verify that Row Level Security (RLS) is enabled
   - Ensure the security policies are in place

## Security Features

- **Row Level Security (RLS)**: Users can only access their own data
- **Authentication-based Policies**: Data access is tied to the authenticated user's email
- **Automatic Timestamps**: Created and updated timestamps are managed automatically

## Usage

Once the database is set up:
- The dashboard will automatically load campaign data from Supabase
- Users can manage contacts through the contacts page
- Analytics are calculated from real campaign data
- New campaigns are automatically saved when emails are sent

## Environment Variables

Make sure your `.env` file includes:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```
