import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
  try {
    // Test if email_campaigns table exists
    const { data: campaigns, error: campaignsError } = await supabaseAdmin
      .from("email_campaigns")
      .select("*")
      .limit(1)

    if (campaignsError) {
      return NextResponse.json({ 
        success: false, 
        error: "email_campaigns table error",
        details: campaignsError 
      })
    }

    // Test if contacts table exists
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from("contacts")
      .select("*")
      .limit(1)

    if (contactsError) {
      return NextResponse.json({ 
        success: false, 
        error: "contacts table error",
        details: contactsError 
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: "Database tables exist and are accessible",
      campaignsCount: campaigns?.length || 0,
      contactsCount: contacts?.length || 0
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: "Database connection failed",
      details: error 
    })
  }
}

export async function POST() {
  try {
    // Test inserting a campaign
    const { data, error } = await supabaseAdmin
      .from("email_campaigns")
      .insert({
        subject: "Test Campaign",
        recipients: 1,
        sent: 1,
        failed: 0,
        date: new Date().toISOString(),
        status: "completed",
        user_email: "test@example.com"
      })
      .select()

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: "Failed to insert test campaign",
        details: error 
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: "Test campaign inserted successfully",
      data 
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: "Database insert failed",
      details: error 
    })
  }
}
