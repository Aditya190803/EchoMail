import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { databases, config, Query, ID } from "@/lib/appwrite-server"
import type { GDPRDataExport } from "@/types/gdpr"

// Helper to sanitize data for export (remove internal fields)
function sanitizeDocument(doc: any): any {
  const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, user_email, ...rest } = doc
  return rest
}

// GET /api/gdpr/export - Export all user data (GDPR compliant)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userEmail = session.user.email
    const userName = session.user.name || undefined

    // Gather all user data from different collections
    const [contacts, campaigns, templates, drafts, signatures, groups] = await Promise.all([
      // Contacts
      databases.listDocuments(
        config.databaseId,
        config.contactsCollectionId,
        [Query.equal('user_email', userEmail), Query.limit(5000)]
      ).catch(() => ({ documents: [] })),
      
      // Campaigns
      databases.listDocuments(
        config.databaseId,
        config.campaignsCollectionId,
        [Query.equal('user_email', userEmail), Query.limit(5000)]
      ).catch(() => ({ documents: [] })),
      
      // Templates
      databases.listDocuments(
        config.databaseId,
        config.templatesCollectionId,
        [Query.equal('user_email', userEmail), Query.limit(5000)]
      ).catch(() => ({ documents: [] })),
      
      // Drafts
      config.draftEmailsCollectionId ? databases.listDocuments(
        config.databaseId,
        config.draftEmailsCollectionId,
        [Query.equal('user_email', userEmail), Query.limit(5000)]
      ).catch(() => ({ documents: [] })) : { documents: [] },
      
      // Signatures
      config.signaturesCollectionId ? databases.listDocuments(
        config.databaseId,
        config.signaturesCollectionId,
        [Query.equal('user_email', userEmail), Query.limit(5000)]
      ).catch(() => ({ documents: [] })) : { documents: [] },
      
      // Contact Groups
      databases.listDocuments(
        config.databaseId,
        config.contactGroupsCollectionId,
        [Query.equal('user_email', userEmail), Query.limit(5000)]
      ).catch(() => ({ documents: [] })),
    ])

    // Get consent records if available
    let consentRecords: any[] = []
    if (config.consentsCollectionId) {
      try {
        const result = await databases.listDocuments(
          config.databaseId,
          config.consentsCollectionId,
          [Query.equal('user_email', userEmail), Query.limit(100)]
        )
        consentRecords = result.documents
      } catch {
        // Ignore if collection doesn't exist
      }
    }

    // Build the GDPR export
    const exportData: GDPRDataExport = {
      export_date: new Date().toISOString(),
      user_email: userEmail,
      user_name: userName,
      data: {
        profile: {
          email: userEmail,
          name: userName,
          created_at: new Date().toISOString(), // We don't have the actual creation date
        },
        contacts: contacts.documents.map((doc: any) => ({
          email: doc.email,
          name: doc.name,
          company: doc.company,
          phone: doc.phone,
          created_at: doc.created_at || doc.$createdAt,
        })),
        campaigns: campaigns.documents.map((doc: any) => {
          const recipients = typeof doc.recipients === 'string' 
            ? JSON.parse(doc.recipients) 
            : doc.recipients
          return {
            subject: doc.subject,
            recipients_count: recipients?.length || 0,
            sent: doc.sent,
            failed: doc.failed,
            status: doc.status,
            created_at: doc.created_at || doc.$createdAt,
          }
        }),
        templates: templates.documents.map((doc: any) => ({
          name: doc.name,
          subject: doc.subject,
          category: doc.category,
          created_at: doc.created_at || doc.$createdAt,
        })),
        drafts: drafts.documents.map((doc: any) => {
          const recipients = typeof doc.recipients === 'string' 
            ? JSON.parse(doc.recipients) 
            : doc.recipients
          return {
            subject: doc.subject,
            recipients_count: recipients?.length || 0,
            created_at: doc.created_at || doc.$createdAt,
          }
        }),
        signatures: signatures.documents.map((doc: any) => ({
          name: doc.name,
          is_default: doc.is_default,
          created_at: doc.created_at || doc.$createdAt,
        })),
        consent_records: consentRecords.map((doc: any) => ({
          consent_type: doc.consent_type,
          granted: doc.granted,
          granted_at: doc.granted_at,
          revoked_at: doc.revoked_at,
        })),
      },
    }

    // Log the export action
    if (config.auditLogsCollectionId) {
      try {
        const ipAddress = request.headers.get('x-forwarded-for') || 
                          request.headers.get('x-real-ip') || 
                          'unknown'
        await databases.createDocument(
          config.databaseId,
          config.auditLogsCollectionId,
          ID.unique(),
          {
            user_email: userEmail,
            action: 'gdpr.export_complete',
            resource_type: 'export',
            details: JSON.stringify({
              contacts_count: contacts.documents.length,
              campaigns_count: campaigns.documents.length,
              templates_count: templates.documents.length,
            }),
            ip_address: ipAddress,
            user_agent: request.headers.get('user-agent') || 'unknown',
            created_at: new Date().toISOString(),
          }
        )
      } catch (e) {
        console.warn('Failed to log export audit event:', e)
      }
    }

    // Return the export as a downloadable JSON file
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="echomail-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error: any) {
    console.error("Error exporting user data:", error)
    return NextResponse.json(
      { error: error.message || "Failed to export user data" },
      { status: 500 }
    )
  }
}
