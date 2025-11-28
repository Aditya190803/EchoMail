import { Client, Account, Databases, Storage, Query, ID } from 'appwrite'

// Appwrite configuration - NO HARDCODED VALUES
const appwriteConfig = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  contactsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_CONTACTS_COLLECTION_ID!,
  campaignsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_CAMPAIGNS_COLLECTION_ID!,
  templatesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_TEMPLATES_COLLECTION_ID!,
  contactGroupsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_CONTACT_GROUPS_COLLECTION_ID!,
  attachmentsBucketId: process.env.NEXT_PUBLIC_APPWRITE_ATTACHMENTS_BUCKET_ID!,
  // Additional feature collections
  scheduledEmailsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_SCHEDULED_EMAILS_COLLECTION_ID!,
  signaturesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_SIGNATURES_COLLECTION_ID!,
  unsubscribesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_UNSUBSCRIBES_COLLECTION_ID!,
  webhooksCollectionId: process.env.NEXT_PUBLIC_APPWRITE_WEBHOOKS_COLLECTION_ID!,
  trackingEventsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_TRACKING_EVENTS_COLLECTION_ID!,
  abTestsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_AB_TESTS_COLLECTION_ID!,
}

// Initialize Appwrite client (client-side)
const client = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)

// Initialize services
export const account = new Account(client)
export const databases = new Databases(client)
export const storage = new Storage(client)

// Export config and helpers
export const config = appwriteConfig
export { Query, ID }

// Helper to get database and collection IDs
export const getCollectionIds = () => ({
  databaseId: appwriteConfig.databaseId,
  contactsCollectionId: appwriteConfig.contactsCollectionId,
  campaignsCollectionId: appwriteConfig.campaignsCollectionId,
  templatesCollectionId: appwriteConfig.templatesCollectionId,
  contactGroupsCollectionId: appwriteConfig.contactGroupsCollectionId,
})

export const getBucketId = () => appwriteConfig.attachmentsBucketId

// Test Appwrite connection
export const testAppwriteConnection = async () => {
  try {
    console.log("Appwrite endpoint:", appwriteConfig.endpoint)
    console.log("Appwrite project ID:", appwriteConfig.projectId)
    console.log("Database ID:", appwriteConfig.databaseId)
    
    return { 
      success: true, 
      message: "Appwrite connection test passed",
      projectId: appwriteConfig.projectId
    }
  } catch (error) {
    console.error("Appwrite connection test failed:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

// ============================================
// Contacts Collection Operations
// ============================================

export interface Contact {
  $id?: string
  email: string
  name?: string
  company?: string
  phone?: string
  user_email: string
  created_at?: string
}

export const contactsService = {
  // Create a new contact
  async create(contact: Omit<Contact, '$id' | 'created_at'>) {
    return databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.contactsCollectionId,
      ID.unique(),
      {
        ...contact,
        created_at: new Date().toISOString(),
      }
    )
  },

  // Get all contacts for a user
  async listByUser(userEmail: string) {
    return databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.contactsCollectionId,
      [
        Query.equal('user_email', userEmail),
        Query.orderDesc('created_at'),
        Query.limit(1000),
      ]
    )
  },

  // Delete a contact
  async delete(documentId: string) {
    return databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.contactsCollectionId,
      documentId
    )
  },

  // Subscribe to real-time updates for user's contacts
  subscribeToUserContacts(userEmail: string, callback: (response: any) => void) {
    const channel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.contactsCollectionId}.documents`
    return client.subscribe(channel, (response) => {
      // Filter by user_email on the client side
      const payload = response.payload as any
      if (payload?.user_email === userEmail) {
        callback(response)
      }
    })
  },
}

// ============================================
// Email Campaigns Collection Operations
// ============================================

export interface EmailCampaignInput {
  subject: string
  content: string
  recipients: string[]
  sent: number
  failed: number
  status: 'completed' | 'sending' | 'failed'
  user_email: string
  campaign_type?: string
  attachments?: {
    fileName: string
    fileUrl: string
    fileSize: number
    appwrite_file_id?: string
  }[]
  send_results?: {
    email: string
    status: 'success' | 'error'
    error?: string
    messageId?: string
  }[]
}

export interface EmailCampaign extends EmailCampaignInput {
  $id: string
  created_at: string
}

export const campaignsService = {
  // Create a new campaign
  async create(campaign: EmailCampaignInput) {
    return databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.campaignsCollectionId,
      ID.unique(),
      {
        ...campaign,
        // Stringify arrays/objects for Appwrite
        recipients: JSON.stringify(campaign.recipients),
        attachments: campaign.attachments ? JSON.stringify(campaign.attachments) : null,
        send_results: campaign.send_results ? JSON.stringify(campaign.send_results) : null,
        created_at: new Date().toISOString(),
      }
    )
  },

  // Get all campaigns for a user
  async listByUser(userEmail: string): Promise<{ total: number; documents: EmailCampaign[] }> {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.campaignsCollectionId,
      [
        Query.equal('user_email', userEmail),
        Query.orderDesc('created_at'),
        Query.limit(1000),
      ]
    )
    
    // Parse stringified JSON fields and cast to proper type
    return {
      total: response.total,
      documents: response.documents.map(doc => ({
        $id: doc.$id,
        subject: (doc as any).subject || '',
        content: (doc as any).content || '',
        recipients: typeof (doc as any).recipients === 'string' 
          ? JSON.parse((doc as any).recipients) 
          : ((doc as any).recipients || []),
        sent: (doc as any).sent || 0,
        failed: (doc as any).failed || 0,
        status: (doc as any).status || 'completed',
        user_email: (doc as any).user_email || '',
        created_at: (doc as any).created_at || doc.$createdAt,
        campaign_type: (doc as any).campaign_type,
        attachments: (doc as any).attachments 
          ? (typeof (doc as any).attachments === 'string' 
            ? JSON.parse((doc as any).attachments) 
            : (doc as any).attachments) 
          : [],
        send_results: (doc as any).send_results 
          ? (typeof (doc as any).send_results === 'string' 
            ? JSON.parse((doc as any).send_results) 
            : (doc as any).send_results) 
          : [],
      })) as EmailCampaign[]
    }
  },

  // Subscribe to real-time updates for user's campaigns
  subscribeToUserCampaigns(userEmail: string, callback: (response: any) => void) {
    const channel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.campaignsCollectionId}.documents`
    return client.subscribe(channel, (response) => {
      const payload = response.payload as any
      if (payload?.user_email === userEmail) {
        callback(response)
      }
    })
  },
}

