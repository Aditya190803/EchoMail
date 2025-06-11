import { supabaseAdmin } from "./supabase"
import type { EmailCampaign, EmailMetrics, EmailRecipient } from "@/types/email"

export class DatabaseService {
  // Campaign operations
  static async createCampaign(
    userId: string,
    subject: string,
    content: string,
    recipients: Array<{ email: string; name?: string; metadata?: Record<string, any> }>,
  ): Promise<string> {
    // Insert campaign
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from("email_campaigns")
      .insert({
        user_id: userId,
        subject,
        content,
        total_recipients: recipients.length,
      })
      .select("id")
      .single()

    if (campaignError || !campaign) {
      console.error("Error creating campaign:", campaignError)
      throw new Error("Failed to create campaign")
    }

    // Insert recipients
    const recipientsData = recipients.map((recipient) => ({
      campaign_id: campaign.id,
      email: recipient.email,
      name: recipient.name || null,
      metadata: recipient.metadata || {},
    }))

    const { error: recipientsError } = await supabaseAdmin.from("email_recipients").insert(recipientsData)

    if (recipientsError) {
      console.error("Error adding recipients:", recipientsError)
      throw new Error("Failed to add recipients")
    }

    return campaign.id
  }

  static async getCampaigns(userId: string, limit = 50, offset = 0): Promise<EmailCampaign[]> {
    const { data, error } = await supabaseAdmin
      .from("email_campaigns")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("Error fetching campaigns:", error)
      throw new Error("Failed to fetch campaigns")
    }

    return data as unknown as EmailCampaign[]
  }

  static async getCampaignById(campaignId: string): Promise<EmailCampaign | null> {
    const { data, error } = await supabaseAdmin.from("email_campaigns").select("*").eq("id", campaignId).single()

    if (error) {
      console.error("Error fetching campaign:", error)
      return null
    }

    return data as unknown as EmailCampaign
  }

  static async updateCampaignStatus(campaignId: string, status: string, sentAt?: Date) {
    const { error } = await supabaseAdmin
      .from("email_campaigns")
      .update({
        status,
        sent_at: sentAt?.toISOString(),
      })
      .eq("id", campaignId)

    if (error) {
      console.error("Error updating campaign status:", error)
      throw new Error("Failed to update campaign status")
    }
  }

  static async updateRecipientStatus(recipientId: string, status: string, timestamp?: Date, errorMessage?: string) {
    const updateData: any = { status }

    if (status === "sent") updateData.sent_at = timestamp?.toISOString() || new Date().toISOString()
    if (status === "opened") updateData.opened_at = timestamp?.toISOString() || new Date().toISOString()
    if (status === "clicked") updateData.clicked_at = timestamp?.toISOString() || new Date().toISOString()
    if (errorMessage) updateData.error_message = errorMessage

    const { error } = await supabaseAdmin.from("email_recipients").update(updateData).eq("id", recipientId)

    if (error) {
      console.error("Error updating recipient status:", error)
      throw new Error("Failed to update recipient status")
    }
  }

  static async getEmailMetrics(userId: string): Promise<EmailMetrics> {
    const { data, error } = await supabaseAdmin.rpc("get_user_metrics", { user_id: userId })

    if (error) {
      console.error("Error fetching email metrics:", error)
      throw new Error("Failed to fetch email metrics")
    }

    return data as unknown as EmailMetrics
  }

  static async getCampaignRecipients(campaignId: string): Promise<EmailRecipient[]> {
    const { data, error } = await supabaseAdmin
      .from("email_recipients")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("sent_at", { ascending: false })
      .order("email", { ascending: true })

    if (error) {
      console.error("Error fetching campaign recipients:", error)
      throw new Error("Failed to fetch campaign recipients")
    }

    return data as unknown as EmailRecipient[]
  }

  static async getRecentActivity(userId: string, limit = 10): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from("email_campaigns")
      .select("subject, sent_at, sent_count, failed_count, status")
      .eq("user_id", userId)
      .neq("status", "draft")
      .order("sent_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching recent activity:", error)
      throw new Error("Failed to fetch recent activity")
    }

    return data
  }

  static async getDailyStats(userId: string, days = 30): Promise<any[]> {
    const { data, error } = await supabaseAdmin.rpc("get_daily_stats", { user_id: userId, days_back: days })

    if (error) {
      console.error("Error fetching daily stats:", error)
      throw new Error("Failed to fetch daily stats")
    }

    return data || []
  }

  // User operations
  static async getUserRole(userId: string): Promise<string> {
    const { data, error } = await supabaseAdmin.from("users").select("role").eq("id", userId).single()

    if (error || !data) {
      console.error("Error fetching user role:", error)
      return "user" // Default to regular user
    }

    return data.role
  }

  static async updateUserRole(userId: string, role: "admin" | "user"): Promise<void> {
    const { error } = await supabaseAdmin.from("users").update({ role }).eq("id", userId)

    if (error) {
      console.error("Error updating user role:", error)
      throw new Error("Failed to update user role")
    }
  }
}
