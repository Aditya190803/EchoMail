/**
 * Input validation and sanitization utilities
 * Using Zod for schema validation
 */

import { z } from "zod";

// ============================================
// Common Validation Schemas
// ============================================

/**
 * Email address validation
 */
export const emailSchema = z
  .string()
  .email("Invalid email address")
  .min(5, "Email too short")
  .max(254, "Email too long")
  .toLowerCase()
  .trim();

/**
 * Multiple email addresses
 */
export const emailArraySchema = z
  .array(emailSchema)
  .min(1, "At least one email required")
  .max(1000, "Too many recipients (max 1000)");

/**
 * Email subject validation
 */
export const subjectSchema = z
  .string()
  .min(1, "Subject is required")
  .max(998, "Subject too long (max 998 characters)")
  .trim();

/**
 * Email message/content validation
 */
export const messageSchema = z
  .string()
  .min(1, "Message is required")
  .max(1000000, "Message too long"); // ~1MB limit

/**
 * File attachment validation
 */
export const attachmentSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.string().min(1).max(100),
  data: z.string(), // base64 encoded
  appwriteUrl: z.string().url().optional(),
  appwriteFileId: z.string().optional(),
  fileSize: z
    .number()
    .positive()
    .max(25 * 1024 * 1024)
    .optional(), // 25MB max
});

/**
 * Personalized attachment validation
 */
export const personalizedAttachmentSchema = z.object({
  url: z.string().url("Invalid attachment URL"),
  fileName: z.string().max(255).optional(),
});

// ============================================
// API Request Schemas
// ============================================

/**
 * Send single email request
 */
export const sendSingleEmailSchema = z.object({
  to: emailSchema,
  subject: subjectSchema,
  message: messageSchema,
  originalRowData: z.record(z.string(), z.string()).optional(),
  attachments: z.array(attachmentSchema).optional(),
  personalizedAttachment: personalizedAttachmentSchema.optional(),
});

/**
 * Send bulk email request
 */
export const sendBulkEmailSchema = z.object({
  emails: z
    .array(
      z.object({
        to: emailSchema,
        subject: subjectSchema,
        message: messageSchema,
        originalRowData: z.record(z.string(), z.string()).optional(),
        attachments: z.array(attachmentSchema).optional(),
      }),
    )
    .min(1)
    .max(1000),
});

/**
 * Contact creation/update
 */
export const contactSchema = z.object({
  email: emailSchema,
  name: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  customFields: z.record(z.string(), z.string().max(1000)).optional(),
});

/**
 * Template creation/update
 */
export const templateSchema = z.object({
  name: z.string().min(1).max(200),
  subject: subjectSchema,
  content: messageSchema,
  category: z.string().max(100).optional(),
  variables: z.array(z.string().max(50)).optional(),
});

/**
 * Unsubscribe request
 */
export const unsubscribeSchema = z.object({
  email: emailSchema,
  campaignId: z.string().optional(),
  reason: z.string().max(500).optional(),
});

/**
 * Tracking event
 */
export const trackingEventSchema = z.object({
  type: z.enum(["open", "click", "bounce", "complaint"]),
  campaignId: z.string(),
  email: emailSchema.optional(),
  url: z.string().url().optional(),
  timestamp: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ============================================
// Sanitization Helpers
// ============================================

/**
 * Sanitize HTML content to prevent XSS
 * Removes script tags, event handlers, and dangerous attributes
 */
export function sanitizeHTML(html: string): string {
  if (!html) {
    return "";
  }

  return (
    html
      // Remove script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      // Remove event handlers
      .replace(/\s(on\w+)=["'][^"']*["']/gi, "")
      // Remove javascript: URLs
      .replace(/javascript:[^"\s>]*/gi, "")
      // Remove data: URLs in src (potential XSS)
      .replace(/src\s*=\s*["']data:[^"']*["']/gi, "")
      // Remove expression() CSS
      .replace(/expression\s*\([^)]*\)/gi, "")
      // Remove vbscript
      .replace(/vbscript:[^"\s>]*/gi, "")
  );
}

/**
 * Sanitize plain text input
 */
export function sanitizeText(text: string): string {
  if (!text) {
    return "";
  }

  return (
    text
      .trim()
      // Remove null bytes
      .replace(/\0/g, "")
      // Normalize whitespace
      .replace(/\s+/g, " ")
  );
}

/**
 * Validate and parse JSON safely
 */
export function safeJSONParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

// ============================================
// Validation Helpers
// ============================================

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  // Zod v4 uses `issues` on ZodError instead of `errors`.
  errors?: z.ZodIssue[];
  message?: string;
}

/**
 * Validate data against a Zod schema
 */
export function validate<T>(
  schema: z.ZodType<T>,
  data: unknown,
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    // In Zod v4 the error issues are on result.error.issues
    errors: result.error.issues,
    message: result.error.issues.map((e) => e.message).join(", "),
  };
}

/**
 * Create validation error response
 */
export function validationErrorResponse(
  result: ValidationResult<unknown>,
): Response {
  return new Response(
    JSON.stringify({
      error: "Validation Error",
      message: result.message,
      details: result.errors,
    }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    },
  );
}
