import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, getDocs, addDoc, serverTimestamp, query, limit } from "firebase/firestore"

export async function GET() {
  try {
    // Test if email_campaigns collection exists and is accessible
    const campaignsRef = collection(db, "email_campaigns")
    const campaignsSnapshot = await getDocs(query(campaignsRef, limit(1)))

    // Test if contacts collection exists and is accessible
    const contactsRef = collection(db, "contacts")
    const contactsSnapshot = await getDocs(query(contactsRef, limit(1)))

    return NextResponse.json({ 
      success: true, 
      message: "Firebase collections are accessible",
      campaignsCount: campaignsSnapshot.size,
      contactsCount: contactsSnapshot.size
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: "Firebase connection failed",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

export async function POST() {
  try {
    // Test inserting a campaign
    const campaignsRef = collection(db, "email_campaigns")
    const docRef = await addDoc(campaignsRef, {
      subject: "Test Campaign",
      recipients: 1,
      sent: 1,
      failed: 0,
      date: serverTimestamp(),
      status: "completed",
      user_email: "test@example.com"
    })

    return NextResponse.json({ 
      success: true, 
      message: "Test campaign inserted successfully",
      documentId: docRef.id
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: "Firebase insert failed",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
