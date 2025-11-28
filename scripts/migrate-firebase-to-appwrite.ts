/**
 * Firebase to Appwrite Migration Script
 * 
 * This script migrates data from Firebase Realtime Database to Appwrite.
 * Run with: bun run scripts/migrate-firebase-to-appwrite.ts
 */

import { initializeApp } from 'firebase/app'
import { getDatabase, ref, get } from 'firebase/database'
import { Client, Databases, ID } from 'node-appwrite'

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Appwrite configuration - NO HARDCODED VALUES
const appwriteConfig = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
  apiKey: process.env.APPWRITE_API_KEY!,
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
}

// Collection IDs from environment
const collections = {
  contacts: process.env.NEXT_PUBLIC_APPWRITE_CONTACTS_COLLECTION_ID!,
  campaigns: process.env.NEXT_PUBLIC_APPWRITE_CAMPAIGNS_COLLECTION_ID!,
  templates: process.env.NEXT_PUBLIC_APPWRITE_TEMPLATES_COLLECTION_ID!,
  contactGroups: process.env.NEXT_PUBLIC_APPWRITE_CONTACT_GROUPS_COLLECTION_ID!,
}

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig)
const firebaseDb = getDatabase(firebaseApp)

// Initialize Appwrite
const appwriteClient = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setKey(appwriteConfig.apiKey)

const databases = new Databases(appwriteClient)

interface MigrationStats {
  contacts: { success: number; failed: number }
  campaigns: { success: number; failed: number }
  templates: { success: number; failed: number }
  contactGroups: { success: number; failed: number }
}

