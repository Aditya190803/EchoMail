import { resolve } from "path";

import { config as dotenvConfig } from "dotenv";
import { Client, Databases } from "node-appwrite";

dotenvConfig({ path: resolve(process.cwd(), ".env.local") });

const config = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
  apiKey: process.env.APPWRITE_API_KEY!,
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  collectionId:
    process.env.NEXT_PUBLIC_APPWRITE_DRAFT_EMAILS_COLLECTION_ID ||
    "draft_emails",
};

if (
  !config.endpoint ||
  !config.projectId ||
  !config.apiKey ||
  !config.databaseId
) {
  console.error("Missing Appwrite env vars in .env.local");
  process.exit(1);
}

const databases = new Databases(
  new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey),
);

async function ensureStringAttr(key: string) {
  try {
    await databases.createStringAttribute(
      config.databaseId,
      config.collectionId,
      key,
      10000,
      false,
    );
    console.log(`✅ added "${key}"`);
  } catch (error: any) {
    if (error?.code === 409) {
      console.log(`ℹ️  "${key}" already exists`);
      return;
    }
    throw error;
  }
}

async function main() {
  console.log(`Draft collection: ${config.collectionId}`);
  // Single attribute holds JSON { cc: string[], bcc: string[] }
  // (collection hit attribute limit; cannot add a separate bcc field)
  await ensureStringAttr("cc");
  console.log("Done. Wait a few seconds for attributes to become available.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
