/**
 * Email Formatting Utilities
 *
 * Shared utility functions for email formatting.
 * Contains emoji conversion, HTML sanitization, and validation.
 */

import { generateLinkId, generateRecipientId } from "../analytics";
import { emailLogger } from "../logger";

import type { EmojiMap, ValidationResult } from "./types";

// ============================================================================
// EMOJI HANDLING
// ============================================================================

/**
 * Common emoji name to Unicode character mapping
 * Used as fallback when parsing emoji images with named sources
 */
export const EMOJI_NAME_MAP: EmojiMap = {
  // Faces
  smile: "😊",
  grin: "😀",
  laugh: "😂",
  joy: "😂",
  wink: "😉",
  blush: "😊",
  heart_eyes: "😍",
  love: "😍",
  cool: "😎",
  sunglasses: "😎",
  thinking: "🤔",
  neutral: "😐",
  expressionless: "😑",
  unamused: "😒",
  sweat: "😅",
  worried: "😟",
  cry: "😢",
  sob: "😭",
  angry: "😠",
  rage: "😡",
  scream: "😱",
  flushed: "😳",
  dizzy: "😵",
  mask: "😷",
  clown: "🤡",
  poop: "💩",
  ghost: "👻",
  skull: "💀",
  alien: "👽",
  robot: "🤖",
  cat: "🐱",
  dog: "🐶",
  monkey: "🐵",

  // Gestures
  "thumbs-up": "👍",
  thumbsup: "👍",
  "+1": "👍",
  "thumbs-down": "👎",
  thumbsdown: "👎",
  "-1": "👎",
  clap: "👏",
  wave: "👋",
  ok: "👌",
  ok_hand: "👌",
  point_up: "☝️",
  point_down: "👇",
  point_left: "👈",
  point_right: "👉",
  raised_hands: "🙌",
  pray: "🙏",
  handshake: "🤝",
  muscle: "💪",
  fist: "✊",

  // Hearts & Symbols
  heart: "❤️",
  red_heart: "❤️",
  orange_heart: "🧡",
  yellow_heart: "💛",
  green_heart: "💚",
  blue_heart: "💙",
  purple_heart: "💜",
  black_heart: "🖤",
  white_heart: "🤍",
  broken_heart: "💔",
  sparkling_heart: "💖",
  heartbeat: "💓",
  heartpulse: "💗",
  two_hearts: "💕",
  star: "⭐",
  stars: "🌟",
  sparkles: "✨",

  // Objects
  fire: "🔥",
  flame: "🔥",
  check: "✅",
  checkmark: "✅",
  white_check_mark: "✅",
  cross: "❌",
  x: "❌",
  warning: "⚠️",
  info: "ℹ️",
  question: "❓",
  exclamation: "❗",
  rocket: "🚀",
  email: "📧",
  mail: "📧",
  envelope: "✉️",
  party: "🎉",
  tada: "🎉",
  confetti: "🎊",
  balloon: "🎈",
  gift: "🎁",
  trophy: "🏆",
  medal: "🏅",
  crown: "👑",
  gem: "💎",
  money: "💰",
  moneybag: "💰",
  dollar: "💵",
  bulb: "💡",
  idea: "💡",
  book: "📖",
  books: "📚",
  pencil: "✏️",
  memo: "📝",
  calendar: "📅",
  clock: "🕐",
  hourglass: "⏳",
  phone: "📱",
  computer: "💻",
  keyboard: "⌨️",

  // Nature
  sun: "☀️",
  sunny: "☀️",
  moon: "🌙",
  cloud: "☁️",
  rain: "🌧️",
  rainbow: "🌈",
  snowflake: "❄️",
  zap: "⚡",
  lightning: "⚡",
  earth: "🌍",
  globe: "🌎",
  tree: "🌳",
  flower: "🌸",
  rose: "🌹",

  // Food
  coffee: "☕",
  tea: "🍵",
  beer: "🍺",
  wine: "🍷",
  pizza: "🍕",
  burger: "🍔",
  fries: "🍟",
  cake: "🎂",
  cookie: "🍪",
  apple: "🍎",
  banana: "🍌",
};

