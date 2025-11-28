#!/usr/bin/env npx ts-node

/**
 * Migration script to:
 * 1. Download attachments from Cloudinary URLs in firebase-data.json
 * 2. Upload them to Appwrite Storage
 * 3. Create a mapping file for the import process
 */

import { Client, Storage, ID } from 'node-appwrite'
import { InputFile } from 'node-appwrite/file'
import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import * as http from 'http'
import * as dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

// Helper to clean env values (remove spaces around =)
const cleanEnv = (value: string | undefined): string => {
  return value?.trim() || ''
}

// Appwrite configuration
const appwriteConfig = {
  endpoint: cleanEnv(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT),
  projectId: cleanEnv(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID),
  apiKey: cleanEnv(process.env.APPWRITE_API_KEY),
  attachmentsBucketId: cleanEnv(process.env.NEXT_PUBLIC_APPWRITE_ATTACHMENTS_BUCKET_ID),
}

// Directories
const EXPORT_DIR = path.join(process.cwd(), 'firebase-export')
const ATTACHMENTS_DIR = path.join(process.cwd(), 'email_attachments')

// Initialize Appwrite
const client = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setKey(appwriteConfig.apiKey)

const storage = new Storage(client)

interface AttachmentInfo {
  fileName: string
  fileUrl: string
  fileSize: number
  cloudinary_public_id?: string
}

interface Campaign {
  id: string
  subject: string
  attachments?: AttachmentInfo[]
  [key: string]: any
}

interface FirebaseData {
  campaigns: Campaign[]
  contacts: any[]
  templates: any[]
  contactGroups: any[]
}

interface AttachmentMapping {
  originalUrl: string
  cloudinaryPublicId: string
  fileName: string
  localFileName: string | null
  appwriteFileId: string | null
  appwriteUrl: string | null
  campaignId: string
  campaignSubject: string
}

// Download file from URL
async function downloadFile(url: string, destPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(destPath)
    
    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location
        if (redirectUrl) {
          file.close()
          fs.unlinkSync(destPath)
          downloadFile(redirectUrl, destPath).then(resolve)
          return
        }
      }
      
      if (response.statusCode !== 200) {
        console.error(`  ❌ HTTP ${response.statusCode} for ${url}`)
        file.close()
        fs.unlinkSync(destPath)
        resolve(false)
        return
      }
      
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve(true)
      })
    }).on('error', (err) => {
      console.error(`  ❌ Download error: ${err.message}`)
      file.close()
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath)
      resolve(false)
    })
  })
}

// Extract unique attachments from campaigns
function extractUniqueAttachments(campaigns: Campaign[]): AttachmentMapping[] {
  const seen = new Map<string, AttachmentMapping>()
  
  for (const campaign of campaigns) {
    if (!campaign.attachments || !Array.isArray(campaign.attachments)) continue
    
    for (const att of campaign.attachments) {
      const key = att.cloudinary_public_id || att.fileUrl
      if (!key || seen.has(key)) continue
      
      // Extract filename from cloudinary_public_id or URL
      let fileName = att.fileName
      if (!fileName && att.cloudinary_public_id) {
        const parts = att.cloudinary_public_id.split('/')
        fileName = parts[parts.length - 1]
      }
      if (!fileName && att.fileUrl) {
        const urlParts = att.fileUrl.split('/')
        fileName = decodeURIComponent(urlParts[urlParts.length - 1])
      }
      
      // Clean up fileName (remove .pdf.pdf duplicates)
      if (fileName) {
        fileName = fileName.replace(/\.pdf\.pdf$/, '.pdf')
      }
      
      seen.set(key, {
        originalUrl: att.fileUrl,
        cloudinaryPublicId: att.cloudinary_public_id || '',
        fileName: fileName || 'unknown',
        localFileName: null,
        appwriteFileId: null,
        appwriteUrl: null,
        campaignId: campaign.id,
        campaignSubject: campaign.subject || 'Unknown',
      })
    }
  }
  
  return Array.from(seen.values())
}

