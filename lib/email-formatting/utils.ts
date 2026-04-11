/**
 * Email Formatting Utilities (compat layer)
 *
 * This file remains as a stable import path while the implementation
 * is split into focused modules:
 * - emoji.ts
 * - sanitization.ts
 * - tracking.ts
 */

export { convertEmojisToUnicode, EMOJI_NAME_MAP } from "./emoji";
export { sanitizeHTML, validateEmailContent } from "./sanitization";
export { injectTracking } from "./tracking";
