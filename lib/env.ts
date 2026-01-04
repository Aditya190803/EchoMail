import { z } from "zod";

/**
 * Environment variable schema
 * Validates all required environment variables on startup
 */
const envSchema = z.object({
  // Google Auth
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),

  // NextAuth
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),

  // Appwrite Public
  NEXT_PUBLIC_APPWRITE_ENDPOINT: z
    .string()
    .url("NEXT_PUBLIC_APPWRITE_ENDPOINT must be a valid URL"),
  NEXT_PUBLIC_APPWRITE_PROJECT_ID: z
    .string()
    .min(1, "NEXT_PUBLIC_APPWRITE_PROJECT_ID is required"),
  NEXT_PUBLIC_APPWRITE_DATABASE_ID: z
    .string()
    .min(1, "NEXT_PUBLIC_APPWRITE_DATABASE_ID is required"),

  // Appwrite Private
  APPWRITE_API_KEY: z.string().min(1, "APPWRITE_API_KEY is required"),

  // Cron / Background Tasks
  CRON_SECRET: z.string().optional(),

  // Optional Appwrite Collections (with defaults)
  NEXT_PUBLIC_APPWRITE_CONTACTS_COLLECTION_ID: z.string().default("contacts"),
  NEXT_PUBLIC_APPWRITE_CAMPAIGNS_COLLECTION_ID: z.string().default("campaigns"),
  NEXT_PUBLIC_APPWRITE_TEMPLATES_COLLECTION_ID: z.string().default("templates"),
  NEXT_PUBLIC_APPWRITE_TEMPLATE_VERSIONS_COLLECTION_ID: z
    .string()
    .default("template_versions"),
  NEXT_PUBLIC_APPWRITE_CONTACT_GROUPS_COLLECTION_ID: z
    .string()
    .default("contact_groups"),
  NEXT_PUBLIC_APPWRITE_ATTACHMENTS_BUCKET_ID: z.string().default("attachments"),
  NEXT_PUBLIC_APPWRITE_DRAFT_EMAILS_COLLECTION_ID: z
    .string()
    .default("draft_emails"),
  NEXT_PUBLIC_APPWRITE_SIGNATURES_COLLECTION_ID: z
    .string()
    .default("signatures"),
  NEXT_PUBLIC_APPWRITE_UNSUBSCRIBES_COLLECTION_ID: z
    .string()
    .default("unsubscribes"),
  NEXT_PUBLIC_APPWRITE_WEBHOOKS_COLLECTION_ID: z.string().default("webhooks"),
  NEXT_PUBLIC_APPWRITE_TRACKING_EVENTS_COLLECTION_ID: z
    .string()
    .default("tracking_events"),
  NEXT_PUBLIC_APPWRITE_AB_TESTS_COLLECTION_ID: z.string().default("ab_tests"),
  NEXT_PUBLIC_APPWRITE_AUDIT_LOGS_COLLECTION_ID: z.string().default(""),
  NEXT_PUBLIC_APPWRITE_CONSENTS_COLLECTION_ID: z.string().default(""),
  NEXT_PUBLIC_APPWRITE_TEAMS_COLLECTION_ID: z.string().default(""),
  NEXT_PUBLIC_APPWRITE_TEAM_MEMBERS_COLLECTION_ID: z.string().default(""),

  // Analytics
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .default("https://echomail.adityamer.live"),
});

