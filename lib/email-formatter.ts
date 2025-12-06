import type { EditorContent } from "@/types/editor";
import { isTipTapDocument } from "@/types/editor";

// MJML types
interface MJMLResult {
  html: string;
  errors: Array<{ message: string; tagName?: string; line?: number }>;
}

type MJML2HTMLFunction = (
  mjml: string,
  options?: Record<string, unknown>,
) => MJMLResult;

// Shared typography defaults so editor, preview, and sent mail match
const BASE_LINE_HEIGHT = 1.5;
const BASE_FONT_FAMILY = "Arial, sans-serif";
const BASE_FONT_SIZE = "14px";

// Safely appends inline styles while preserving any existing style attribute
function applyInlineStyle(attrs: string, style: string): string {
  const trimmed = attrs || "";

  // If there's already a style attribute, append to it
  const styleMatch = trimmed.match(/\sstyle="([^"]*)"/i);
  if (styleMatch) {
    const existing = styleMatch[1].trim();
    const combined = existing
      ? `${existing}${existing.endsWith(";") ? " " : "; "}${style}`
      : style;
    return trimmed.replace(styleMatch[0], ` style="${combined}"`);
  }

  // Otherwise, just add a style attribute
  const needsSpace = trimmed && !/^\s/.test(trimmed) ? " " : "";
  return `${trimmed}${needsSpace}style="${style}"`;
}

// MJML import only on server side
let mjml2html: MJML2HTMLFunction | null = null;
if (typeof window === "undefined") {
  try {
    mjml2html = require("mjml");
  } catch (_error) {
    // Silently handle MJML not being available during build
    mjml2html = null;
  }
}

/**
 * Formats email content to match Gmail's native email format exactly.
 * Gmail sends emails with minimal HTML - just the content wrapped in a simple div.
 * This produces emails indistinguishable from those composed directly in Gmail.
 */
export function formatEmailHTML(htmlContent: string): string {
  try {
    // Convert any emoji images to Unicode text
    const contentWithTextEmojis = convertEmojiImagesToText(htmlContent);

    // Clean up and sanitize the HTML content
    const sanitizedContent = sanitizeEmailHTML(contentWithTextEmojis);

    // Format as Gmail-native HTML with proper inline styles
    return formatAsGmailNative(sanitizedContent);
  } catch (error) {
    console.error("Email formatting failed:", error);
    return formatAsGmailNative(htmlContent);
  }
}

/**
 * Formats HTML to match Gmail's native email format exactly.
 * Converts CSS classes to inline styles for email client compatibility.
 */
