/**
 * Client-side Appwrite service that uses API routes
 * This solves the authentication issue since NextAuth doesn't create Appwrite sessions.
 * All database operations go through server-side API routes that use the Appwrite API key.
 */

// ============================================
// Type Definitions
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

export interface EmailSignature {
  $id?: string
  name: string
  content: string
  is_default: boolean
  user_email: string
  created_at?: string
  updated_at?: string
}

export interface Unsubscribe {
  $id?: string
  email: string
  user_email: string
  reason?: string
  unsubscribed_at?: string
}

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

// ============================================
// API Helper
// ============================================

async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `Request failed with status ${response.status}`)
  }

  return response.json()
}

// ============================================
// Contacts Service (via API)
// ============================================

export const contactsService = {
  async create(contact: Omit<Contact, '$id' | 'created_at' | 'user_email'>) {
    return apiRequest<Contact>('/api/appwrite/contacts', {
      method: 'POST',
      body: JSON.stringify(contact),
    })
  },

  async listByUser(_userEmail: string): Promise<{ total: number; documents: Contact[] }> {
    // userEmail is handled server-side via session
    return apiRequest('/api/appwrite/contacts')
  },

  async delete(documentId: string) {
    return apiRequest(`/api/appwrite/contacts?id=${documentId}`, {
      method: 'DELETE',
    })
  },

  // Real-time subscriptions are not available via API routes
  // Components should poll or use a different approach
  subscribeToUserContacts(_userEmail: string, _callback: (response: any) => void) {
    // No-op - real-time not available without Appwrite auth
    return () => {}
  },
}

// ============================================
// Campaigns Service (via API)
// ============================================

export const campaignsService = {
  async create(campaign: Omit<EmailCampaignInput, 'user_email'>) {
    return apiRequest<EmailCampaign>('/api/appwrite/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaign),
    })
  },

  async listByUser(_userEmail: string): Promise<{ total: number; documents: EmailCampaign[] }> {
    return apiRequest('/api/appwrite/campaigns')
  },

  subscribeToUserCampaigns(_userEmail: string, _callback: (response: any) => void) {
    return () => {}
  },
}

// ============================================
// Templates Service (via API)
// ============================================