// Parse and validate environment variables
const _env = envSchema.safeParse({
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APPWRITE_ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
  NEXT_PUBLIC_APPWRITE_PROJECT_ID: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
  NEXT_PUBLIC_APPWRITE_DATABASE_ID:
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
  APPWRITE_API_KEY: process.env.APPWRITE_API_KEY,
  NEXT_PUBLIC_APPWRITE_CONTACTS_COLLECTION_ID:
    process.env.NEXT_PUBLIC_APPWRITE_CONTACTS_COLLECTION_ID,
  NEXT_PUBLIC_APPWRITE_CAMPAIGNS_COLLECTION_ID:
    process.env.NEXT_PUBLIC_APPWRITE_CAMPAIGNS_COLLECTION_ID,
  NEXT_PUBLIC_APPWRITE_TEMPLATES_COLLECTION_ID:
    process.env.NEXT_PUBLIC_APPWRITE_TEMPLATES_COLLECTION_ID,
  NEXT_PUBLIC_APPWRITE_TEMPLATE_VERSIONS_COLLECTION_ID:
    process.env.NEXT_PUBLIC_APPWRITE_TEMPLATE_VERSIONS_COLLECTION_ID,
  NEXT_PUBLIC_APPWRITE_CONTACT_GROUPS_COLLECTION_ID:
    process.env.NEXT_PUBLIC_APPWRITE_CONTACT_GROUPS_COLLECTION_ID,
  NEXT_PUBLIC_APPWRITE_ATTACHMENTS_BUCKET_ID:
    process.env.NEXT_PUBLIC_APPWRITE_ATTACHMENTS_BUCKET_ID,
  NEXT_PUBLIC_APPWRITE_DRAFT_EMAILS_COLLECTION_ID:
    process.env.NEXT_PUBLIC_APPWRITE_DRAFT_EMAILS_COLLECTION_ID,
  NEXT_PUBLIC_APPWRITE_SIGNATURES_COLLECTION_ID:
    process.env.NEXT_PUBLIC_APPWRITE_SIGNATURES_COLLECTION_ID,
  NEXT_PUBLIC_APPWRITE_UNSUBSCRIBES_COLLECTION_ID:
    process.env.NEXT_PUBLIC_APPWRITE_UNSUBSCRIBES_COLLECTION_ID,
  NEXT_PUBLIC_APPWRITE_WEBHOOKS_COLLECTION_ID:
    process.env.NEXT_PUBLIC_APPWRITE_WEBHOOKS_COLLECTION_ID,
  NEXT_PUBLIC_APPWRITE_TRACKING_EVENTS_COLLECTION_ID:
    process.env.NEXT_PUBLIC_APPWRITE_TRACKING_EVENTS_COLLECTION_ID,
  NEXT_PUBLIC_APPWRITE_AB_TESTS_COLLECTION_ID:
    process.env.NEXT_PUBLIC_APPWRITE_AB_TESTS_COLLECTION_ID,
  NEXT_PUBLIC_APPWRITE_AUDIT_LOGS_COLLECTION_ID:
    process.env.NEXT_PUBLIC_APPWRITE_AUDIT_LOGS_COLLECTION_ID,
  NEXT_PUBLIC_APPWRITE_CONSENTS_COLLECTION_ID:
    process.env.NEXT_PUBLIC_APPWRITE_CONSENTS_COLLECTION_ID,
  NEXT_PUBLIC_APPWRITE_TEAMS_COLLECTION_ID:
    process.env.NEXT_PUBLIC_APPWRITE_TEAMS_COLLECTION_ID,
  NEXT_PUBLIC_APPWRITE_TEAM_MEMBERS_COLLECTION_ID:
    process.env.NEXT_PUBLIC_APPWRITE_TEAM_MEMBERS_COLLECTION_ID,
});

if (!_env.success) {
  console.error(
    "❌ Invalid environment variables:",
    JSON.stringify(_env.error.format(), null, 2),
  );

  // In production, we want to fail fast
  if (process.env.NODE_ENV === "production") {
    throw new Error("Invalid environment variables");
  }
}

/**
 * Exported environment variables
 * In test environment, provides mock values if variables are missing
 */
export const env = _env.success
  ? _env.data
  : process.env.NODE_ENV === "test"
    ? (envSchema.parse({
        GOOGLE_CLIENT_ID: "test-id",
        GOOGLE_CLIENT_SECRET: "test-secret",
        NEXTAUTH_URL: "http://localhost:3000",
        NEXTAUTH_SECRET: "test-auth-secret",
        NEXT_PUBLIC_APPWRITE_ENDPOINT: "https://localhost/v1",
        NEXT_PUBLIC_APPWRITE_PROJECT_ID: "test-project",
        NEXT_PUBLIC_APPWRITE_DATABASE_ID: "test-db",
        APPWRITE_API_KEY: "test-api-key",
      }) as z.infer<typeof envSchema>)
    : (envSchema.parse(process.env) as z.infer<typeof envSchema>);
