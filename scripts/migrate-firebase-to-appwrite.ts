

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, query } from 'firebase/firestore'
import { Client, Databases, Storage, ID } from 'node-appwrite'
import { InputFile } from 'node-appwrite/file'
import * as fs from 'fs'
import * as path from 'path'

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Appwrite configuration
const appwriteConfig = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
  apiKey: process.env.APPWRITE_API_KEY!,
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  attachmentsBucketId: process.env.NEXT_PUBLIC_APPWRITE_ATTACHMENTS_BUCKET_ID!,
}

// Appwrite Collection IDs
const appwriteCollections = {
  contacts: process.env.NEXT_PUBLIC_APPWRITE_CONTACTS_COLLECTION_ID!,
  campaigns: process.env.NEXT_PUBLIC_APPWRITE_CAMPAIGNS_COLLECTION_ID!,
  templates: process.env.NEXT_PUBLIC_APPWRITE_TEMPLATES_COLLECTION_ID!,
  contactGroups: process.env.NEXT_PUBLIC_APPWRITE_CONTACT_GROUPS_COLLECTION_ID!,
}

// Local export directory
const EXPORT_DIR = path.join(process.cwd(), 'firebase-export')
const ATTACHMENTS_DIR = path.join(EXPORT_DIR, 'attachments')

// Ensure directories exist
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true })
}
if (!fs.existsSync(ATTACHMENTS_DIR)) {
  fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true })
}

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig)
const firestore = getFirestore(firebaseApp)

// Initialize Appwrite
const appwriteClient = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setKey(appwriteConfig.apiKey)

const databases = new Databases(appwriteClient)
const storage = new Storage(appwriteClient)

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

interface AttachmentInfo {
  originalUrl: string
  fileName: string
  localFileName: string | null  // Will be set after you add the file
  campaignId: string
  campaignSubject: string
}

interface ExportedData {
  exportedAt: string
  contacts: any[]
  campaigns: any[]
  templates: any[]
  contactGroups: any[]
  attachments: AttachmentInfo[]
}

// ============================================
// STEP 1: Export from Firebase to Local JSON
// ============================================
async function exportFromFirebase(): Promise<void> {
  console.log('\n📤 STEP 1: Exporting from Firebase to local files...\n')
  
  const exportData: ExportedData = {
    exportedAt: new Date().toISOString(),
    contacts: [],
    campaigns: [],
    templates: [],
    contactGroups: [],
    attachments: []
  }

  // Export Contacts
  console.log('  📇 Exporting contacts...')
  const contactsSnapshot = await getDocs(query(collection(firestore, 'contacts')))
  contactsSnapshot.forEach(doc => {
    exportData.contacts.push({ id: doc.id, ...doc.data() })
  })
  console.log(`    ✅ ${exportData.contacts.length} contacts exported`)

  // Export Campaigns (collection is called email_campaigns in Firestore)
  console.log('  📧 Exporting campaigns...')
  const campaignsSnapshot = await getDocs(query(collection(firestore, 'email_campaigns')))
  campaignsSnapshot.forEach(doc => {
    const data = doc.data()
    exportData.campaigns.push({ id: doc.id, ...data })
    
    // Extract attachment info
    if (data.attachments && Array.isArray(data.attachments)) {
      data.attachments.forEach((att: any) => {
        const url = typeof att === 'string' ? att : att.url
        if (url) {
          // Extract filename from URL
          const urlParts = url.split('/')
          const fileName = urlParts[urlParts.length - 1] || 'unknown'
          
          exportData.attachments.push({
            originalUrl: url,
            fileName: decodeURIComponent(fileName),
            localFileName: null, // You'll fill this in after downloading
            campaignId: doc.id,
            campaignSubject: data.subject || 'Unknown Subject'
          })
        }
      })
    }
  })
  console.log(`    ✅ ${exportData.campaigns.length} campaigns exported`)
  console.log(`    📎 ${exportData.attachments.length} attachment references found`)

  // Export Templates
  console.log('  📝 Exporting templates...')
  const templatesSnapshot = await getDocs(query(collection(firestore, 'templates')))
  templatesSnapshot.forEach(doc => {
    exportData.templates.push({ id: doc.id, ...doc.data() })
  })
  console.log(`    ✅ ${exportData.templates.length} templates exported`)

  // Export Contact Groups
  console.log('  👥 Exporting contact groups...')
  const groupsSnapshot = await getDocs(query(collection(firestore, 'contactGroups')))
  groupsSnapshot.forEach(doc => {
    exportData.contactGroups.push({ id: doc.id, ...doc.data() })
  })
  console.log(`    ✅ ${exportData.contactGroups.length} contact groups exported`)

  // Save to JSON file
  const exportPath = path.join(EXPORT_DIR, 'firebase-data.json')
  fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2))
  console.log(`\n  💾 Data saved to: ${exportPath}`)

  // Create a simple attachment mapping file for easy editing
  const attachmentMapPath = path.join(EXPORT_DIR, 'attachment-mapping.json')
  const attachmentMap = exportData.attachments.map((att, index) => ({
    index: index + 1,
    campaignSubject: att.campaignSubject,
    originalFileName: att.fileName,
    originalUrl: att.originalUrl,
    localFileName: null  // <-- PUT YOUR DOWNLOADED FILENAME HERE
  }))
  fs.writeFileSync(attachmentMapPath, JSON.stringify(attachmentMap, null, 2))
  console.log(`  📋 Attachment mapping template saved to: ${attachmentMapPath}`)
  
  console.log(`\n  📁 Put your downloaded files in: ${ATTACHMENTS_DIR}`)
  console.log(`  ✏️  Then edit ${attachmentMapPath} to map localFileName for each attachment`)
  console.log(`\n  ✅ Export complete! Run with --import flag after adding files.`)
}

