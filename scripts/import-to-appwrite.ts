#!/usr/bin/env npx ts-node

/**
 * Import Firebase data to Appwrite
 * Uses the url-mapping.json created by migrate-attachments.ts
 */

import { Client, Databases, ID, Query } from 'node-appwrite'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

// Helper to clean env values
const cleanEnv = (value: string | undefined): string => value?.trim() || ''

// Appwrite configuration
const appwriteConfig = {
  endpoint: cleanEnv(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT),
  projectId: cleanEnv(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID),
  apiKey: cleanEnv(process.env.APPWRITE_API_KEY),
  databaseId: cleanEnv(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID),
}

// Collection IDs
const collections = {
  contacts: cleanEnv(process.env.NEXT_PUBLIC_APPWRITE_CONTACTS_COLLECTION_ID),
  campaigns: cleanEnv(process.env.NEXT_PUBLIC_APPWRITE_CAMPAIGNS_COLLECTION_ID),
  templates: cleanEnv(process.env.NEXT_PUBLIC_APPWRITE_TEMPLATES_COLLECTION_ID),
  contactGroups: cleanEnv(process.env.NEXT_PUBLIC_APPWRITE_CONTACT_GROUPS_COLLECTION_ID),
}

// Directories
const EXPORT_DIR = path.join(process.cwd(), 'firebase-export')

// Initialize Appwrite
const client = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setKey(appwriteConfig.apiKey)

const databases = new Databases(client)

// Helper to convert Firebase timestamp to ISO string
function toISOString(value: any): string {
  if (!value) return new Date().toISOString()
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString()
  if (typeof value === 'string') {
    const date = new Date(value)
    return !isNaN(date.getTime()) ? date.toISOString() : new Date().toISOString()
  }
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'number') return new Date(value).toISOString()
  if (value && typeof value.seconds === 'number') return new Date(value.seconds * 1000).toISOString()
  return new Date().toISOString()
}

// Delete all documents in a collection
async function wipeCollection(collectionId: string, name: string): Promise<number> {
  process.stdout.write(`  Deleting ${name}...`)
  let deleted = 0
  let hasMore = true
  
  while (hasMore) {
    try {
      const docs = await databases.listDocuments(
        appwriteConfig.databaseId,
        collectionId,
        [Query.limit(100)]
      )
      if (docs.documents.length === 0) {
        hasMore = false
      } else {
        for (const doc of docs.documents) {
          await databases.deleteDocument(appwriteConfig.databaseId, collectionId, doc.$id)
          deleted++
          process.stdout.write('.')
        }
      }
    } catch (e) {
      hasMore = false
    }
  }
  console.log(` ✅ ${deleted} deleted`)
  return deleted
}

