import { sql } from "@vercel/postgres"

export interface EmailCampaign {
  id: string
  user_id: string
  subject: string
  content: string
  created_at: Date
  sent_at?: Date
  status: "draft" | "sending" | "sent" | "failed"
  total_recipients: number
  sent_count: number
  failed_count: number
  open_count: number
  click_count: number
  bounce_count: number
}

export interface EmailRecipient {
  id: string
  campaign_id: string
  email: string
  name?: string
  status: "pending" | "sent" | "failed" | "opened" | "clicked" | "bounced"
  sent_at?: Date
  opened_at?: Date
  clicked_at?: Date
  error_message?: string
  metadata?: Record<string, any>
}

export interface EmailMetrics {
  total_campaigns: number
  total_emails_sent: number
  total_recipients: number
  avg_open_rate: number
  avg_click_rate: number
  avg_bounce_rate: number
  avg_delivery_rate: number
}

// Database initialization
export async function initializeDatabase() {
  try {
    // Create campaigns table
    await sql`
      CREATE TABLE IF NOT EXISTS email_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        subject TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        sent_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'draft',
        total_recipients INTEGER DEFAULT 0,
        sent_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        open_count INTEGER DEFAULT 0,
        click_count INTEGER DEFAULT 0,
        bounce_count INTEGER DEFAULT 0
      )
    `

    // Create recipients table
    await sql`
      CREATE TABLE IF NOT EXISTS email_recipients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        status VARCHAR(20) DEFAULT 'pending',
        sent_at TIMESTAMP,
        opened_at TIMESTAMP,
        clicked_at TIMESTAMP,
        error_message TEXT,
        metadata JSONB
      )
    `

    // Create indexes for better performance
    await sql`CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON email_campaigns(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON email_campaigns(created_at)`
    await sql`CREATE INDEX IF NOT EXISTS idx_recipients_campaign_id ON email_recipients(campaign_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_recipients_email ON email_recipients(email)`
    await sql`CREATE INDEX IF NOT EXISTS idx_recipients_status ON email_recipients(status)`

    console.log("Database initialized successfully")
  } catch (error) {
    console.error("Database initialization error:", error)
    throw error
  }
}

// Campaign operations
export async function createCampaign(
  userId: string,
  subject: string,
  content: string,
  recipients: Array<{ email: string; name?: string; metadata?: Record<string, any> }>,
): Promise<string> {
  const campaignResult = await sql`
    INSERT INTO email_campaigns (user_id, subject, content, total_recipients)
    VALUES (${userId}, ${subject}, ${content}, ${recipients.length})
    RETURNING id
  `

  const campaignId = campaignResult.rows[0].id

  // Insert recipients
  for (const recipient of recipients) {
    await sql`
      INSERT INTO email_recipients (campaign_id, email, name, metadata)
      VALUES (${campaignId}, ${recipient.email}, ${recipient.name || null}, ${JSON.stringify(recipient.metadata || {})})
    `
  }

  return campaignId
}

export async function getCampaigns(userId: string, limit = 50, offset = 0): Promise<EmailCampaign[]> {
  const result = await sql`
    SELECT * FROM email_campaigns 
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  return result.rows as EmailCampaign[]
}

export async function getCampaignById(campaignId: string): Promise<EmailCampaign | null> {
  const result = await sql`
    SELECT * FROM email_campaigns WHERE id = ${campaignId}
  `

  return (result.rows[0] as EmailCampaign) || null
}

export async function updateCampaignStatus(campaignId: string, status: string, sentAt?: Date) {
  await sql`
    UPDATE email_campaigns 
    SET status = ${status}, sent_at = ${sentAt || null}
    WHERE id = ${campaignId}
  `
}

export async function updateRecipientStatus(
  recipientId: string,
  status: string,
  timestamp?: Date,
  errorMessage?: string,
) {
  const timestampField =
    status === "sent" ? "sent_at" : status === "opened" ? "opened_at" : status === "clicked" ? "clicked_at" : null

  if (timestampField) {
    await sql`
      UPDATE email_recipients 
      SET status = ${status}, ${sql(timestampField)} = ${timestamp || new Date()}, error_message = ${errorMessage || null}
      WHERE id = ${recipientId}
    `
  } else {
    await sql`
      UPDATE email_recipients 
      SET status = ${status}, error_message = ${errorMessage || null}
      WHERE id = ${recipientId}
    `
  }
}

export async function getEmailMetrics(userId: string): Promise<EmailMetrics> {
  const result = await sql`
    SELECT 
      COUNT(*) as total_campaigns,
      SUM(sent_count) as total_emails_sent,
      SUM(total_recipients) as total_recipients,
      CASE 
        WHEN SUM(sent_count) > 0 THEN (SUM(open_count)::float / SUM(sent_count) * 100)
        ELSE 0 
      END as avg_open_rate,
      CASE 
        WHEN SUM(sent_count) > 0 THEN (SUM(click_count)::float / SUM(sent_count) * 100)
        ELSE 0 
      END as avg_click_rate,
      CASE 
        WHEN SUM(total_recipients) > 0 THEN (SUM(bounce_count)::float / SUM(total_recipients) * 100)
        ELSE 0 
      END as avg_bounce_rate,
      CASE 
        WHEN SUM(total_recipients) > 0 THEN (SUM(sent_count)::float / SUM(total_recipients) * 100)
        ELSE 0 
      END as avg_delivery_rate
    FROM email_campaigns 
    WHERE user_id = ${userId}
  `

  return result.rows[0] as EmailMetrics
}

export async function getCampaignRecipients(campaignId: string): Promise<EmailRecipient[]> {
  const result = await sql`
    SELECT * FROM email_recipients 
    WHERE campaign_id = ${campaignId}
    ORDER BY sent_at DESC, email ASC
  `

  return result.rows as EmailRecipient[]
}

export async function getRecentActivity(userId: string, limit = 10): Promise<any[]> {
  const result = await sql`
    SELECT 
      c.subject,
      c.sent_at,
      c.sent_count,
      c.failed_count,
      c.status
    FROM email_campaigns c
    WHERE c.user_id = ${userId} AND c.status != 'draft'
    ORDER BY c.sent_at DESC
    LIMIT ${limit}
  `

  return result.rows
}

export async function getDailyStats(userId: string, days = 30): Promise<any[]> {
  const result = await sql`
    SELECT 
      DATE(sent_at) as date,
      COUNT(*) as campaigns,
      SUM(sent_count) as emails_sent,
      SUM(open_count) as opens,
      SUM(click_count) as clicks
    FROM email_campaigns 
    WHERE user_id = ${userId} 
      AND sent_at >= NOW() - INTERVAL '${days} days'
      AND status = 'sent'
    GROUP BY DATE(sent_at)
    ORDER BY date DESC
  `

  return result.rows
}