function formatAsGmailNative(htmlContent: string): string {
  let processedContent = htmlContent;

  const paragraphStyle = `margin: 0; padding: 0 0 0.5em 0; line-height: ${BASE_LINE_HEIGHT};`;
  const spacerStyle = `margin: 0; padding: 0; line-height: ${BASE_LINE_HEIGHT}; min-height: ${BASE_LINE_HEIGHT}em;`;

  // Convert editor classes and tags to Gmail-compatible inline styles
  processedContent = processedContent
    // Convert <p> tags to Gmail-style divs with proper spacing
    .replace(
      /<p([^>]*)>/gi,
      (_match, attrs) => `<div${applyInlineStyle(attrs, paragraphStyle)}>`,
    )
    .replace(/<\/p>/gi, "</div>")

    // Normalize empty lines so they keep their own vertical space (no margin collapse)
    .replace(
      /<div([^>]*)>\s*(?:<br\s*\/?>(?:\s*&nbsp;)?\s*)*<\/div>/gi,
      (_match, attrs) =>
        `<div${applyInlineStyle(attrs, spacerStyle)}>&nbsp;</div>`,
    )

    // Style headings
    .replace(
      /<h1([^>]*)>/gi,
      '<h1$1 style="font-size: 2em; font-weight: bold; margin: 0.67em 0;">',
    )
    .replace(
      /<h2([^>]*)>/gi,
      '<h2$1 style="font-size: 1.5em; font-weight: bold; margin: 0.75em 0;">',
    )
    .replace(
      /<h3([^>]*)>/gi,
      '<h3$1 style="font-size: 1.17em; font-weight: bold; margin: 0.83em 0;">',
    )
    .replace(
      /<h4([^>]*)>/gi,
      '<h4$1 style="font-size: 1em; font-weight: bold; margin: 1em 0;">',
    )

    // Style blockquotes
    .replace(
      /<blockquote([^>]*)>/gi,
      '<blockquote$1 style="border-left: 3px solid #ccc; margin: 1em 0; padding-left: 1em; color: #666; font-style: italic;">',
    )

    // Style code blocks
    .replace(
      /<pre([^>]*)>/gi,
      '<pre$1 style="background: #f5f5f5; color: #333; font-family: monospace; padding: 12px 16px; border-radius: 8px; overflow-x: auto; margin: 1em 0; white-space: pre-wrap; word-wrap: break-word;">',
    )
    .replace(/<code([^>]*)>/gi, (match, attrs) => {
      // Don't add background if already inside a <pre>
      if (attrs.includes("style=")) return match;
      return `<code${attrs} style="background: #f1f5f9; color: #e11d48; padding: 0.2em 0.4em; border-radius: 0.25em; font-family: monospace; font-size: 0.9em;">`;
    })

    // Style horizontal rules
    .replace(
      /<hr([^>]*)>/gi,
      '<hr$1 style="border: none; border-top: 2px solid #e5e7eb; margin: 1.5em 0;">',
    )

    // Style lists
    .replace(
      /<ul([^>]*)>/gi,
      '<ul$1 style="padding-left: 1.5em; margin: 0.5em 0; list-style-type: disc;">',
    )
    .replace(
      /<ol([^>]*)>/gi,
      '<ol$1 style="padding-left: 1.5em; margin: 0.5em 0; list-style-type: decimal;">',
    )
    .replace(/<li([^>]*)>/gi, '<li$1 style="margin: 0.25em 0;">')

    // Style tables
    .replace(
      /<table([^>]*)>/gi,
      '<table$1 style="border-collapse: collapse; margin: 1em 0; width: 100%;">',
    )
    .replace(
      /<th([^>]*)>/gi,
      '<th$1 style="border: 1px solid #d1d5db; padding: 8px; background: #f3f4f6; font-weight: bold; text-align: left;">',
    )
    .replace(
      /<td([^>]*)>/gi,
      '<td$1 style="border: 1px solid #d1d5db; padding: 8px; vertical-align: top;">',
    )

    // Style links
    .replace(/<a\s+href="([^"]*)"([^>]*)>/gi, (match, href, rest) => {
      if (!rest.includes("style=")) {
        return `<a href="${href}"${rest} style="color: #2563eb; text-decoration: underline;">`;
      }
      return match;
    })

    // Style marks/highlights
    .replace(/<mark([^>]*)>/gi, (match, attrs) => {
      // Extract color from data-color if present
      const colorMatch = attrs.match(/data-color="([^"]*)"/);
      const bgColor = colorMatch ? colorMatch[1] : "#fef08a";
      return `<mark${attrs} style="background-color: ${bgColor}; border-radius: 0.25em; padding: 0.1em 0.2em;">`;
    })

    // Style images
    .replace(/<img([^>]*)>/gi, (match, attrs) => {
      if (!attrs.includes("style=")) {
        return `<img${attrs} style="max-width: 100%; height: auto;">`;
      }
      return match;
    })

    // Clean up extra whitespace
    .replace(/[ \t]+/g, " ")
    .trim();

  // Gmail's native email format - wrapped in dir="ltr" div
  return `<div dir="ltr" style="font-family: ${BASE_FONT_FAMILY}; font-size: ${BASE_FONT_SIZE}; line-height: ${BASE_LINE_HEIGHT}; color: #222222;">${processedContent}</div>`;
}