export const templatesService = {
  async create(template: Omit<EmailTemplate, '$id' | 'created_at' | 'updated_at' | 'user_email'>) {
    return apiRequest<EmailTemplate>('/api/appwrite/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    })
  },

  async listByUser(_userEmail: string): Promise<{ total: number; documents: EmailTemplate[] }> {
    return apiRequest('/api/appwrite/templates')
  },

  async get(templateId: string): Promise<EmailTemplate> {
    const response = await apiRequest<{ total: number; documents: EmailTemplate[] }>('/api/appwrite/templates')
    const template = response.documents.find(t => t.$id === templateId)
    if (!template) throw new Error('Template not found')
    return template
  },

  async update(templateId: string, data: Partial<Omit<EmailTemplate, '$id' | 'user_email' | 'created_at'>>) {
    return apiRequest<EmailTemplate>('/api/appwrite/templates', {
      method: 'PUT',
      body: JSON.stringify({ id: templateId, ...data }),
    })
  },

  async delete(templateId: string) {
    return apiRequest(`/api/appwrite/templates?id=${templateId}`, {
      method: 'DELETE',
    })
  },

  subscribeToUserTemplates(_userEmail: string, _callback: (response: any) => void) {
    return () => {}
  },
}

// ============================================
// Contact Groups Service (via API)
// ============================================

export const contactGroupsService = {
  async create(group: Omit<ContactGroup, '$id' | 'created_at' | 'updated_at' | 'user_email'>) {
    return apiRequest<ContactGroup>('/api/appwrite/contact-groups', {
      method: 'POST',
      body: JSON.stringify(group),
    })
  },

  async listByUser(_userEmail: string): Promise<{ total: number; documents: ContactGroup[] }> {
    return apiRequest('/api/appwrite/contact-groups')
  },

  async get(groupId: string): Promise<ContactGroup> {
    const response = await apiRequest<{ total: number; documents: ContactGroup[] }>('/api/appwrite/contact-groups')
    const group = response.documents.find(g => g.$id === groupId)
    if (!group) throw new Error('Group not found')
    return group
  },

  async update(groupId: string, data: Partial<Omit<ContactGroup, '$id' | 'user_email' | 'created_at'>>) {
    return apiRequest<ContactGroup>('/api/appwrite/contact-groups', {
      method: 'PUT',
      body: JSON.stringify({ id: groupId, ...data }),
    })
  },

  async delete(groupId: string) {
    return apiRequest(`/api/appwrite/contact-groups?id=${groupId}`, {
      method: 'DELETE',
    })
  },

  async addContacts(groupId: string, contactIds: string[]) {
    const group = await this.get(groupId)
    const existingIds = new Set(group.contact_ids)
    contactIds.forEach(id => existingIds.add(id))
    return this.update(groupId, { contact_ids: Array.from(existingIds) })
  },

  async removeContacts(groupId: string, contactIds: string[]) {
    const group = await this.get(groupId)
    const idsToRemove = new Set(contactIds)
    const updatedIds = group.contact_ids.filter(id => !idsToRemove.has(id))
    return this.update(groupId, { contact_ids: updatedIds })
  },

  subscribeToUserGroups(_userEmail: string, _callback: (response: any) => void) {
    return () => {}
  },
}

// ============================================
// Scheduled Emails Service (via API)
// ============================================

export const scheduledEmailsService = {
  async create(email: Omit<ScheduledEmail, '$id' | 'created_at' | 'sent_at' | 'user_email' | 'status'>) {
    return apiRequest<ScheduledEmail>('/api/appwrite/scheduled-emails', {
      method: 'POST',
      body: JSON.stringify(email),
    })
  },

  async listByUser(_userEmail: string): Promise<{ total: number; documents: ScheduledEmail[] }> {
    return apiRequest('/api/appwrite/scheduled-emails')
  },

  async update(emailId: string, data: Partial<Omit<ScheduledEmail, '$id' | 'user_email' | 'created_at' | 'status'>>) {
    return apiRequest<ScheduledEmail>('/api/appwrite/scheduled-emails', {
      method: 'PUT',
      body: JSON.stringify({ id: emailId, ...data }),
    })
  },

  async updateStatus(emailId: string, status: ScheduledEmail['status'], error?: string) {
    return apiRequest<ScheduledEmail>('/api/appwrite/scheduled-emails', {
      method: 'PUT',
      body: JSON.stringify({ id: emailId, status, error }),
    })
  },

  async cancel(emailId: string) {
    return this.updateStatus(emailId, 'cancelled')
  },

  async delete(emailId: string) {
    return apiRequest(`/api/appwrite/scheduled-emails?id=${emailId}`, {
      method: 'DELETE',
    })
  },

  subscribeToUserScheduledEmails(_userEmail: string, _callback: (response: any) => void) {
    return () => {}
  },
}

// ============================================
// Signatures Service (via API)
// ============================================

export const signaturesService = {
  async create(signature: Omit<EmailSignature, '$id' | 'created_at' | 'updated_at' | 'user_email'>) {
    return apiRequest<EmailSignature>('/api/appwrite/signatures', {
      method: 'POST',
      body: JSON.stringify(signature),
    })
  },

  async listByUser(_userEmail: string): Promise<{ total: number; documents: EmailSignature[] }> {
    return apiRequest('/api/appwrite/signatures')
  },

  async getDefault(_userEmail: string): Promise<EmailSignature | null> {
    const response = await apiRequest<{ total: number; documents: EmailSignature[] }>(
      '/api/appwrite/signatures?default=true'
    )
    return response.documents[0] || null
  },

  async update(signatureId: string, data: Partial<Omit<EmailSignature, '$id' | 'user_email' | 'created_at'>>) {
    return apiRequest<EmailSignature>('/api/appwrite/signatures', {
      method: 'PUT',
      body: JSON.stringify({ id: signatureId, ...data }),
    })
  },

  async setAsDefault(_userEmail: string, signatureId: string) {
    return apiRequest<EmailSignature>('/api/appwrite/signatures', {
      method: 'PUT',
      body: JSON.stringify({ id: signatureId, setAsDefault: true }),
    })
  },

  async delete(signatureId: string) {
    return apiRequest(`/api/appwrite/signatures?id=${signatureId}`, {
      method: 'DELETE',
    })
  },
}

// ============================================
// Unsubscribes Service (via API)
// ============================================

export const unsubscribesService = {
  async create(unsubscribe: Omit<Unsubscribe, '$id' | 'unsubscribed_at' | 'user_email'>) {
    return apiRequest<Unsubscribe>('/api/appwrite/unsubscribes', {
      method: 'POST',
      body: JSON.stringify(unsubscribe),
    })
  },

  async listByUser(_userEmail: string): Promise<{ total: number; documents: Unsubscribe[] }> {
    return apiRequest('/api/appwrite/unsubscribes')
  },

  async isUnsubscribed(_userEmail: string, email: string): Promise<boolean> {
    const response = await apiRequest<{ isUnsubscribed: boolean }>(
      `/api/appwrite/unsubscribes?check=${encodeURIComponent(email)}`
    )
    return response.isUnsubscribed
  },

  async filterUnsubscribed(_userEmail: string, emails: string[]): Promise<string[]> {
    const response = await apiRequest<{ emails: string[] }>('/api/appwrite/unsubscribes', {
      method: 'PATCH',
      body: JSON.stringify({ emails }),
    })
    return response.emails
  },

  async delete(unsubscribeId: string) {
    return apiRequest(`/api/appwrite/unsubscribes?id=${unsubscribeId}`, {
      method: 'DELETE',
    })
  },
}

// ============================================
// Webhooks Service (via API)
// ============================================

export const webhooksService = {
  async create(webhook: Omit<Webhook, '$id' | 'created_at' | 'updated_at' | 'last_triggered_at' | 'user_email'>) {
    return apiRequest<Webhook>('/api/appwrite/webhooks', {
      method: 'POST',
      body: JSON.stringify(webhook),
    })
  },

  async listByUser(_userEmail: string): Promise<{ total: number; documents: Webhook[] }> {
    return apiRequest('/api/appwrite/webhooks')
  },

  async update(webhookId: string, data: Partial<Omit<Webhook, '$id' | 'user_email' | 'created_at'>>) {
    return apiRequest<Webhook>('/api/appwrite/webhooks', {
      method: 'PUT',
      body: JSON.stringify({ id: webhookId, ...data }),
    })
  },

  async updateLastTriggered(webhookId: string) {
    return apiRequest<Webhook>('/api/appwrite/webhooks', {
      method: 'PUT',
      body: JSON.stringify({ id: webhookId, updateLastTriggered: true }),
    })
  },

  async delete(webhookId: string) {
    return apiRequest(`/api/appwrite/webhooks?id=${webhookId}`, {
      method: 'DELETE',
    })
  },

  // Trigger webhooks is a server-side operation - not exposed here
  async triggerWebhooks(_userEmail: string, _event: Webhook['events'][number], _payload: any) {
    // This should be done server-side in the send-email API
    console.warn('triggerWebhooks should be called server-side')
    return []
  },
}

// ============================================
// A/B Tests Service (via API)
// ============================================

export const abTestsService = {
  async create(test: Omit<ABTest, '$id' | 'created_at' | 'variant_a_sent' | 'variant_b_sent' | 'variant_a_opens' | 'variant_b_opens' | 'variant_a_clicks' | 'variant_b_clicks' | 'user_email'>) {
    return apiRequest<ABTest>('/api/appwrite/ab-tests', {
      method: 'POST',
      body: JSON.stringify(test),
    })
  },

  async listByUser(_userEmail: string): Promise<{ total: number; documents: ABTest[] }> {
    return apiRequest('/api/appwrite/ab-tests')
  },

  async getById(testId: string): Promise<ABTest | null> {
    try {
      return await apiRequest(`/api/appwrite/ab-tests?id=${testId}`)
    } catch {
      return null
    }
  },

  async update(testId: string, updates: Partial<ABTest>) {
    return apiRequest<ABTest>('/api/appwrite/ab-tests', {
      method: 'PUT',
      body: JSON.stringify({ id: testId, ...updates }),
    })
  },

  async updateStats(testId: string, variant: 'A' | 'B', stats: { sent?: number; opens?: number; clicks?: number }) {
    const updates: Record<string, number> = {}
    const prefix = variant === 'A' ? 'variant_a' : 'variant_b'
    
    if (stats.sent !== undefined) updates[`${prefix}_sent`] = stats.sent
    if (stats.opens !== undefined) updates[`${prefix}_opens`] = stats.opens
    if (stats.clicks !== undefined) updates[`${prefix}_clicks`] = stats.clicks
    
    return this.update(testId, updates as any)
  },

  async complete(testId: string) {
    return apiRequest<ABTest>('/api/appwrite/ab-tests', {
      method: 'PUT',
      body: JSON.stringify({ id: testId, complete: true }),
    })
  },

  async delete(testId: string) {
    return apiRequest(`/api/appwrite/ab-tests?id=${testId}`, {
      method: 'DELETE',
    })
  },

  subscribeToUserTests(_userEmail: string, _callback: (response: any) => void) {
    return () => {}
  },
}

// ============================================
// Legacy exports for compatibility
// ============================================

// Re-export ID for components that use it
export const ID = {
  unique: () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
}

// Test connection function (just returns success since we're using API routes)
export const testAppwriteConnection = async () => {
  return { 
    success: true, 
    message: "Using API routes for Appwrite operations"
  }
}

// Config export for components that need collection IDs (though they shouldn't need them anymore)
export const config = {
  databaseId: 'via-api',
  contactsCollectionId: 'via-api',
  campaignsCollectionId: 'via-api',
  templatesCollectionId: 'via-api',
  contactGroupsCollectionId: 'via-api',
}

export const getCollectionIds = () => config
export const getBucketId = () => 'via-api'

// Databases export for any direct usage (should be avoided)
export const databases = {
  listDocuments: async () => { throw new Error('Use service functions instead of direct database access') },
  createDocument: async () => { throw new Error('Use service functions instead of direct database access') },
  updateDocument: async () => { throw new Error('Use service functions instead of direct database access') },
  deleteDocument: async () => { throw new Error('Use service functions instead of direct database access') },
}

// ============================================
// Storage Service (via API)
// ============================================

export const storageService = {
  // Upload a file using the upload API
  async uploadFile(file: File, _userEmail: string) {
    const formData = new FormData()
    formData.append('files', file)
    
    const response = await fetch('/api/upload-attachment', {
      method: 'POST',
      body: formData,
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }))
      throw new Error(error.error || 'Failed to upload file')
    }
    
    const result = await response.json()
    const upload = result.uploads[0]
    
    if (upload.error) {
      throw new Error(upload.error)
    }
    
    return {
      fileId: upload.appwrite_file_id,
      fileName: upload.fileName,
      fileSize: upload.fileSize,
      fileType: upload.fileType,
      url: upload.url,
    }
  },

  // Get file URL - uses the server endpoint format
  getFileUrl(fileId: string) {
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
    const bucketId = process.env.NEXT_PUBLIC_APPWRITE_ATTACHMENTS_BUCKET_ID
    return `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`
  },

  // Delete is handled server-side, not available from client
  async deleteFile(_fileId: string) {
    console.warn('File deletion should be done server-side')
    return Promise.resolve()
  },
}