// Find local file that matches cloudinary public ID
function findLocalFile(mapping: AttachmentMapping, files: string[]): string | null {
  // Try to match by timestamp prefix in cloudinary_public_id
  if (mapping.cloudinaryPublicId) {
    const match = mapping.cloudinaryPublicId.match(/(\d{13})_/)
    if (match) {
      const timestamp = match[1]
      const localFile = files.find(f => f.startsWith(timestamp))
      if (localFile) return localFile
    }
  }
  
  // Try to match by filename (exact match with timestamp prefix)
  const baseName = mapping.fileName
    .replace(/\.pdf\.pdf$/, '.pdf')
    .replace(/\.jpg\.jpg$/, '.jpg')
  
  // First try exact match
  let localFile = files.find(f => f.includes(baseName) || f.endsWith(baseName))
  if (localFile) return localFile
  
  // Try matching by core filename (ignoring timestamp prefixes like 1750840363198_)
  // This handles cases where the filename is "1750840363198_Best of MASCC 2025 - Invitation.pdf"
  // and we have a local file "Best of MASCC 2025 - Invitation.pdf"
  const coreFileName = baseName.replace(/^\d+_/, '') // Remove leading timestamp
  localFile = files.find(f => {
    const localCore = f.replace(/^\d+_/, '').replace(/\.pdf\.pdf$/, '.pdf').replace(/\.jpg\.jpg$/, '.jpg')
    return localCore === coreFileName || localCore.includes(coreFileName) || coreFileName.includes(localCore)
  })
  if (localFile) return localFile
  
  // Try fuzzy match - if the base filename (without extension) is similar
  const baseNameWithoutExt = coreFileName.replace(/\.[^.]+$/, '')
  localFile = files.find(f => {
    const localBase = f.replace(/^\d+_/, '').replace(/\.[^.]+$/, '')
    // Check if core parts match (ignoring underscores vs hyphens, case)
    const normalizedBase = baseNameWithoutExt.toLowerCase().replace(/[-_]/g, ' ')
    const normalizedLocal = localBase.toLowerCase().replace(/[-_]/g, ' ')
    return normalizedBase === normalizedLocal || 
           normalizedLocal.includes(normalizedBase) || 
           normalizedBase.includes(normalizedLocal)
  })
  
  return localFile || null
}

// Upload file to Appwrite
async function uploadToAppwrite(localPath: string, fileName: string): Promise<{ fileId: string; url: string } | null> {
  try {
    const inputFile = InputFile.fromPath(localPath, fileName)
    const result = await storage.createFile(
      appwriteConfig.attachmentsBucketId,
      ID.unique(),
      inputFile
    )
    
    const url = `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.attachmentsBucketId}/files/${result.$id}/view?project=${appwriteConfig.projectId}`
    
    return { fileId: result.$id, url }
  } catch (error: any) {
    console.error(`  ❌ Upload failed: ${error.message}`)
    return null
  }
}