/**
 * Pre-compiled regex patterns for emoji conversion
 * Compiled once at module load for performance
 */
const EMOJI_PATTERNS = {
  // Emoji images with alt text and emoji class
  altWithClass: /<img[^>]*alt="([^"]*)"[^>]*class="[^"]*emoji[^"]*"[^>]*>/gi,
  classWithAlt: /<img[^>]*class="[^"]*emoji[^"]*"[^>]*alt="([^"]*)"[^>]*>/gi,

  // Emoji images with data-emoji attribute
  dataEmoji: /<img[^>]*data-emoji="([^"]*)"[^>]*>/gi,
  dataEmojiWithAlt: /<img[^>]*data-emoji="[^"]*"[^>]*alt="([^"]*)"[^>]*>/gi,
  altWithDataEmoji: /<img[^>]*alt="([^"]*)"[^>]*data-emoji="[^"]*"[^>]*>/gi,

  // TipTap editor emoji images (emoji in src path)
  srcEmojiWithAlt: /<img[^>]*src="[^"]*emoji[^"]*"[^>]*alt="([^"]*)"[^>]*>/gi,
  altWithSrcEmoji: /<img[^>]*alt="([^"]*)"[^>]*src="[^"]*emoji[^"]*"[^>]*>/gi,

  // Unicode code point in filename (e.g., /1f600.png)
  unicodeInPath:
    /<img[^>]*src="[^"]*[/\\]([0-9a-f]{4,6})\.(?:png|svg|gif)"[^>]*>/gi,

  // Unicode with 'u' prefix in filename (e.g., /u1f600.png)
  unicodeWithPrefix:
    /<img[^>]*src="[^"]*\/u([0-9a-f]{4,6})\.(?:png|svg|gif)"[^>]*>/gi,

  // Named emoji in path (e.g., /emoji/smile.png)
  namedEmoji:
    /<img[^>]*src="[^"]*emoji[^"]*[/\\]([^"\/\\]+)\.(?:png|svg|gif)"[^>]*>/gi,

  // Fallback: Remove any remaining emoji images
  emojiClassOnly: /<img[^>]*class="[^"]*emoji[^"]*"[^>]*>/gi,
  emojiInTag: /<img[^>]*emoji[^>]*>/gi,
  emojiInSrc: /<img[^>]*src="[^"]*emoji[^"]*"[^>]*>/gi,
} as const;

/**
 * Converts emoji images to Unicode text characters
 *
 * This is the single source of truth for emoji conversion.
 * Handles various emoji image formats from different editors.
 *
 * @param html - HTML string potentially containing emoji images
 * @returns HTML with emoji images converted to Unicode text
 */
export function convertEmojisToUnicode(html: string): string {
  if (!html) {
    return "";
  }

  let result = html;

  // 1. Convert emoji images with alt text (most common case)
  result = result
    .replace(EMOJI_PATTERNS.altWithClass, "$1")
    .replace(EMOJI_PATTERNS.classWithAlt, "$1");

  // 2. Convert images with data-emoji attribute
  result = result
    .replace(EMOJI_PATTERNS.dataEmojiWithAlt, "$1")
    .replace(EMOJI_PATTERNS.altWithDataEmoji, "$1")
    .replace(EMOJI_PATTERNS.dataEmoji, "$1");

  // 3. Convert TipTap editor emoji images
  result = result
    .replace(EMOJI_PATTERNS.srcEmojiWithAlt, "$1")
    .replace(EMOJI_PATTERNS.altWithSrcEmoji, "$1");

  // 4. Convert Unicode code points in filenames
  result = result
    .replace(EMOJI_PATTERNS.unicodeInPath, (_match, unicode) => {
      try {
        return String.fromCodePoint(parseInt(unicode, 16));
      } catch {
        return "";
      }
    })
    .replace(EMOJI_PATTERNS.unicodeWithPrefix, (_match, unicode) => {
      try {
        return String.fromCodePoint(parseInt(unicode, 16));
      } catch {
        return "";
      }
    });

  // 5. Convert named emojis using lookup map
  result = result.replace(
    EMOJI_PATTERNS.namedEmoji,
    (_match, emojiName: string) => {
      const normalizedName = emojiName.toLowerCase().replace(/[-_]/g, "_");
      return (
        EMOJI_NAME_MAP[normalizedName] ||
        EMOJI_NAME_MAP[emojiName.toLowerCase()] ||
        ""
      );
    },
  );

  // 6. Remove any remaining emoji images that couldn't be converted
  result = result
    .replace(EMOJI_PATTERNS.emojiClassOnly, "")
    .replace(EMOJI_PATTERNS.emojiInTag, "")
    .replace(EMOJI_PATTERNS.emojiInSrc, "");

  return result;
}