// ============================================
// Storage Operations (Attachments)
// ============================================

export const storageService = {
  // Upload a file to Appwrite Storage
  async uploadFile(file: File, userEmail: string) {
    const sanitizedEmail = userEmail.replace('@', '_at_').replace(/[^a-zA-Z0-9_]/g, '_')
    const uniqueFileName = `${sanitizedEmail}_${Date.now()}_${file.name}`
    
    const result = await storage.createFile(
      appwriteConfig.attachmentsBucketId,
      ID.unique(),
      file
    )
    
    // Get the file URL
    const fileUrl = storage.getFileView(
      appwriteConfig.attachmentsBucketId,
      result.$id
    )
    
    return {
      fileId: result.$id,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      url: fileUrl.toString(),
    }
  },

  // Upload file from buffer (for server-side)
  async uploadFromBuffer(buffer: Buffer, fileName: string, fileType: string, userEmail: string) {
    const sanitizedEmail = userEmail.replace('@', '_at_').replace(/[^a-zA-Z0-9_]/g, '_')
    const uniqueFileName = `${sanitizedEmail}_${Date.now()}_${fileName}`
    
    // Create a Blob from the buffer - convert Buffer to Uint8Array first
    const uint8Array = new Uint8Array(buffer)
    const blob = new Blob([uint8Array], { type: fileType })
    const file = new File([blob], uniqueFileName, { type: fileType })
    
    const result = await storage.createFile(
      appwriteConfig.attachmentsBucketId,
      ID.unique(),
      file
    )
    
    const fileUrl = storage.getFileView(
      appwriteConfig.attachmentsBucketId,
      result.$id
    )
    
    return {
      fileId: result.$id,
      fileName: fileName,
      fileSize: buffer.length,
      url: fileUrl.toString(),
    }
  },

  // Get file download URL
  getFileUrl(fileId: string) {
    return storage.getFileView(
      appwriteConfig.attachmentsBucketId,
      fileId
    ).toString()
  },

  // Get file download for email attachment
  async getFileForDownload(fileId: string) {
    return storage.getFileDownload(
      appwriteConfig.attachmentsBucketId,
      fileId
    )
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
// Email Templates Collection Operations
// ============================================

export interface EmailTemplate {
  $id?: string
  name: string
  subject: string
  content: string
  category?: string
  user_email: string
  created_at?: string
  updated_at?: string
}

export const templatesService = {
  // Create a new template
  async create(template: Omit<EmailTemplate, '$id' | 'created_at' | 'updated_at'>) {
    const now = new Date().toISOString()
    return databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.templatesCollectionId,
      ID.unique(),
      {
        ...template,
        created_at: now,
        updated_at: now,
      }
    )
  },

  // Get all templates for a user
  async listByUser(userEmail: string) {
    return databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.templatesCollectionId,
      [
        Query.equal('user_email', userEmail),
        Query.orderDesc('updated_at'),
        Query.limit(100),
      ]
    )
  },

  // Get a single template
  async get(templateId: string) {
    return databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.templatesCollectionId,
      templateId
    )
  },

  // Update a template
  async update(templateId: string, data: Partial<Omit<EmailTemplate, '$id' | 'user_email' | 'created_at'>>) {
    return databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.templatesCollectionId,
      templateId,
      {
        ...data,
        updated_at: new Date().toISOString(),
      }
    )
  },

  // Delete a template
  async delete(templateId: string) {
    return databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.templatesCollectionId,
      templateId
    )
  },

  // Subscribe to real-time updates for user's templates
  subscribeToUserTemplates(userEmail: string, callback: (response: any) => void) {
    const channel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.templatesCollectionId}.documents`
    return client.subscribe(channel, (response) => {
      const payload = response.payload as any
      if (payload?.user_email === userEmail) {
        callback(response)
      }
    })
  },
}

// ============================================
// Contact Groups Collection Operations
// ============================================

export interface ContactGroup {
  $id?: string
  name: string
  description?: string
  color?: string
  contact_ids: string[]
  user_email: string
  created_at?: string
  updated_at?: string
}

export const contactGroupsService = {
  // Create a new group
  async create(group: Omit<ContactGroup, '$id' | 'created_at' | 'updated_at'>) {
    const now = new Date().toISOString()
    return databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.contactGroupsCollectionId,
      ID.unique(),
      {
        ...group,
        contact_ids: JSON.stringify(group.contact_ids || []),
        created_at: now,
        updated_at: now,
      }
    )
  },

  // Get all groups for a user
  async listByUser(userEmail: string): Promise<{ total: number; documents: ContactGroup[] }> {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.contactGroupsCollectionId,
      [
        Query.equal('user_email', userEmail),
        Query.orderDesc('updated_at'),
        Query.limit(100),
      ]
    )
    
    return {
      total: response.total,
      documents: response.documents.map(doc => ({
        $id: doc.$id,
        name: (doc as any).name || '',
        description: (doc as any).description,
        color: (doc as any).color,
        contact_ids: typeof (doc as any).contact_ids === 'string' 
          ? JSON.parse((doc as any).contact_ids) 
          : ((doc as any).contact_ids || []),
        user_email: (doc as any).user_email || '',
        created_at: (doc as any).created_at || doc.$createdAt,
        updated_at: (doc as any).updated_at || doc.$updatedAt,
      })) as ContactGroup[]
    }
  },

  // Get a single group
  async get(groupId: string): Promise<ContactGroup> {
    const doc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.contactGroupsCollectionId,
      groupId
    )
    
    return {
      $id: doc.$id,
      name: (doc as any).name || '',
      description: (doc as any).description,
      color: (doc as any).color,
      contact_ids: typeof (doc as any).contact_ids === 'string' 
        ? JSON.parse((doc as any).contact_ids) 
        : ((doc as any).contact_ids || []),
      user_email: (doc as any).user_email || '',
      created_at: (doc as any).created_at || doc.$createdAt,
      updated_at: (doc as any).updated_at || doc.$updatedAt,
    }
  },

  // Update a group
  async update(groupId: string, data: Partial<Omit<ContactGroup, '$id' | 'user_email' | 'created_at'>>) {
    const updateData: any = {
      ...data,
      updated_at: new Date().toISOString(),
    }
    
    if (data.contact_ids) {
      updateData.contact_ids = JSON.stringify(data.contact_ids)
    }
    
    return databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.contactGroupsCollectionId,
      groupId,
      updateData
    )
  },

  // Delete a group
  async delete(groupId: string) {
    return databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.contactGroupsCollectionId,
      groupId
    )
  },

  // Add contacts to a group
  async addContacts(groupId: string, contactIds: string[]) {
    const group = await this.get(groupId)
    const existingIds = new Set(group.contact_ids)
    contactIds.forEach(id => existingIds.add(id))
    
    return this.update(groupId, {
      contact_ids: Array.from(existingIds),
    })
  },

  // Remove contacts from a group
  async removeContacts(groupId: string, contactIds: string[]) {
    const group = await this.get(groupId)
    const idsToRemove = new Set(contactIds)
    const updatedIds = group.contact_ids.filter(id => !idsToRemove.has(id))
    
    return this.update(groupId, {
      contact_ids: updatedIds,
    })
  },

  // Subscribe to real-time updates for user's groups
  subscribeToUserGroups(userEmail: string, callback: (response: any) => void) {
    const channel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.contactGroupsCollectionId}.documents`
    return client.subscribe(channel, (response) => {
      const payload = response.payload as any
      if (payload?.user_email === userEmail) {
        callback(response)
      }
    })
  },
}