async function main() {
  console.log('\n📥 Firebase to Appwrite Import Tool')
  console.log('=====================================\n')
  
  // Check config
  if (!appwriteConfig.endpoint || !appwriteConfig.projectId || !appwriteConfig.apiKey) {
    console.error('❌ Missing Appwrite configuration. Check your .env.local file.')
    process.exit(1)
  }
  
  console.log(`Appwrite Endpoint: ${appwriteConfig.endpoint}`)
  console.log(`Project ID: ${appwriteConfig.projectId}`)
  console.log(`Database ID: ${appwriteConfig.databaseId}\n`)
  
  // Load Firebase data
  const dataPath = path.join(EXPORT_DIR, 'firebase-data.json')
  if (!fs.existsSync(dataPath)) {
    console.error('❌ firebase-data.json not found. Run export first.')
    process.exit(1)
  }
  
  console.log('📖 Loading firebase-data.json...')
  const firebaseData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
  
  // Load URL mapping for attachments
  const urlMappingPath = path.join(EXPORT_DIR, 'url-mapping.json')
  let urlMapping: Record<string, { appwriteUrl: string; appwriteFileId: string }> = {}
  if (fs.existsSync(urlMappingPath)) {
    urlMapping = JSON.parse(fs.readFileSync(urlMappingPath, 'utf-8'))
    console.log(`   Loaded ${Object.keys(urlMapping).length} attachment URL mappings`)
  }
  
  console.log(`   Found ${firebaseData.contacts?.length || 0} contacts`)
  console.log(`   Found ${firebaseData.campaigns?.length || 0} campaigns`)
  console.log(`   Found ${firebaseData.templates?.length || 0} templates`)
  console.log(`   Found ${firebaseData.contactGroups?.length || 0} contact groups\n`)
  
  // Wipe existing data
  console.log('🗑️  Wiping existing Appwrite data...')
  await wipeCollection(collections.contacts, 'Contacts')
  await wipeCollection(collections.campaigns, 'Campaigns')
  await wipeCollection(collections.templates, 'Templates')
  await wipeCollection(collections.contactGroups, 'Contact Groups')
  
  // Import Contacts
  console.log('\n📇 Importing contacts...')
  let contactSuccess = 0, contactFailed = 0
  for (const contact of (firebaseData.contacts || [])) {
    try {
      await databases.createDocument(
        appwriteConfig.databaseId,
        collections.contacts,
        ID.unique(),
        {
          email: contact.email || '',
          name: contact.name || '',
          phone: contact.phone || '',
          company: contact.company || '',
          user_email: contact.user_email || '',
          created_at: toISOString(contact.created_at),
        }
      )
      contactSuccess++
      process.stdout.write('.')
    } catch (error: any) {
      contactFailed++
      console.error(`\n  ❌ Contact ${contact.email} failed: ${error.message}`)
    }
  }
  console.log(`\n  ✅ Contacts: ${contactSuccess} success, ${contactFailed} failed`)
  
  // Import Campaigns
  console.log('\n📧 Importing campaigns...')
  let campaignSuccess = 0, campaignFailed = 0
  for (const campaign of (firebaseData.campaigns || [])) {
    try {
      // Map attachments to new Appwrite URLs
      let mappedAttachments: any[] = []
      if (campaign.attachments && Array.isArray(campaign.attachments)) {
        mappedAttachments = campaign.attachments.map((att: any) => {
          const originalUrl = att.fileUrl || att.url || ''
          const mapping = urlMapping[originalUrl]
          
          return {
            fileName: att.fileName || 'unknown',
            fileUrl: mapping?.appwriteUrl || originalUrl,
            fileSize: att.fileSize || 0,
            appwrite_file_id: mapping?.appwriteFileId || null,
          }
        })
      }
      
      await databases.createDocument(
        appwriteConfig.databaseId,
        collections.campaigns,
        ID.unique(),
        {
          subject: campaign.subject || '',
          content: campaign.content || '',
          recipients: JSON.stringify(campaign.recipients || []),
          sent: campaign.sent || 0,
          failed: campaign.failed || 0,
          status: campaign.status || 'completed',
          user_email: campaign.user_email || '',
          campaign_type: campaign.campaign_type || 'bulk',
          attachments: JSON.stringify(mappedAttachments),
          send_results: JSON.stringify(campaign.send_results || []),
          created_at: toISOString(campaign.created_at),
        }
      )
      campaignSuccess++
      process.stdout.write('.')
    } catch (error: any) {
      campaignFailed++
      console.error(`\n  ❌ Campaign "${campaign.subject}" failed: ${error.message}`)
    }
  }
  console.log(`\n  ✅ Campaigns: ${campaignSuccess} success, ${campaignFailed} failed`)
  
  // Import Templates
  console.log('\n📝 Importing templates...')
  let templateSuccess = 0, templateFailed = 0
  for (const template of (firebaseData.templates || [])) {
    try {
      await databases.createDocument(
        appwriteConfig.databaseId,
        collections.templates,
        ID.unique(),
        {
          name: template.name || '',
          subject: template.subject || '',
          content: template.content || '',
          user_email: template.user_email || '',
          created_at: toISOString(template.created_at),
          updated_at: toISOString(template.updated_at),
        }
      )
      templateSuccess++
      process.stdout.write('.')
    } catch (error: any) {
      templateFailed++
      console.error(`\n  ❌ Template "${template.name}" failed: ${error.message}`)
    }
  }
  console.log(`\n  ✅ Templates: ${templateSuccess} success, ${templateFailed} failed`)
  
  // Import Contact Groups
  console.log('\n👥 Importing contact groups...')
  let groupSuccess = 0, groupFailed = 0
  for (const group of (firebaseData.contactGroups || [])) {
    try {
      await databases.createDocument(
        appwriteConfig.databaseId,
        collections.contactGroups,
        ID.unique(),
        {
          name: group.name || '',
          description: group.description || '',
          color: group.color || '',
          contact_ids: JSON.stringify(group.contact_ids || []),
          user_email: group.user_email || '',
          created_at: toISOString(group.created_at),
        }
      )
      groupSuccess++
      process.stdout.write('.')
    } catch (error: any) {
      groupFailed++
      console.error(`\n  ❌ Group "${group.name}" failed: ${error.message}`)
    }
  }
  console.log(`\n  ✅ Contact Groups: ${groupSuccess} success, ${groupFailed} failed`)
  
  // Summary
  console.log('\n📊 Import Summary:')
  console.log(`   Contacts: ${contactSuccess}/${firebaseData.contacts?.length || 0}`)
  console.log(`   Campaigns: ${campaignSuccess}/${firebaseData.campaigns?.length || 0}`)
  console.log(`   Templates: ${templateSuccess}/${firebaseData.templates?.length || 0}`)
  console.log(`   Contact Groups: ${groupSuccess}/${firebaseData.contactGroups?.length || 0}`)
  
  console.log('\n✅ Import complete!')
}

main().catch(console.error)