/**
 * Alternative: Format using MJML for better cross-client compatibility
 * Use this if you need emails to render well in older email clients
 */
export function formatEmailHTMLWithMJML(htmlContent: string): string {
  try {
    // Check if MJML is available (server-side only)
    if (!mjml2html) {
      return formatAsGmailNative(htmlContent);
    }

    // First convert any emoji images to Unicode text
    const contentWithTextEmojis = convertEmojiImagesToText(htmlContent);

    // Basic HTML content cleaning and preparation
    const sanitizedContent = sanitizeEmailHTML(contentWithTextEmojis);

    // Ensure the content is properly wrapped
    const wrappedContent = sanitizedContent.startsWith("<")
      ? sanitizedContent
      : `<p>${sanitizedContent}</p>`;

    // Create MJML template
    const mjmlTemplate = `
      <mjml>
        <mj-head>
          <mj-attributes>
            <mj-all font-family="Arial, sans-serif" font-size="14px" line-height="1.5" />
            <mj-text padding="0" />
            <mj-section padding="0" />
            <mj-column padding="0" />
          </mj-attributes>
        </mj-head>
        <mj-body>
          <mj-section padding="20px">
            <mj-column>
              <mj-text padding="0">
                ${wrappedContent}
              </mj-text>
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>
    `;

    const { html, errors } = mjml2html(mjmlTemplate, {
      validationLevel: "soft",
      minify: false,
    });

    if (errors && errors.length > 0) {
      console.warn("MJML compilation warnings:", errors);
    }

    return html;
  } catch (error) {
    console.error("MJML compilation failed:", error);
    return formatAsGmailNative(htmlContent);
  }
}

/**
 * Fallback HTML formatter - simplified Gmail-like format
 */
function _getFallbackHTML(htmlContent: string): string {
  return formatAsGmailNative(
    sanitizeEmailHTML(convertEmojiImagesToText(htmlContent)),
  );
}

/**
 * Sanitizes HTML content while preserving formatting
 * Keeps the HTML clean and Gmail-compatible
 */