// ============================================================================
// HTML SANITIZATION
// ============================================================================

/**
 * Pre-compiled regex patterns for HTML sanitization
 */
const SANITIZE_PATTERNS = {
  // Security: Remove dangerous content
  scriptTags: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  eventHandlers: /\s(on\w+)=["'][^"']*["']/gi,
  javascriptUrls:
    /(?:href|src|action|background|content|data|dynsrc|lowsrc)=["']?javascript:[^"\s>]*["']?/gi,
  dataUrls: /\sdata:[^"\s>]*/gi,
  vbscriptUrls: /\svbscript:[^"\s>]*/gi,

  // Additional XSS vectors
  styleExpression: /expression\s*\([^)]*\)/gi,
  styleBehavior: /behavior\s*:[^;}"']*/gi,
  styleBinding: /-moz-binding\s*:[^;}"']*/gi,
  svgOnload: /<svg[^>]*\s+onload\s*=/gi,
  iframeSrcdoc: /srcdoc\s*=\s*["'][^"']*["']/gi,
  objectData: /<object[^>]*data\s*=/gi,
  embedSrc: /<embed[^>]*src\s*=/gi,
  baseHref: /<base[^>]*href\s*=/gi,
  metaRefresh: /<meta[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*/gi,
  linkImport: /<link[^>]*rel\s*=\s*["']?import["']?[^>]*/gi,

  // Editor-specific classes to remove
  editorClasses: /class="editor-[^"]*"/gi,
  proseMirrorClasses: /class="ProseMirror[^"]*"/gi,
  codeBlockClass: /class="code-block"/gi,
  blockquoteClass: /class="blockquote"/gi,
  hrClass: /class="hr"/gi,
  emailTableClass: /class="email-table"/gi,
  selectedCellClass: /class="selectedCell"/gi,
  proseClasses: /class="[^"]*(?:prose|max-w-none)[^"]*"/gi,

  // Gmail-forwarded complex tables
  gmailTableClasses: /class="[^"]*m_[0-9]+[^"]*"/gi,

  // Whitespace cleanup
  multipleSpaces: /[ \t]+/g,
  excessiveNewlines: /\n\s*\n\s*\n+/g,
} as const;

/**
 * Sanitizes HTML content for email safety
 *
 * Removes dangerous content (scripts, event handlers) and
 * editor-specific classes that won't work in email clients.
 * Implements comprehensive XSS prevention.
 *
 * @param html - HTML content to sanitize
 * @returns Sanitized HTML safe for email
 */
export function sanitizeHTML(html: string): string {
  if (!html) {
    return "";
  }

  let result = html;

  // 1. Remove dangerous content (security - XSS prevention)
  result = result
    .replace(SANITIZE_PATTERNS.scriptTags, "")
    .replace(SANITIZE_PATTERNS.eventHandlers, "")
    .replace(SANITIZE_PATTERNS.javascriptUrls, "")
    .replace(SANITIZE_PATTERNS.dataUrls, "")
    .replace(SANITIZE_PATTERNS.vbscriptUrls, "");

  // 2. Remove additional XSS vectors
  result = result
    .replace(SANITIZE_PATTERNS.styleExpression, "")
    .replace(SANITIZE_PATTERNS.styleBehavior, "")
    .replace(SANITIZE_PATTERNS.styleBinding, "")
    .replace(SANITIZE_PATTERNS.svgOnload, "<svg ")
    .replace(SANITIZE_PATTERNS.iframeSrcdoc, "")
    .replace(SANITIZE_PATTERNS.objectData, "<object ")
    .replace(SANITIZE_PATTERNS.embedSrc, "<embed ")
    .replace(SANITIZE_PATTERNS.baseHref, "<!-- base removed -->")
    .replace(SANITIZE_PATTERNS.metaRefresh, "<!-- meta refresh removed -->")
    .replace(SANITIZE_PATTERNS.linkImport, "<!-- link import removed -->");

  // 3. Remove editor-specific classes
  result = result
    .replace(SANITIZE_PATTERNS.editorClasses, "")
    .replace(SANITIZE_PATTERNS.proseMirrorClasses, "")
    .replace(SANITIZE_PATTERNS.codeBlockClass, "")
    .replace(SANITIZE_PATTERNS.blockquoteClass, "")
    .replace(SANITIZE_PATTERNS.hrClass, "")
    .replace(SANITIZE_PATTERNS.emailTableClass, "")
    .replace(SANITIZE_PATTERNS.selectedCellClass, "")
    .replace(SANITIZE_PATTERNS.proseClasses, "");

  // 4. Handle Gmail-forwarded complex tables
  if (result.includes("m_") && result.includes("<table")) {
    result = simplifyComplexTables(result);
  }

  // 5. Clean up whitespace
  result = result
    .replace(SANITIZE_PATTERNS.multipleSpaces, " ")
    .replace(SANITIZE_PATTERNS.excessiveNewlines, "\n\n")
    .trim();

  return result;
}

/**
 * Simplifies complex Gmail-forwarded table structures to divs
 */
function simplifyComplexTables(html: string): string {
  return html
    .replace(/<td[^>]*class="[^"]*m_[0-9]+[^"]*"[^>]*>/gi, "<div>")
    .replace(/<\/td>/gi, "</div>")
    .replace(/<table[^>]*class="[^"]*m_[0-9]+[^"]*"[^>]*>/gi, "<div>")
    .replace(/<\/table>/gi, "</div>")
    .replace(/<tbody[^>]*>/gi, "")
    .replace(/<\/tbody>/gi, "")
    .replace(/<tr[^>]*>/gi, "<div>")
    .replace(/<\/tr>/gi, "</div>")
    .replace(SANITIZE_PATTERNS.gmailTableClasses, "")
    .replace(/<div>\s*<div>/gi, "<div>")
    .replace(/<\/div>\s*<\/div>/gi, "</div>");
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validates email HTML content
 *
 * Checks for security issues, empty content, and other problems
 * that would prevent the email from being sent properly.
 *
 * @param html - HTML content to validate
 * @returns Validation result with errors and warnings
 */
export function validateEmailContent(html: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for empty content
  if (!html || html.trim() === "") {
    errors.push("Email content is empty");
    return { isValid: false, errors, warnings };
  }

  // Check for dangerous content
  if (/<script/i.test(html)) {
    errors.push("Script tags are not allowed in email content");
  }

  if (/javascript:/i.test(html)) {
    errors.push("JavaScript URLs are not allowed in email content");
  }

  if (/\son\w+\s*=/i.test(html)) {
    warnings.push("Event handlers will be removed from email content");
  }

  // Check for potential rendering issues
  if (/<iframe/i.test(html)) {
    warnings.push("Iframes are not supported in most email clients");
  }

  if (/<form/i.test(html)) {
    warnings.push("Forms are not supported in most email clients");
  }

  if (/<video|<audio/i.test(html)) {
    warnings.push(
      "Video and audio elements are not supported in most email clients",
    );
  }

  // Check for excessive size
  if (html.length > 100000) {
    warnings.push(
      "Email content is very large and may be truncated by some email clients",
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// TRACKING INJECTION
// ============================================================================

/**
 * Injects tracking pixel and wraps links for analytics
 *
 * @param html - HTML content to process
 * @param params - Tracking parameters (campaignId, recipientEmail, userEmail, isTransactional)
 * @param baseUrl - Base URL of the application
 * @returns HTML with tracking injected
 */
export function injectTracking(
  html: string,
  params: {
    campaignId: string;
    recipientEmail: string;
    userEmail: string;
    isTransactional?: boolean;
    trackingEnabled?: boolean;
  },
  baseUrl: string,
): string {
  if (!html) {
    return "";
  }

  const {
    campaignId,
    recipientEmail,
    userEmail,
    isTransactional,
    trackingEnabled = true,
  } = params;

  // Note: We still inject tracking for transactional emails for analytics
  // Only the unsubscribe link is skipped for transactional emails

  const encodedRecipient = encodeURIComponent(recipientEmail || "");
  const encodedUser = encodeURIComponent(userEmail || "");
  const recipientId = generateRecipientId(recipientEmail);

  emailLogger.info("Injecting tracking into email", {
    campaignId,
    recipientEmail,
    userEmail,
    trackingEnabled,
    baseUrl,
  });

  let result = html;

  // 1. Inject Open Tracking Pixel (1x1 transparent GIF)
  if (trackingEnabled) {
    const openTrackUrl = `${baseUrl}/api/track/open?c=${campaignId}&e=${encodedRecipient}&u=${encodedUser}&r=${recipientId}`;
    emailLogger.debug("Open tracking URL", { openTrackUrl });
    const pixelTag = `<img src="${openTrackUrl}" width="1" height="1" style="display:none !important; visibility:hidden !important; opacity:0 !important;" alt="" />`;

    // Append before </body> if exists, otherwise at the end
    if (result.includes("</body>")) {
      result = result.replace("</body>", `${pixelTag}</body>`);
    } else {
      result = `${result}${pixelTag}`;
    }
  }

  // 2. Wrap Links for Click Tracking
  // Matches <a ... href="URL" ...> but avoids mailto:, tel:, and anchor links
  if (trackingEnabled) {
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]+)"([^>]*?)>/gi;

    result = result.replace(linkRegex, (match, url, rest) => {
      // Skip non-http links
      if (!url.startsWith("http")) {
        return match;
      }

      // Skip already tracked links or internal tracking links
      if (
        url.includes("/api/track/click") ||
        url.includes("/api/unsubscribe")
      ) {
        return match;
      }

      // Extract linkId from data-link-id attribute if present
      const linkIdMatch = rest.match(/data-link-id="([^"]+)"/);
      const linkId = linkIdMatch ? linkIdMatch[1] : generateLinkId();

      const encodedUrl = encodeURIComponent(url);
      const clickTrackUrl = `${baseUrl}/api/track/click?url=${encodedUrl}&c=${campaignId}&e=${encodedRecipient}&u=${encodedUser}&r=${recipientId}&l=${linkId}`;

      // Remove data-link-id from the final HTML to keep it clean
      const cleanedRest = rest.replace(/data-link-id="[^"]*"/, "");

      return `<a href="${clickTrackUrl}"${cleanedRest}>`;
    });
  }

  // 3. Inject Unsubscribe Link if not present
  // Skip for transactional emails - they should always be delivered
  if (!isTransactional && !result.toLowerCase().includes("unsubscribe")) {
    const unsubscribeUrl = `${baseUrl}/api/unsubscribe?e=${encodedRecipient}&u=${encodedUser}`;
    const unsubscribeTag = `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eeeeee; text-align: center; font-size: 12px; color: #999999;">
        <p>You are receiving this email because you are on our mailing list.</p>
        <p><a href="${unsubscribeUrl}" style="color: #999999; text-decoration: underline;">Unsubscribe</a> from this list.</p>
      </div>
    `;

    if (result.includes("</body>")) {
      result = result.replace("</body>", `${unsubscribeTag}</body>`);
    } else {
      result = `${result}${unsubscribeTag}`;
    }
  }

  return result;
}
