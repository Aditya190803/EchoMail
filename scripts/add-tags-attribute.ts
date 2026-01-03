import { resolve } from "path";

import { config as dotenvConfig } from "dotenv";
import { Client, Databases } from "node-appwrite";

// Load environment variables from .env.local
dotenvConfig({ path: resolve(process.cwd(), ".env.local") });

// Configuration from environment
const config = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
  apiKey: process.env.APPWRITE_API_KEY!,
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
};

// Validate required config
if (
  !config.endpoint ||
  !config.projectId ||
  !config.apiKey ||
  !config.databaseId
) {
  console.error("❌ Missing required environment variables!");
  console.error("Please ensure .env.local contains:");
  console.error("  - NEXT_PUBLIC_APPWRITE_ENDPOINT");
  console.error("  - NEXT_PUBLIC_APPWRITE_PROJECT_ID");
  console.error("  - APPWRITE_API_KEY");
  console.error("  - NEXT_PUBLIC_APPWRITE_DATABASE_ID");
  process.exit(1);
}

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);

const databases = new Databases(client);

async function addTagsAttribute() {
  console.log('🚀 Adding "tags" attribute to contacts collection...');
  console.log(`   Endpoint: ${config.endpoint}`);
  console.log(`   Project: ${config.projectId}`);
  console.log(`   Database: ${config.databaseId}`);
  console.log("");

  try {
    await databases.createStringAttribute(
      config.databaseId,
      "contacts", // Collection ID
      "tags", // Attribute key
      5000, // Max size (for JSON array of tags)
      false, // Required
    );
    console.log('✅ "tags" attribute added successfully!');
    console.log("");
    console.log(
      "⏳ Note: It may take a few seconds for the attribute to become available.",
    );
    console.log("   You can now use tags in your contacts.");
  } catch (error: any) {
    if (error.code === 409) {
      console.log(
        'ℹ️  "tags" attribute already exists in the contacts collection.',
      );
    } else {
      console.error('❌ Failed to add "tags" attribute:', error.message);
      process.exit(1);
    }
  }
}

addTagsAttribute();