export function sanitizeEmailHTML(htmlContent: string): string {
  if (!htmlContent) return "";

  let sanitized = htmlContent;

  // Remove any complex table structures that aren't Gmail-native
  const hasComplexTables =
    htmlContent.includes("m_") ||
    (htmlContent.includes("<table") && htmlContent.includes('class="'));

  if (hasComplexTables) {
    sanitized = htmlContent
      // Convert Gmail-forwarded table cells to divs
      .replace(/<td[^>]*class="[^"]*m_[0-9]+[^"]*"[^>]*>/gi, "<div>")
      .replace(/<\/td>/gi, "</div>")
      .replace(/<table[^>]*>/gi, "<div>")
      .replace(/<\/table>/gi, "</div>")
      .replace(/<tbody[^>]*>/gi, "")
      .replace(/<\/tbody>/gi, "")
      .replace(/<tr[^>]*>/gi, "<div>")
      .replace(/<\/tr>/gi, "</div>")
      // Remove Gmail-specific classes
      .replace(/class="[^"]*m_[0-9]+[^"]*"/gi, "")
      // Clean up nested divs
      .replace(/<div>\s*<div>/gi, "<div>")
      .replace(/<\/div>\s*<\/div>/gi, "</div>");
  }

  // Always apply these cleanups
  sanitized = sanitized
    // Convert emoji images to text
    .replace(/<img[^>]*data-emoji="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, "$2")
    .replace(/<img[^>]*alt="([^"]*)"[^>]*data-emoji="[^"]*"[^>]*>/gi, "$1")

    // Remove script tags and event handlers (security)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\s(on\w+)=["'][^"']*["']/gi, "")
    .replace(/\sjavascript:[^"\s>]*/gi, "")

    // Remove editor-specific classes that won't work in emails
    .replace(/class="editor-[^"]*"/gi, "")
    .replace(/class="ProseMirror[^"]*"/gi, "")
    .replace(/class="code-block"/gi, "")
    .replace(/class="blockquote"/gi, "")
    .replace(/class="hr"/gi, "")
    .replace(/class="email-table"/gi, "")
    .replace(/class="selectedCell"/gi, "")

    // Keep semantic classes but remove style-only ones
    .replace(/class="[^"]*(?:prose|max-w-none)[^"]*"/gi, "")

    // Preserve color and highlight attributes
    .replace(/data-color="([^"]*)"/gi, 'data-color="$1"')

    // Clean up whitespace
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();

  return sanitized;
}

/**
 * Cleans up emoji image tags by converting them to Unicode text
 */
export function cleanupEmojiImages(html: string): string {
  return convertEmojiImagesToText(html);
}

/**
 * Generates email preview HTML
 */
export function getEmailPreviewHTML(content: string): string {
  const formattedContent = formatEmailHTML(content);

  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #666;">Email Preview</h3>
        <div style="background: white; padding: 20px; border-radius: 4px; border: 1px solid #ddd;">
          ${formattedContent}
        </div>
      </div>
    </div>
  `;
}

/**
 * Formats HTML content for Gmail-specific rendering
 */
export function formatGmailHTML(htmlContent: string): string {
  return formatEmailHTML(htmlContent);
}

/**
 * Converts rich text editor content to email-safe HTML
 * @param editorContent - HTML string or TipTap JSON document
 * @returns Formatted email HTML string
 */
export function convertToEmailHTML(editorContent: EditorContent): string {
  if (typeof editorContent === "string") {
    return formatEmailHTML(editorContent);
  }

  if (isTipTapDocument(editorContent)) {
    const htmlString = JSON.stringify(editorContent);
    return formatEmailHTML(htmlString);
  }

  return "";
}

/**
 * Validates email HTML content
 */
export function validateEmailHTML(htmlContent: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!htmlContent || htmlContent.trim() === "") {
    errors.push("Email content is empty");
  }

  if (htmlContent.includes("<script")) {
    errors.push("Script tags are not allowed in email content");
  }

  if (htmlContent.includes("javascript:")) {
    errors.push("JavaScript URLs are not allowed in email content");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Converts emoji images to Unicode text characters
 */
export function convertEmojiImagesToText(html: string): string {
  if (!html) return "";

  return (
    html
      // Convert emoji images without data-emoji to Unicode text
      .replace(
        /<img[^>]*class="[^"]*emoji[^"]*"[^>]*alt="([^"]*)"[^>]*(?![^>]*data-emoji)[^>]*>/gi,
        "$1",
      )
      // Convert TipTap editor emoji images to Unicode
      .replace(
        /<img[^>]*src="[^"]*emoji[^"]*"[^>]*alt="([^"]*)"[^>]*(?![^>]*data-emoji)[^>]*>/gi,
        "$1",
      )
      .replace(
        /<img[^>]*alt="([^"]*)"[^>]*src="[^"]*emoji[^"]*"[^>]*(?![^>]*data-emoji)[^>]*>/gi,
        "$1",
      )
      // Convert emoji images with Unicode in src path
      .replace(
        /<img[^>]*src="[^"]*[\/\\]([0-9a-f]{4,6})\.(?:png|svg|gif)"[^>]*(?![^>]*data-emoji)[^>]*>/gi,
        (match, unicode) => {
          try {
            return String.fromCodePoint(parseInt(unicode, 16));
          } catch (_e) {
            return "";
          }
        },
      )
      // Remove any remaining emoji images without proper format
      .replace(
        /<img[^>]*class="[^"]*emoji[^"]*"[^>]*(?![^>]*data-emoji)[^>]*>/gi,
        "",
      )
      .replace(/<img[^>]*emoji[^>]*(?![^>]*data-emoji)[^>]*>/gi, "")
      .replace(
        /<img[^>]*src="[^"]*emoji[^"]*"[^>]*(?![^>]*data-emoji)[^>]*>/gi,
        "",
      )
  );
}