// ============================================
// STEP 2 & 3: Import to Appwrite with file mapping
// ============================================
async function importToAppwrite(): Promise<void> {
  console.log('\n📥 STEP 2 & 3: Importing to Appwrite...\n')

  // Load exported data
  const dataPath = path.join(EXPORT_DIR, 'firebase-data.json')
  const mappingPath = path.join(EXPORT_DIR, 'attachment-mapping.json')

  if (!fs.existsSync(dataPath)) {
    console.error('❌ Export data not found. Run with --export first.')
    process.exit(1)
  }

  const exportData: ExportedData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
  
  // Load attachment mapping
  let attachmentMapping: any[] = []
  if (fs.existsSync(mappingPath)) {
    attachmentMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'))
  }

  // Create URL to Appwrite file ID mapping
  const urlToAppwriteId = new Map<string, string>()

  // Wipe existing Appwrite data
  console.log('🗑️  Wiping existing Appwrite data...')
  await wipeAppwriteData()

  // Upload attachments first
  console.log('\n📎 Uploading attachments to Appwrite...')
  for (const mapping of attachmentMapping) {
    if (!mapping.localFileName) {
      console.log(`  ⏭️  Skipping: ${mapping.originalFileName} (no local file mapped)`)
      continue
    }

    const localPath = path.join(ATTACHMENTS_DIR, mapping.localFileName)
    if (!fs.existsSync(localPath)) {
      console.log(`  ❌ File not found: ${mapping.localFileName}`)
      continue
    }

    try {
      const inputFile = InputFile.fromPath(localPath, mapping.originalFileName)
      const result = await storage.createFile(
        appwriteConfig.attachmentsBucketId,
        ID.unique(),
        inputFile
      )
      
      const appwriteUrl = `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.attachmentsBucketId}/files/${result.$id}/view?project=${appwriteConfig.projectId}`
      urlToAppwriteId.set(mapping.originalUrl, appwriteUrl)
      console.log(`  ✅ Uploaded: ${mapping.originalFileName} -> ${result.$id}`)
    } catch (error: any) {
      console.error(`  ❌ Failed to upload ${mapping.originalFileName}: ${error.message}`)
    }
  }

  // Import Contacts
  console.log('\n📇 Importing contacts...')
  let contactSuccess = 0, contactFailed = 0
  for (const contact of exportData.contacts) {
    try {
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteCollections.contacts,
        ID.unique(),
        {
          email: contact.email || '',
          name: contact.name || '',
          phone: contact.phone || '',
          company: contact.company || '',
          tags: contact.tags || [],
          notes: contact.notes || '',
          userId: contact.userId || '',
          createdAt: toISOString(contact.createdAt),
          updatedAt: toISOString(contact.updatedAt),
        }
      )
      contactSuccess++
      process.stdout.write('.')
    } catch (error: any) {
      contactFailed++
      console.error(`\n  ❌ Contact failed: ${error.message}`)
    }
  }
  console.log(`\n  ✅ Contacts: ${contactSuccess} success, ${contactFailed} failed`)

  // Import Campaigns with mapped attachments
  console.log('\n📧 Importing campaigns...')
  let campaignSuccess = 0, campaignFailed = 0
  for (const campaign of exportData.campaigns) {
    try {
      // Map old attachment URLs to new Appwrite URLs
      let mappedAttachments: string[] = []
      if (campaign.attachments && Array.isArray(campaign.attachments)) {
        mappedAttachments = campaign.attachments
          .map((att: any) => {
            const url = typeof att === 'string' ? att : att.url
            return urlToAppwriteId.get(url) || url  // Use new URL if mapped, else keep original
          })
          .filter(Boolean)
      }

      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteCollections.campaigns,
        ID.unique(),
        {
          subject: campaign.subject || '',
          body: campaign.body || '',
          recipients: campaign.recipients || [],
          status: campaign.status || 'draft',
          sentAt: campaign.sentAt ? toISOString(campaign.sentAt) : null,
          scheduledAt: campaign.scheduledAt ? toISOString(campaign.scheduledAt) : null,
          userId: campaign.userId || '',
          createdAt: toISOString(campaign.createdAt),
          updatedAt: toISOString(campaign.updatedAt),
          attachments: mappedAttachments,
          totalRecipients: campaign.totalRecipients || campaign.recipients?.length || 0,
          successCount: campaign.successCount || 0,
          failureCount: campaign.failureCount || 0,
          openCount: campaign.openCount || 0,
          clickCount: campaign.clickCount || 0,
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
  for (const template of exportData.templates) {
    try {
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteCollections.templates,
        ID.unique(),
        {
          name: template.name || '',
          subject: template.subject || '',
          body: template.body || '',
          userId: template.userId || '',
          createdAt: toISOString(template.createdAt),
          updatedAt: toISOString(template.updatedAt),
        }
      )
      templateSuccess++
      process.stdout.write('.')
    } catch (error: any) {
      templateFailed++
      console.error(`\n  ❌ Template failed: ${error.message}`)
    }
  }
  console.log(`\n  ✅ Templates: ${templateSuccess} success, ${templateFailed} failed`)

  // Import Contact Groups
  console.log('\n👥 Importing contact groups...')
  let groupSuccess = 0, groupFailed = 0
  for (const group of exportData.contactGroups) {
    try {
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteCollections.contactGroups,
        ID.unique(),
        {
          name: group.name || '',
          description: group.description || '',
          contactIds: group.contactIds || [],
          userId: group.userId || '',
          createdAt: toISOString(group.createdAt),
          updatedAt: toISOString(group.updatedAt),
        }
      )
      groupSuccess++
      process.stdout.write('.')
    } catch (error: any) {
      groupFailed++
      console.error(`\n  ❌ Group failed: ${error.message}`)
    }
  }
  console.log(`\n  ✅ Contact Groups: ${groupSuccess} success, ${groupFailed} failed`)

  console.log('\n✅ Import complete!')
}

