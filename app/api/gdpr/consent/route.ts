import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { databases, config, Query, ID } from "@/lib/appwrite-server"

// GET /api/gdpr/consent - Get all consent records for the user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!config.consentRecordsCollectionId) {
      // Return default consents if collection not configured
      return NextResponse.json({
        total: 0,
        documents: [],
        defaults: {
          marketing: { given: false },
          analytics: { given: true },
          data_processing: { given: true },
          third_party: { given: false },
        },
      })
    }

    const response = await databases.listDocuments(
      config.databaseId,
      config.consentRecordsCollectionId,
      [
        Query.equal('user_email', session.user.email),
        Query.orderDesc('$createdAt'),
      ]
    )

    return NextResponse.json({ 
      total: response.total, 
      documents: response.documents 
    })
  } catch (error: any) {
    console.error("Error fetching consent records:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch consent records" },
      { status: 500 }
    )
  }
}

// POST /api/gdpr/consent - Create or update a consent record
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { consent_type, given } = body

    const validConsentTypes = ['marketing', 'analytics', 'data_processing', 'third_party']
    if (!validConsentTypes.includes(consent_type)) {
      return NextResponse.json(
        { error: `Invalid consent_type. Must be one of: ${validConsentTypes.join(', ')}` },
        { status: 400 }
      )
    }

    if (typeof given !== 'boolean') {
      return NextResponse.json(
        { error: "given must be a boolean" },
        { status: 400 }
      )
    }

    if (!config.consentRecordsCollectionId) {
      return NextResponse.json(
        { error: "Consent records collection not configured" },
        { status: 503 }
      )
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Check if consent record exists
    const existingConsent = await databases.listDocuments(
      config.databaseId,
      config.consentRecordsCollectionId,
      [
        Query.equal('user_email', session.user.email),
        Query.equal('consent_type', consent_type),
        Query.limit(1),
      ]
    )

    let result
    if (existingConsent.documents.length > 0) {
      // Update existing consent
      const existingDoc = existingConsent.documents[0]
      const updateData: any = {
        given,
        ip_address: ipAddress,
        user_agent: userAgent,
      }
      
      if (given) {
        updateData.given_at = new Date().toISOString()
      } else {
        updateData.revoked_at = new Date().toISOString()
      }

      result = await databases.updateDocument(
        config.databaseId,
        config.consentRecordsCollectionId,
        existingDoc.$id,
        updateData
      )
    } else {
      // Create new consent record
      result = await databases.createDocument(
        config.databaseId,
        config.consentRecordsCollectionId,
        ID.unique(),
        {
          user_email: session.user.email,
          consent_type,
          given,
          given_at: given ? new Date().toISOString() : null,
          revoked_at: given ? null : new Date().toISOString(),
          ip_address: ipAddress,
          user_agent: userAgent,
        }
      )
    }

    // Log the consent action
    if (config.auditLogsCollectionId) {
      try {
        await databases.createDocument(
          config.databaseId,
          config.auditLogsCollectionId,
          ID.unique(),
          {
            user_email: session.user.email,
            action: given ? 'gdpr.consent_given' : 'gdpr.consent_revoked',
            resource_type: 'settings',
            details: JSON.stringify({ consent_type }),
            ip_address: ipAddress,
            user_agent: userAgent,
            created_at: new Date().toISOString(),
          }
        )
      } catch (e) {
        console.warn('Failed to log consent audit event:', e)
      }
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error updating consent:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update consent" },
      { status: 500 }
    )
  }
}
