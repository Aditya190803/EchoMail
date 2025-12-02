/**
 * Client-side email formatting utilities
 * This file can be safely imported on the client side
 */

/**
 * Client-side function to get email preview HTML using the API
 */
export async function getEmailPreviewHTML(content: string): Promise<string> {
  try {
    const response = await fetch("/api/format-email-preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ htmlContent: content }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      return result.formattedHTML;
    } else {
      throw new Error(result.error || "Failed to format email");
    }
  } catch (error) {
    console.error("Failed to format email preview:", error);
    // Return basic HTML as fallback
    return getBasicEmailHTML(content);
  }
}

/**
 * Basic HTML formatter as fallback (client-safe)
 */
export function getBasicEmailHTML(content: string): string {
  // First convert emoji images to text, then sanitize
  const contentWithTextEmojis = convertEmojiImagesToText(content);

  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #666;">Email Preview</h3>
        <div style="background: white; padding: 20px; border-radius: 4px; border: 1px solid #ddd;">
          ${sanitizeBasicHTML(contentWithTextEmojis)}
        </div>
      </div>
    </div>
  `;
}

/**
 * Basic HTML sanitization for client-side use
 */
function sanitizeBasicHTML(htmlContent: string): string {
  if (!htmlContent) return "";

  return htmlContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\s(on\w+|javascript:)[^>]*/gi, "")
    .trim();
}

/**
 * Synchronous function for immediate HTML preview (client-safe)
 */
export function getInstantEmailPreview(content: string): string {
  // Always convert emoji images to text before showing preview
  return getBasicEmailHTML(convertEmojiImagesToText(content));
}

/**
 * Cleans up emoji image tags by converting them to Unicode text (client-safe)
 */
export function cleanupEmojiImages(html: string): string {
  if (!html) return "";

  return (
    html
      // Convert emoji images with alt text to Unicode (most common case)
      .replace(
        /<img[^>]*alt="([^"]*)"[^>]*class="[^"]*emoji[^"]*"[^>]*>/gi,
        "$1",
      )
      .replace(
        /<img[^>]*class="[^"]*emoji[^"]*"[^>]*alt="([^"]*)"[^>]*>/gi,
        "$1",
      )

      // Convert emoji images with data-emoji attribute
      .replace(/<img[^>]*data-emoji="([^"]*)"[^>]*>/gi, "$1")

      // Convert any img with emoji in class and alt text
      .replace(
        /<img[^>]*class="[^"]*emoji[^"]*"[^>]*alt="([^"]*)"[^>]*>/gi,
        "$1",
      )
      .replace(
        /<img[^>]*alt="([^"]*)"[^>]*class="[^"]*emoji[^"]*"[^>]*>/gi,
        "$1",
      )

      // Convert TipTap editor emoji images
      .replace(/<img[^>]*src="[^"]*emoji[^"]*"[^>]*alt="([^"]*)"[^>]*>/gi, "$1")
      .replace(/<img[^>]*alt="([^"]*)"[^>]*src="[^"]*emoji[^"]*"[^>]*>/gi, "$1")

      // Convert emoji images with Unicode in src path
      .replace(
        /<img[^>]*src="[^"]*[\/\\]([0-9a-f]{4,6})\.(?:png|svg|gif)"[^>]*>/gi,
        (match, unicode) => {
          try {
            return String.fromCodePoint(parseInt(unicode, 16));
          } catch (_e) {
            return "";
          }
        },
      )

      // Convert emoji images with Unicode in filename (u prefix)
      .replace(
        /<img[^>]*src="[^"]*\/u([0-9a-f]{4,6})\.(?:png|svg|gif)"[^>]*>/gi,
        (match, unicode) => {
          try {
            return String.fromCodePoint(parseInt(unicode, 16));
          } catch (_e) {
            return "";
          }
        },
      )

      // Convert emoji images with emoji names in src
      .replace(
        /<img[^>]*src="[^"]*emoji[^"]*[\/\\]([^"\/\\]+)\.(?:png|svg|gif)"[^>]*>/gi,
        (match, emojiName) => {
          // Common emoji name to Unicode mappings
          const emojiMap: { [key: string]: string } = {
            smile: "😊",
            heart: "❤️",
            "thumbs-up": "👍",
            fire: "🔥",
            star: "⭐",
            check: "✅",
            cross: "❌",
            warning: "⚠️",
            info: "ℹ️",
            rocket: "🚀",
            email: "📧",
            party: "🎉",
            thinking: "🤔",
            wink: "😉",
            laugh: "😂",
            cool: "😎",
            love: "😍",
          };

          return emojiMap[emojiName.toLowerCase()] || "";
        },
      )

      // Fallback: Remove any remaining emoji image tags that couldn't be converted
      .replace(/<img[^>]*class="[^"]*emoji[^"]*"[^>]*>/gi, "")
      .replace(/<img[^>]*emoji[^>]*>/gi, "")
      .replace(/<img[^>]*src="[^"]*emoji[^"]*"[^>]*>/gi, "")
  );
}

/**
 * Converts emoji images to text (client-safe)
 */
export function convertEmojiImagesToText(html: string): string {
  return cleanupEmojiImages(html);
}