async function wipeAppwriteData(): Promise<void> {
  const collections = [
    { name: 'Contacts', id: appwriteCollections.contacts },
    { name: 'Campaigns', id: appwriteCollections.campaigns },
    { name: 'Templates', id: appwriteCollections.templates },
    { name: 'Contact Groups', id: appwriteCollections.contactGroups },
  ]

  for (const col of collections) {
    process.stdout.write(`  Deleting ${col.name}...`)
    let deleted = 0
    let hasMore = true
    while (hasMore) {
      try {
        const docs = await databases.listDocuments(appwriteConfig.databaseId, col.id, [])
        if (docs.documents.length === 0) {
          hasMore = false
        } else {
          for (const doc of docs.documents) {
            await databases.deleteDocument(appwriteConfig.databaseId, col.id, doc.$id)
            deleted++
            process.stdout.write('.')
          }
        }
      } catch (e) {
        hasMore = false
      }
    }
    console.log(` ✅ ${deleted} deleted`)
  }

  // Delete files from attachments bucket
  process.stdout.write('  Deleting attachments...')
  let filesDeleted = 0
  let hasMoreFiles = true
  while (hasMoreFiles) {
    try {
      const files = await storage.listFiles(appwriteConfig.attachmentsBucketId, [])
      if (files.files.length === 0) {
        hasMoreFiles = false
      } else {
        for (const file of files.files) {
          await storage.deleteFile(appwriteConfig.attachmentsBucketId, file.$id)
          filesDeleted++
          process.stdout.write('.')
        }
      }
    } catch (e) {
      hasMoreFiles = false
    }
  }
  console.log(` ✅ ${filesDeleted} deleted`)
}

// Main entry point
async function main() {
  const args = process.argv.slice(2)
  
  console.log('\n🔄 Firebase to Appwrite Migration Tool')
  console.log('======================================')
  console.log(`Export Directory: ${EXPORT_DIR}`)
  console.log(`Attachments Directory: ${ATTACHMENTS_DIR}\n`)

  if (args.includes('--export')) {
    await exportFromFirebase()
  } else if (args.includes('--import')) {
    await importToAppwrite()
  } else {
    console.log('Usage:')
    console.log('  --export    Export Firebase data to local JSON files')
    console.log('  --import    Import local data to Appwrite (after adding attachments)')
    console.log('')
    console.log('Workflow:')
    console.log('  1. Run with --export to get Firebase data')
    console.log('  2. Manually download Cloudinary files to firebase-export/attachments/')
    console.log('  3. Edit firebase-export/attachment-mapping.json to map localFileName')
    console.log('  4. Run with --import to upload everything to Appwrite')
  }

  process.exit(0)
}

main().catch(console.error)
