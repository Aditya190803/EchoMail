/**
 * Analytics Utilities
 *
 * Handles unique ID generation for tracking campaigns, recipients, and links.
 */

import { v4 as uuidv4 } from "uuid";

/**
 * Generates a unique campaign ID
 */
export function generateCampaignId(): string {
  return `c-${uuidv4().split("-")[0]}`;
}

/**
 * Generates a unique recipient ID
 * In a real app, this might be a hash of the email or a database ID
 */
export function generateRecipientId(email: string): string {
  // Simple hash-like ID for demonstration, or just use UUID
  return `r-${Buffer.from(email).toString("hex").slice(0, 8)}`;
}

/**
 * Generates a unique link ID
 */
export function generateLinkId(): string {
  return `l-${Math.random().toString(36).substr(2, 5)}`;
}

/**
 * Tracking disclosure text
 */
export const TRACKING_DISCLOSURE =
  "This email includes tracking to help us improve our content.";