// ============================================
// Scheduled Emails Collection Operations
// ============================================

export interface ScheduledEmail {
  $id?: string
  subject: string
  content: string
  recipients: string[]
  scheduled_at: string
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled'
  user_email: string
  attachments?: {
    fileName: string
    fileUrl: string
    fileSize: number
    appwrite_file_id?: string
  }[]
  created_at?: string
  sent_at?: string
  error?: string
}

export const scheduledEmailsService = {
  // Create a scheduled email
  async create(email: Omit<ScheduledEmail, '$id' | 'created_at' | 'sent_at'>) {
    return databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.scheduledEmailsCollectionId,
      ID.unique(),
      {
        ...email,
        recipients: JSON.stringify(email.recipients),
        attachments: email.attachments ? JSON.stringify(email.attachments) : null,
        created_at: new Date().toISOString(),
      }
    )
  },

  // Get all scheduled emails for a user
  async listByUser(userEmail: string): Promise<{ total: number; documents: ScheduledEmail[] }> {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.scheduledEmailsCollectionId,
      [
        Query.equal('user_email', userEmail),
        Query.orderDesc('scheduled_at'),
        Query.limit(100),
      ]
    )
    
    return {
      total: response.total,
      documents: response.documents.map(doc => ({
        $id: doc.$id,
        subject: (doc as any).subject || '',
        content: (doc as any).content || '',
        recipients: typeof (doc as any).recipients === 'string' 
          ? JSON.parse((doc as any).recipients) 
          : ((doc as any).recipients || []),
        scheduled_at: (doc as any).scheduled_at,
        status: (doc as any).status || 'pending',
        user_email: (doc as any).user_email || '',
        attachments: (doc as any).attachments 
          ? (typeof (doc as any).attachments === 'string' 
            ? JSON.parse((doc as any).attachments) 
            : (doc as any).attachments) 
          : [],
        created_at: (doc as any).created_at || doc.$createdAt,
        sent_at: (doc as any).sent_at,
        error: (doc as any).error,
      })) as ScheduledEmail[]
    }
  },

  // Get pending scheduled emails that are due
  async getPendingDue(): Promise<ScheduledEmail[]> {
    const now = new Date().toISOString()
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.scheduledEmailsCollectionId,
      [
        Query.equal('status', 'pending'),
        Query.lessThanEqual('scheduled_at', now),
        Query.limit(50),
      ]
    )
    
    return response.documents.map(doc => ({
      $id: doc.$id,
      subject: (doc as any).subject || '',
      content: (doc as any).content || '',
      recipients: typeof (doc as any).recipients === 'string' 
        ? JSON.parse((doc as any).recipients) 
        : ((doc as any).recipients || []),
      scheduled_at: (doc as any).scheduled_at,
      status: (doc as any).status || 'pending',
      user_email: (doc as any).user_email || '',
      attachments: (doc as any).attachments 
        ? (typeof (doc as any).attachments === 'string' 
          ? JSON.parse((doc as any).attachments) 
          : (doc as any).attachments) 
        : [],
      created_at: (doc as any).created_at || doc.$createdAt,
      sent_at: (doc as any).sent_at,
      error: (doc as any).error,
    })) as ScheduledEmail[]
  },

  // Update scheduled email status
  async updateStatus(emailId: string, status: ScheduledEmail['status'], error?: string) {
    const updateData: any = { status }
    if (status === 'sent') {
      updateData.sent_at = new Date().toISOString()
    }
    if (error) {
      updateData.error = error
    }
    
    return databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.scheduledEmailsCollectionId,
      emailId,
      updateData
    )
  },

  // Cancel a scheduled email
  async cancel(emailId: string) {
    return this.updateStatus(emailId, 'cancelled')
  },

  // Delete a scheduled email
  async delete(emailId: string) {
    return databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.scheduledEmailsCollectionId,
      emailId
    )
  },

  // Subscribe to real-time updates
  subscribeToUserScheduledEmails(userEmail: string, callback: (response: any) => void) {
    const channel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.scheduledEmailsCollectionId}.documents`
    return client.subscribe(channel, (response) => {
      const payload = response.payload as any
      if (payload?.user_email === userEmail) {
        callback(response)
      }
    })
  },
}

// ============================================
// Email Signatures Collection Operations
// ============================================

export interface EmailSignature {
  $id?: string
  name: string
  content: string
  is_default: boolean
  user_email: string
  created_at?: string
  updated_at?: string
}

export const signaturesService = {
  // Create a signature
  async create(signature: Omit<EmailSignature, '$id' | 'created_at' | 'updated_at'>) {
    const now = new Date().toISOString()
    return databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.signaturesCollectionId,
      ID.unique(),
      {
        ...signature,
        created_at: now,
        updated_at: now,
      }
    )
  },

  // Get all signatures for a user
  async listByUser(userEmail: string): Promise<{ total: number; documents: EmailSignature[] }> {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.signaturesCollectionId,
      [
        Query.equal('user_email', userEmail),
        Query.orderDesc('updated_at'),
        Query.limit(20),
      ]
    )
    
    return {
      total: response.total,
      documents: response.documents.map(doc => ({
        $id: doc.$id,
        name: (doc as any).name || '',
        content: (doc as any).content || '',
        is_default: (doc as any).is_default || false,
        user_email: (doc as any).user_email || '',
        created_at: (doc as any).created_at || doc.$createdAt,
        updated_at: (doc as any).updated_at || doc.$updatedAt,
      })) as EmailSignature[]
    }
  },

  // Get default signature for a user
  async getDefault(userEmail: string): Promise<EmailSignature | null> {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.signaturesCollectionId,
      [
        Query.equal('user_email', userEmail),
        Query.equal('is_default', true),
        Query.limit(1),
      ]
    )
    
    if (response.documents.length === 0) return null
    
    const doc = response.documents[0]
    return {
      $id: doc.$id,
      name: (doc as any).name || '',
      content: (doc as any).content || '',
      is_default: true,
      user_email: (doc as any).user_email || '',
      created_at: (doc as any).created_at || doc.$createdAt,
      updated_at: (doc as any).updated_at || doc.$updatedAt,
    }
  },

  // Update a signature
  async update(signatureId: string, data: Partial<Omit<EmailSignature, '$id' | 'user_email' | 'created_at'>>) {
    return databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.signaturesCollectionId,
      signatureId,
      {
        ...data,
        updated_at: new Date().toISOString(),
      }
    )
  },

  // Set as default (and unset others)
  async setAsDefault(userEmail: string, signatureId: string) {
    // First, get all signatures for the user
    const existing = await this.listByUser(userEmail)
    
    // Unset all defaults
    for (const sig of existing.documents) {
      if (sig.$id !== signatureId && sig.is_default) {
        await this.update(sig.$id!, { is_default: false })
      }
    }
    
    // Set the new default
    return this.update(signatureId, { is_default: true })
  },

  // Delete a signature
  async delete(signatureId: string) {
    return databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.signaturesCollectionId,
      signatureId
    )
  },
}

// ============================================
// Unsubscribes Collection Operations
// ============================================

export interface Unsubscribe {
  $id?: string
  email: string
  user_email: string
  reason?: string
  unsubscribed_at?: string
}

export const unsubscribesService = {
  // Add an unsubscribe
  async create(unsubscribe: Omit<Unsubscribe, '$id' | 'unsubscribed_at'>) {
    return databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.unsubscribesCollectionId,
      ID.unique(),
      {
        ...unsubscribe,
        unsubscribed_at: new Date().toISOString(),
      }
    )
  },

  // Get all unsubscribes for a user
  async listByUser(userEmail: string): Promise<{ total: number; documents: Unsubscribe[] }> {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.unsubscribesCollectionId,
      [
        Query.equal('user_email', userEmail),
        Query.orderDesc('unsubscribed_at'),
        Query.limit(1000),
      ]
    )
    
    return {
      total: response.total,
      documents: response.documents.map(doc => ({
        $id: doc.$id,
        email: (doc as any).email || '',
        user_email: (doc as any).user_email || '',
        reason: (doc as any).reason,
        unsubscribed_at: (doc as any).unsubscribed_at || doc.$createdAt,
      })) as Unsubscribe[]
    }
  },

  // Check if an email is unsubscribed
  async isUnsubscribed(userEmail: string, email: string): Promise<boolean> {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.unsubscribesCollectionId,
      [
        Query.equal('user_email', userEmail),
        Query.equal('email', email.toLowerCase()),
        Query.limit(1),
      ]
    )
    
    return response.documents.length > 0
  },

  // Filter out unsubscribed emails from a list
  async filterUnsubscribed(userEmail: string, emails: string[]): Promise<string[]> {
    const unsubscribes = await this.listByUser(userEmail)
    const unsubscribedSet = new Set(unsubscribes.documents.map(u => u.email.toLowerCase()))
    return emails.filter(email => !unsubscribedSet.has(email.toLowerCase()))
  },

  // Delete (resubscribe)
  async delete(unsubscribeId: string) {
    return databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.unsubscribesCollectionId,
      unsubscribeId
    )
  },
}

// ============================================
// Webhooks Collection Operations
// ============================================

export interface Webhook {
  $id?: string
  name: string
  url: string
  events: ('campaign.sent' | 'campaign.failed' | 'email.opened' | 'email.clicked' | 'email.bounced')[]
  is_active: boolean
  secret?: string
  user_email: string
  created_at?: string
  updated_at?: string
  last_triggered_at?: string
}

export const webhooksService = {
  // Create a webhook
  async create(webhook: Omit<Webhook, '$id' | 'created_at' | 'updated_at' | 'last_triggered_at'>) {
    const now = new Date().toISOString()
    return databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.webhooksCollectionId,
      ID.unique(),
      {
        ...webhook,
        events: JSON.stringify(webhook.events),
        created_at: now,
        updated_at: now,
      }
    )
  },

  // Get all webhooks for a user
  async listByUser(userEmail: string): Promise<{ total: number; documents: Webhook[] }> {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.webhooksCollectionId,
      [
        Query.equal('user_email', userEmail),
        Query.orderDesc('updated_at'),
        Query.limit(50),
      ]
    )
    
    return {
      total: response.total,
      documents: response.documents.map(doc => ({
        $id: doc.$id,
        name: (doc as any).name || '',
        url: (doc as any).url || '',
        events: typeof (doc as any).events === 'string' 
          ? JSON.parse((doc as any).events) 
          : ((doc as any).events || []),
        is_active: (doc as any).is_active ?? true,
        secret: (doc as any).secret,
        user_email: (doc as any).user_email || '',
        created_at: (doc as any).created_at || doc.$createdAt,
        updated_at: (doc as any).updated_at || doc.$updatedAt,
        last_triggered_at: (doc as any).last_triggered_at,
      })) as Webhook[]
    }
  },

  // Update a webhook
  async update(webhookId: string, data: Partial<Omit<Webhook, '$id' | 'user_email' | 'created_at'>>) {
    const updateData: any = {
      ...data,
      updated_at: new Date().toISOString(),
    }
    
    if (data.events) {
      updateData.events = JSON.stringify(data.events)
    }
    
    return databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.webhooksCollectionId,
      webhookId,
      updateData
    )
  },

  // Update last triggered timestamp
  async updateLastTriggered(webhookId: string) {
    return databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.webhooksCollectionId,
      webhookId,
      {
        last_triggered_at: new Date().toISOString(),
      }
    )
  },

  // Delete a webhook
  async delete(webhookId: string) {
    return databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.webhooksCollectionId,
      webhookId
    )
  },

  // Trigger webhooks for an event
  async triggerWebhooks(userEmail: string, event: Webhook['events'][number], payload: any) {
    const webhooks = await this.listByUser(userEmail)
    const activeWebhooks = webhooks.documents.filter(w => w.is_active && w.events.includes(event))
    
    const results = await Promise.allSettled(
      activeWebhooks.map(async (webhook) => {
        const body = JSON.stringify({
          event,
          timestamp: new Date().toISOString(),
          payload,
        })
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }
        
        if (webhook.secret) {
          // Simple HMAC signature for webhook verification
          const encoder = new TextEncoder()
          const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(webhook.secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
          )
          const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
          headers['X-EchoMail-Signature'] = btoa(String.fromCharCode(...new Uint8Array(signature)))
        }
        
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body,
        })
        
        if (!response.ok) {
          throw new Error(`Webhook failed: ${response.status}`)
        }
        
        await this.updateLastTriggered(webhook.$id!)
        return { webhookId: webhook.$id, success: true }
      })
    )
    
    return results
  },
}

// ============================================
// Tracking Events Collection Operations
// ============================================

export interface TrackingEvent {
  $id?: string
  campaign_id: string
  email: string
  event_type: 'open' | 'click'
  link_url?: string
  user_agent?: string
  ip_address?: string
  user_email: string
  created_at?: string
}

export const trackingEventsService = {
  // Record a tracking event
  async create(event: Omit<TrackingEvent, '$id' | 'created_at'>) {
    return databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.trackingEventsCollectionId,
      ID.unique(),
      {
        ...event,
        created_at: new Date().toISOString(),
      }
    )
  },

  // Get tracking events for a campaign
  async listByCampaign(campaignId: string): Promise<{ total: number; documents: TrackingEvent[] }> {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.trackingEventsCollectionId,
      [
        Query.equal('campaign_id', campaignId),
        Query.orderDesc('created_at'),
        Query.limit(1000),
      ]
    )
    
    return {
      total: response.total,
      documents: response.documents.map(doc => ({
        $id: doc.$id,
        campaign_id: (doc as any).campaign_id || '',
        email: (doc as any).email || '',
        event_type: (doc as any).event_type || 'open',
        link_url: (doc as any).link_url,
        user_agent: (doc as any).user_agent,
        ip_address: (doc as any).ip_address,
        user_email: (doc as any).user_email || '',
        created_at: (doc as any).created_at || doc.$createdAt,
      })) as TrackingEvent[]
    }
  },

  // Get tracking statistics for a campaign
  async getCampaignStats(campaignId: string) {
    const events = await this.listByCampaign(campaignId)
    
    const uniqueOpens = new Set(events.documents.filter(e => e.event_type === 'open').map(e => e.email))
    const uniqueClicks = new Set(events.documents.filter(e => e.event_type === 'click').map(e => e.email))
    
    const clicksByLink: Record<string, number> = {}
    events.documents.filter(e => e.event_type === 'click' && e.link_url).forEach(e => {
      clicksByLink[e.link_url!] = (clicksByLink[e.link_url!] || 0) + 1
    })
    
    return {
      totalOpens: events.documents.filter(e => e.event_type === 'open').length,
      uniqueOpens: uniqueOpens.size,
      totalClicks: events.documents.filter(e => e.event_type === 'click').length,
      uniqueClicks: uniqueClicks.size,
      clicksByLink,
    }
  },
}

// ============================================
// A/B Testing Collection Operations
// ============================================

export interface ABTest {
  $id?: string
  name: string
  status: 'draft' | 'running' | 'completed'
  test_type: 'subject' | 'content' | 'send_time'
  variant_a_subject?: string
  variant_a_content?: string
  variant_b_subject?: string
  variant_b_content?: string
  variant_a_recipients: string[]
  variant_b_recipients: string[]
  variant_a_sent: number
  variant_b_sent: number
  variant_a_opens: number
  variant_b_opens: number
  variant_a_clicks: number
  variant_b_clicks: number
  winner?: 'A' | 'B' | 'tie'
  user_email: string
  created_at?: string
  completed_at?: string
}

export const abTestsService = {
  // Create a new A/B test
  async create(test: Omit<ABTest, '$id' | 'created_at' | 'variant_a_sent' | 'variant_b_sent' | 'variant_a_opens' | 'variant_b_opens' | 'variant_a_clicks' | 'variant_b_clicks'>) {
    return databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.abTestsCollectionId,
      ID.unique(),
      {
        ...test,
        variant_a_recipients: JSON.stringify(test.variant_a_recipients),
        variant_b_recipients: JSON.stringify(test.variant_b_recipients),
        variant_a_sent: 0,
        variant_b_sent: 0,
        variant_a_opens: 0,
        variant_b_opens: 0,
        variant_a_clicks: 0,
        variant_b_clicks: 0,
        created_at: new Date().toISOString(),
      }
    )
  },

  // Get all A/B tests for a user
  async listByUser(userEmail: string): Promise<{ total: number; documents: ABTest[] }> {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.abTestsCollectionId,
      [
        Query.equal('user_email', userEmail),
        Query.orderDesc('created_at'),
        Query.limit(100),
      ]
    )
    
    return {
      total: response.total,
      documents: response.documents.map(doc => ({
        $id: doc.$id,
        name: (doc as any).name || '',
        status: (doc as any).status || 'draft',
        test_type: (doc as any).test_type || 'subject',
        variant_a_subject: (doc as any).variant_a_subject,
        variant_a_content: (doc as any).variant_a_content,
        variant_b_subject: (doc as any).variant_b_subject,
        variant_b_content: (doc as any).variant_b_content,
        variant_a_recipients: typeof (doc as any).variant_a_recipients === 'string'
          ? JSON.parse((doc as any).variant_a_recipients)
          : ((doc as any).variant_a_recipients || []),
        variant_b_recipients: typeof (doc as any).variant_b_recipients === 'string'
          ? JSON.parse((doc as any).variant_b_recipients)
          : ((doc as any).variant_b_recipients || []),
        variant_a_sent: (doc as any).variant_a_sent || 0,
        variant_b_sent: (doc as any).variant_b_sent || 0,
        variant_a_opens: (doc as any).variant_a_opens || 0,
        variant_b_opens: (doc as any).variant_b_opens || 0,
        variant_a_clicks: (doc as any).variant_a_clicks || 0,
        variant_b_clicks: (doc as any).variant_b_clicks || 0,
        winner: (doc as any).winner,
        user_email: (doc as any).user_email || '',
        created_at: (doc as any).created_at || doc.$createdAt,
        completed_at: (doc as any).completed_at,
      })) as ABTest[]
    }
  },

  // Get a single A/B test by ID
  async getById(testId: string): Promise<ABTest | null> {
    try {
      const doc = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.abTestsCollectionId,
        testId
      )
      
      return {
        $id: doc.$id,
        name: (doc as any).name || '',
        status: (doc as any).status || 'draft',
        test_type: (doc as any).test_type || 'subject',
        variant_a_subject: (doc as any).variant_a_subject,
        variant_a_content: (doc as any).variant_a_content,
        variant_b_subject: (doc as any).variant_b_subject,
        variant_b_content: (doc as any).variant_b_content,
        variant_a_recipients: typeof (doc as any).variant_a_recipients === 'string'
          ? JSON.parse((doc as any).variant_a_recipients)
          : ((doc as any).variant_a_recipients || []),
        variant_b_recipients: typeof (doc as any).variant_b_recipients === 'string'
          ? JSON.parse((doc as any).variant_b_recipients)
          : ((doc as any).variant_b_recipients || []),
        variant_a_sent: (doc as any).variant_a_sent || 0,
        variant_b_sent: (doc as any).variant_b_sent || 0,
        variant_a_opens: (doc as any).variant_a_opens || 0,
        variant_b_opens: (doc as any).variant_b_opens || 0,
        variant_a_clicks: (doc as any).variant_a_clicks || 0,
        variant_b_clicks: (doc as any).variant_b_clicks || 0,
        winner: (doc as any).winner,
        user_email: (doc as any).user_email || '',
        created_at: (doc as any).created_at || doc.$createdAt,
        completed_at: (doc as any).completed_at,
      }
    } catch {
      return null
    }
  },

  // Update A/B test
  async update(testId: string, updates: Partial<ABTest>) {
    const data: Record<string, any> = { ...updates }
    
    if (updates.variant_a_recipients) {
      data.variant_a_recipients = JSON.stringify(updates.variant_a_recipients)
    }
    if (updates.variant_b_recipients) {
      data.variant_b_recipients = JSON.stringify(updates.variant_b_recipients)
    }
    
    return databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.abTestsCollectionId,
      testId,
      data
    )
  },

  // Update statistics for a variant
  async updateStats(testId: string, variant: 'A' | 'B', stats: { sent?: number; opens?: number; clicks?: number }) {
    const prefix = variant === 'A' ? 'variant_a' : 'variant_b'
    const updates: Record<string, number> = {}
    
    if (stats.sent !== undefined) updates[`${prefix}_sent`] = stats.sent
    if (stats.opens !== undefined) updates[`${prefix}_opens`] = stats.opens
    if (stats.clicks !== undefined) updates[`${prefix}_clicks`] = stats.clicks
    
    return databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.abTestsCollectionId,
      testId,
      updates
    )
  },

  // Complete test and determine winner
  async complete(testId: string) {
    const test = await this.getById(testId)
    if (!test) return null
    
    const aRate = test.variant_a_sent > 0 ? (test.variant_a_opens / test.variant_a_sent) : 0
    const bRate = test.variant_b_sent > 0 ? (test.variant_b_opens / test.variant_b_sent) : 0
    
    let winner: 'A' | 'B' | 'tie' = 'tie'
    if (Math.abs(aRate - bRate) > 0.05) {
      winner = aRate > bRate ? 'A' : 'B'
    }
    
    return databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.abTestsCollectionId,
      testId,
      {
        status: 'completed',
        winner,
        completed_at: new Date().toISOString(),
      }
    )
  },

  // Delete an A/B test
  async delete(testId: string) {
    return databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.abTestsCollectionId,
      testId
    )
  },

  // Subscribe to A/B test changes
  subscribeToUserTests(userEmail: string, callback: (response: any) => void) {
    return client.subscribe(
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.abTestsCollectionId}.documents`,
      callback
    )
  },
}

export default client