const stats: MigrationStats = {
  contacts: { success: 0, failed: 0 },
  campaigns: { success: 0, failed: 0 },
  templates: { success: 0, failed: 0 },
  contactGroups: { success: 0, failed: 0 },
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function migrateContacts() {
  console.log('\n📇 Migrating contacts...')
  
  try {
    const contactsRef = ref(firebaseDb, 'contacts')
    const snapshot = await get(contactsRef)
    
    if (!snapshot.exists()) {
      console.log('  ℹ️  No contacts found in Firebase')
      return
    }

    const data = snapshot.val()
    
    // Firebase structure: contacts/{userEmail}/{contactId}
    for (const userEmailKey of Object.keys(data)) {
      const userEmail = userEmailKey.replace(/_/g, '.').replace(/,/g, '@')
      const userContacts = data[userEmailKey]
      
      if (typeof userContacts !== 'object') continue
      
      for (const contactId of Object.keys(userContacts)) {
        const contact = userContacts[contactId]
        
        try {
          await databases.createDocument(
            appwriteConfig.databaseId,
            collections.contacts,
            ID.unique(),
            {
              email: contact.email || '',
              name: contact.name || '',
              company: contact.company || '',
              phone: contact.phone || '',
              user_email: userEmail,
              created_at: contact.created_at || new Date().toISOString(),
            }
          )
          stats.contacts.success++
          process.stdout.write('.')
        } catch (error: any) {
          stats.contacts.failed++
          console.error(`\n  ❌ Failed to migrate contact ${contact.email}:`, error.message)
        }
        
        await sleep(100) // Rate limiting
      }
    }
    
    console.log(`\n  ✅ Contacts migrated: ${stats.contacts.success} success, ${stats.contacts.failed} failed`)
  } catch (error) {
    console.error('  ❌ Error reading contacts from Firebase:', error)
  }
}

async function migrateCampaigns() {
  console.log('\n📧 Migrating campaigns...')
  
  try {
    const campaignsRef = ref(firebaseDb, 'campaigns')
    const snapshot = await get(campaignsRef)
    
    if (!snapshot.exists()) {
      console.log('  ℹ️  No campaigns found in Firebase')
      return
    }

    const data = snapshot.val()
    
    // Firebase structure: campaigns/{userEmail}/{campaignId}
    for (const userEmailKey of Object.keys(data)) {
      const userEmail = userEmailKey.replace(/_/g, '.').replace(/,/g, '@')
      const userCampaigns = data[userEmailKey]
      
      if (typeof userCampaigns !== 'object') continue
      
      for (const campaignId of Object.keys(userCampaigns)) {
        const campaign = userCampaigns[campaignId]
        
        try {
          // Handle recipients - could be array or string
          let recipients = campaign.recipients
          if (Array.isArray(recipients)) {
            recipients = JSON.stringify(recipients)
          } else if (typeof recipients !== 'string') {
            recipients = JSON.stringify([])
          }
          
          // Handle attachments
          let attachments = campaign.attachments
          if (Array.isArray(attachments)) {
            attachments = JSON.stringify(attachments)
          } else if (typeof attachments !== 'string') {
            attachments = null
          }
          
          // Handle send_results
          let sendResults = campaign.send_results || campaign.sendResults
          if (Array.isArray(sendResults)) {
            sendResults = JSON.stringify(sendResults)
          } else if (typeof sendResults !== 'string') {
            sendResults = null
          }
          
          await databases.createDocument(
            appwriteConfig.databaseId,
            collections.campaigns,
            ID.unique(),
            {
              subject: campaign.subject || '',
              content: campaign.content || campaign.body || '',
              recipients: recipients,
              sent: campaign.sent || 0,
              failed: campaign.failed || 0,
              status: campaign.status || 'completed',
              user_email: userEmail,
              campaign_type: campaign.campaign_type || campaign.type || 'bulk',
              attachments: attachments,
              send_results: sendResults,
              created_at: campaign.created_at || campaign.timestamp || new Date().toISOString(),
            }
          )
          stats.campaigns.success++
          process.stdout.write('.')
        } catch (error: any) {
          stats.campaigns.failed++
          console.error(`\n  ❌ Failed to migrate campaign "${campaign.subject}":`, error.message)
        }
        
        await sleep(100) // Rate limiting
      }
    }
    
    console.log(`\n  ✅ Campaigns migrated: ${stats.campaigns.success} success, ${stats.campaigns.failed} failed`)
  } catch (error) {
    console.error('  ❌ Error reading campaigns from Firebase:', error)
  }
}

async function migrateTemplates() {
  console.log('\n📝 Migrating templates...')
  
  try {
    const templatesRef = ref(firebaseDb, 'templates')
    const snapshot = await get(templatesRef)
    
    if (!snapshot.exists()) {
      console.log('  ℹ️  No templates found in Firebase')
      return
    }

    const data = snapshot.val()
    
    // Firebase structure: templates/{userEmail}/{templateId}
    for (const userEmailKey of Object.keys(data)) {
      const userEmail = userEmailKey.replace(/_/g, '.').replace(/,/g, '@')
      const userTemplates = data[userEmailKey]
      
      if (typeof userTemplates !== 'object') continue
      
      for (const templateId of Object.keys(userTemplates)) {
        const template = userTemplates[templateId]
        
        try {
          await databases.createDocument(
            appwriteConfig.databaseId,
            collections.templates,
            ID.unique(),
            {
              name: template.name || 'Untitled Template',
              subject: template.subject || '',
              content: template.content || template.body || '',
              user_email: userEmail,
              created_at: template.created_at || new Date().toISOString(),
              updated_at: template.updated_at || new Date().toISOString(),
            }
          )
          stats.templates.success++
          process.stdout.write('.')
        } catch (error: any) {
          stats.templates.failed++
          console.error(`\n  ❌ Failed to migrate template "${template.name}":`, error.message)
        }
        
        await sleep(100) // Rate limiting
      }
    }
    
    console.log(`\n  ✅ Templates migrated: ${stats.templates.success} success, ${stats.templates.failed} failed`)
  } catch (error) {
    console.error('  ❌ Error reading templates from Firebase:', error)
  }
}

async function migrateContactGroups() {
  console.log('\n👥 Migrating contact groups...')
  
  try {
    const groupsRef = ref(firebaseDb, 'contactGroups')
    const snapshot = await get(groupsRef)
    
    if (!snapshot.exists()) {
      console.log('  ℹ️  No contact groups found in Firebase')
      return
    }

    const data = snapshot.val()
    
    // Firebase structure: contactGroups/{userEmail}/{groupId}
    for (const userEmailKey of Object.keys(data)) {
      const userEmail = userEmailKey.replace(/_/g, '.').replace(/,/g, '@')
      const userGroups = data[userEmailKey]
      
      if (typeof userGroups !== 'object') continue
      
      for (const groupId of Object.keys(userGroups)) {
        const group = userGroups[groupId]
        
        try {
          // Handle contact_ids - could be array or string
          let contactIds = group.contact_ids || group.contacts || group.contactIds
          if (Array.isArray(contactIds)) {
            contactIds = JSON.stringify(contactIds)
          } else if (typeof contactIds !== 'string') {
            contactIds = JSON.stringify([])
          }
          
          await databases.createDocument(
            appwriteConfig.databaseId,
            collections.contactGroups,
            ID.unique(),
            {
              name: group.name || 'Untitled Group',
              description: group.description || '',
              color: group.color || '#3b82f6',
              contact_ids: contactIds,
              user_email: userEmail,
              created_at: group.created_at || new Date().toISOString(),
            }
          )
          stats.contactGroups.success++
          process.stdout.write('.')
        } catch (error: any) {
          stats.contactGroups.failed++
          console.error(`\n  ❌ Failed to migrate group "${group.name}":`, error.message)
        }
        
        await sleep(100) // Rate limiting
      }
    }
    
    console.log(`\n  ✅ Contact groups migrated: ${stats.contactGroups.success} success, ${stats.contactGroups.failed} failed`)
  } catch (error) {
    console.error('  ❌ Error reading contact groups from Firebase:', error)
  }
}

async function main() {
  console.log('🔄 Firebase to Appwrite Migration')
  console.log('==================================')
  console.log(`Firebase Project: ${firebaseConfig.projectId}`)
  console.log(`Appwrite Project: ${appwriteConfig.projectId}`)
  console.log(`Appwrite Database: ${appwriteConfig.databaseId}`)

  if (!appwriteConfig.apiKey) {
    console.error('\n❌ APPWRITE_API_KEY is not set')
    process.exit(1)
  }

  if (!firebaseConfig.databaseURL) {
    console.error('\n❌ Firebase configuration is incomplete')
    process.exit(1)
  }

  try {
    // Migrate all data types
    await migrateContacts()
    await migrateCampaigns()
    await migrateTemplates()
    await migrateContactGroups()

    // Print summary
    console.log('\n📊 Migration Summary')
    console.log('====================')
    console.log(`Contacts:       ${stats.contacts.success} success, ${stats.contacts.failed} failed`)
    console.log(`Campaigns:      ${stats.campaigns.success} success, ${stats.campaigns.failed} failed`)
    console.log(`Templates:      ${stats.templates.success} success, ${stats.templates.failed} failed`)
    console.log(`Contact Groups: ${stats.contactGroups.success} success, ${stats.contactGroups.failed} failed`)
    
    const totalSuccess = stats.contacts.success + stats.campaigns.success + stats.templates.success + stats.contactGroups.success
    const totalFailed = stats.contacts.failed + stats.campaigns.failed + stats.templates.failed + stats.contactGroups.failed
    
    console.log(`\nTotal: ${totalSuccess} success, ${totalFailed} failed`)
    
    if (totalFailed > 0) {
      console.log('\n⚠️  Some items failed to migrate. Check the logs above for details.')
    } else {
      console.log('\n✅ Migration complete!')
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
  
  process.exit(0)
}

main()