async function main() {
  console.log('\n🔄 Attachment Migration Tool')
  console.log('==============================\n')
  
  // Check config
  if (!appwriteConfig.endpoint || !appwriteConfig.projectId || !appwriteConfig.apiKey) {
    console.error('❌ Missing Appwrite configuration. Check your .env file.')
    process.exit(1)
  }
  
  console.log(`Appwrite Endpoint: ${appwriteConfig.endpoint}`)
  console.log(`Project ID: ${appwriteConfig.projectId}`)
  console.log(`Bucket ID: ${appwriteConfig.attachmentsBucketId}\n`)
  
  // Load firebase data
  const dataPath = path.join(EXPORT_DIR, 'firebase-data.json')
  if (!fs.existsSync(dataPath)) {
    console.error('❌ firebase-data.json not found. Run the export first.')
    process.exit(1)
  }
  
  console.log('📖 Loading firebase-data.json...')
  const firebaseData: FirebaseData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
  console.log(`   Found ${firebaseData.campaigns.length} campaigns\n`)
  
  // Extract unique attachments
  console.log('📎 Extracting unique attachments...')
  const attachments = extractUniqueAttachments(firebaseData.campaigns)
  console.log(`   Found ${attachments.length} unique attachments\n`)
  
  // Get list of local files once
  const localFiles = fs.existsSync(ATTACHMENTS_DIR) ? fs.readdirSync(ATTACHMENTS_DIR) : []
  console.log(`   Found ${localFiles.length} files in email_attachments/\n`)
  
  // Match with local files
  console.log('🔍 Matching with local files in email_attachments/...')
  let matchedCount = 0
  for (const att of attachments) {
    const localFile = findLocalFile(att, localFiles)
    if (localFile) {
      att.localFileName = localFile
      matchedCount++
    }
  }
  console.log(`   Matched ${matchedCount}/${attachments.length} attachments\n`)
  
  // Delete existing files in Appwrite bucket first
  console.log('🗑️  Cleaning up existing files in Appwrite bucket...')
  try {
    let hasMore = true
    let deletedCount = 0
    while (hasMore) {
      const files = await storage.listFiles(appwriteConfig.attachmentsBucketId)
      if (files.files.length === 0) {
        hasMore = false
      } else {
        for (const file of files.files) {
          await storage.deleteFile(appwriteConfig.attachmentsBucketId, file.$id)
          deletedCount++
          process.stdout.write('.')
        }
      }
    }
    console.log(`\n   Deleted ${deletedCount} existing files\n`)
  } catch (error: any) {
    console.log(`   No files to delete or error: ${error.message}\n`)
  }
  
  // Upload matched files to Appwrite
  // Deduplicate by local file - same local file = same Appwrite upload
  console.log('📤 Uploading to Appwrite Storage...')
  let uploadedCount = 0
  const uploadedLocalFiles = new Map<string, { fileId: string; url: string }>()
  
  for (const att of attachments) {
    if (!att.localFileName) {
      console.log(`  ⏭️  Skipping (no local file): ${att.fileName}`)
      continue
    }
    
    const localPath = path.join(ATTACHMENTS_DIR, att.localFileName)
    if (!fs.existsSync(localPath)) {
      console.log(`  ❌ File not found: ${att.localFileName}`)
      continue
    }
    
    // Check if we already uploaded this local file
    if (uploadedLocalFiles.has(att.localFileName)) {
      const existing = uploadedLocalFiles.get(att.localFileName)!
      att.appwriteFileId = existing.fileId
      att.appwriteUrl = existing.url
      console.log(`  ♻️  Reusing: ${att.fileName} -> ${existing.fileId}`)
      continue
    }
    
    console.log(`  📤 Uploading: ${att.fileName}`)
    const result = await uploadToAppwrite(localPath, att.fileName)
    if (result) {
      att.appwriteFileId = result.fileId
      att.appwriteUrl = result.url
      uploadedLocalFiles.set(att.localFileName, result)
      uploadedCount++
      console.log(`     ✅ Uploaded: ${result.fileId}`)
    }
  }
  console.log(`\n   Uploaded ${uploadedCount} unique files to Appwrite`)
  console.log(`   (${uploadedLocalFiles.size} unique, ${attachments.filter(a => a.appwriteFileId).length - uploadedCount} reused)\n`)
  
  // Create URL mapping for import
  const urlMapping: Record<string, { appwriteUrl: string; appwriteFileId: string }> = {}
  for (const att of attachments) {
    if (att.appwriteUrl && att.appwriteFileId) {
      // Map both the original URL and variations
      urlMapping[att.originalUrl] = {
        appwriteUrl: att.appwriteUrl,
        appwriteFileId: att.appwriteFileId,
      }
    }
  }
  
  // Save mapping
  const mappingPath = path.join(EXPORT_DIR, 'attachment-mapping.json')
  fs.writeFileSync(mappingPath, JSON.stringify(attachments, null, 2))
  console.log(`💾 Saved attachment mapping to: ${mappingPath}`)
  
  const urlMappingPath = path.join(EXPORT_DIR, 'url-mapping.json')
  fs.writeFileSync(urlMappingPath, JSON.stringify(urlMapping, null, 2))
  console.log(`💾 Saved URL mapping to: ${urlMappingPath}`)
  
  // Summary
  console.log('\n📊 Summary:')
  console.log(`   Total unique attachments: ${attachments.length}`)
  console.log(`   Matched with local files: ${matchedCount}`)
  console.log(`   Uploaded to Appwrite: ${uploadedCount}`)
  console.log(`   Missing local files: ${attachments.length - matchedCount}`)
  
  // List missing files
  const missing = attachments.filter(a => !a.localFileName)
  if (missing.length > 0) {
    console.log('\n⚠️  Missing local files:')
    for (const att of missing) {
      console.log(`   - ${att.fileName}`)
      console.log(`     URL: ${att.originalUrl}`)
    }
  }
  
  console.log('\n✅ Migration complete!')
}

main().catch(console.error)
