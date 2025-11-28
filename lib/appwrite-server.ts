import { Client, Databases, Storage, Query, ID } from 'node-appwrite'

// Server-side Appwrite configuration - NO HARDCODED VALUES
const appwriteConfig = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
  apiKey: process.env.APPWRITE_API_KEY!,
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  contactsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_CONTACTS_COLLECTION_ID!,
  campaignsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_CAMPAIGNS_COLLECTION_ID!,
  templatesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_TEMPLATES_COLLECTION_ID!,
  contactGroupsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_CONTACT_GROUPS_COLLECTION_ID!,
  attachmentsBucketId: process.env.NEXT_PUBLIC_APPWRITE_ATTACHMENTS_BUCKET_ID!,
  // Additional feature collections
  draftEmailsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_DRAFT_EMAILS_COLLECTION_ID!,
  signaturesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_SIGNATURES_COLLECTION_ID!,
  unsubscribesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_UNSUBSCRIBES_COLLECTION_ID!,
  webhooksCollectionId: process.env.NEXT_PUBLIC_APPWRITE_WEBHOOKS_COLLECTION_ID!,
  trackingEventsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_TRACKING_EVENTS_COLLECTION_ID!,
  abTestsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_AB_TESTS_COLLECTION_ID!,
}

// Initialize server-side Appwrite client
const client = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setKey(appwriteConfig.apiKey)

// Initialize services
export const databases = new Databases(client)
export const storage = new Storage(client)

// Export config and helpers
export const config = appwriteConfig
export { Query, ID }

// ============================================
// Server-side Storage Operations
// ============================================

export const serverStorageService = {
  // Upload a file from buffer (server-side)
  async uploadFile(
    buffer: Buffer,
    fileName: string,
    fileType: string,
    userEmail: string
  ): Promise<{ url: string; fileId: string; fileName: string; fileSize: number }> {
    const sanitizedEmail = userEmail.replace('@', '_at_').replace(/[^a-zA-Z0-9_]/g, '_')
    const uniqueId = ID.unique()
    
    // For node-appwrite, we need to use InputFile
    const { InputFile } = await import('node-appwrite/file')
    const inputFile = InputFile.fromBuffer(buffer, fileName)
    
    const result = await storage.createFile(
      appwriteConfig.attachmentsBucketId,
      uniqueId,
      inputFile
    )
    
    // Build the file URL
    const fileUrl = `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.attachmentsBucketId}/files/${result.$id}/view?project=${appwriteConfig.projectId}`
    
    return {
      fileId: result.$id,
      fileName: fileName,
      fileSize: buffer.length,
      url: fileUrl,
    }
  },

  // Get file as buffer for email attachment
  async getFileBuffer(fileId: string): Promise<Buffer> {
    const result = await storage.getFileDownload(
      appwriteConfig.attachmentsBucketId,
      fileId
    )
    // result is an ArrayBuffer
    return Buffer.from(result)
  },

  // Get file view URL
  getFileUrl(fileId: string): string {
    return `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.attachmentsBucketId}/files/${fileId}/view?project=${appwriteConfig.projectId}`
  },

  // Delete a file
  async deleteFile(fileId: string) {
    return storage.deleteFile(
      appwriteConfig.attachmentsBucketId,
      fileId
    )
  },
}

// ============================================
// Server-side Campaign Operations
// ============================================

export const serverCampaignsService = {
  // Create a new campaign
  async create(campaign: {
    subject: string
    content: string
    recipients: string[]
    sent: number
    failed: number
    status: 'completed' | 'sending' | 'failed'
    user_email: string
    campaign_type?: string
    attachments?: any[]
    send_results?: any[]
  }) {
    return databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.campaignsCollectionId,
      ID.unique(),
      {
        ...campaign,
        recipients: JSON.stringify(campaign.recipients),
        attachments: campaign.attachments ? JSON.stringify(campaign.attachments) : null,
        send_results: campaign.send_results ? JSON.stringify(campaign.send_results) : null,
        created_at: new Date().toISOString(),
      }
    )
  },
}

export default client
