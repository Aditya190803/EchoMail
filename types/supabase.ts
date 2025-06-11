export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          role: "admin" | "user"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          role?: "admin" | "user"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          role?: "admin" | "user"
          updated_at?: string
        }
      }
      email_campaigns: {
        Row: {
          id: string
          user_id: string
          subject: string
          content: string
          created_at: string
          sent_at: string | null
          status: "draft" | "sending" | "sent" | "failed"
          total_recipients: number
          sent_count: number
          failed_count: number
          open_count: number
          click_count: number
          bounce_count: number
        }
        Insert: {
          id?: string
          user_id: string
          subject: string
          content: string
          created_at?: string
          sent_at?: string | null
          status?: "draft" | "sending" | "sent" | "failed"
          total_recipients?: number
          sent_count?: number
          failed_count?: number
          open_count?: number
          click_count?: number
          bounce_count?: number
        }
        Update: {
          id?: string
          user_id?: string
          subject?: string
          content?: string
          sent_at?: string | null
          status?: "draft" | "sending" | "sent" | "failed"
          total_recipients?: number
          sent_count?: number
          failed_count?: number
          open_count?: number
          click_count?: number
          bounce_count?: number
        }
      }
      email_recipients: {
        Row: {
          id: string
          campaign_id: string
          email: string
          name: string | null
          status: "pending" | "sent" | "failed" | "opened" | "clicked" | "bounced"
          sent_at: string | null
          opened_at: string | null
          clicked_at: string | null
          error_message: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          campaign_id: string
          email: string
          name?: string | null
          status?: "pending" | "sent" | "failed" | "opened" | "clicked" | "bounced"
          sent_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          error_message?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          campaign_id?: string
          email?: string
          name?: string | null
          status?: "pending" | "sent" | "failed" | "opened" | "clicked" | "bounced"
          sent_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          error_message?: string | null
          metadata?: Json | null
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: "admin" | "user"
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: "admin" | "user"
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: "admin" | "user"
        }
      }
    }
    Views: {
      email_metrics: {
        Row: {
          user_id: string
          total_campaigns: number
          total_emails_sent: number
          total_recipients: number
          avg_open_rate: number
          avg_click_rate: number
          avg_bounce_rate: number
          avg_delivery_rate: number
        }
      }
    }
    Functions: {
      get_user_metrics: {
        Args: { user_id: string }
        Returns: {
          total_campaigns: number
          total_emails_sent: number
          total_recipients: number
          avg_open_rate: number
          avg_click_rate: number
          avg_bounce_rate: number
          avg_delivery_rate: number
        }
      }
    }
  }
}
