/**
 * Client-side email formatting utilities
 * This file can be safely imported on the client side
 */

/**
 * Client-side function to get email preview HTML using the API
 */
export async function getEmailPreviewHTML(content: string): Promise<string> {
  try {
    const response = await fetch('/api/format-email-preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ htmlContent: content }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const result = await response.json()
    
    if (result.success) {
      return result.formattedHTML
    } else {
      throw new Error(result.error || 'Failed to format email')
    }
  } catch (error) {
    console.error('Failed to format email preview:', error)
    // Return basic HTML as fallback
    return getBasicEmailHTML(content)
  }
}

/**
 * Basic HTML formatter as fallback (client-safe)
 */
export function getBasicEmailHTML(content: string): string {
  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #666;">Email Preview</h3>
        <div style="background: white; padding: 20px; border-radius: 4px; border: 1px solid #ddd;">
          ${sanitizeBasicHTML(content)}
        </div>
      </div>
    </div>
  `
}

/**
 * Basic HTML sanitization for client-side use
 */
function sanitizeBasicHTML(htmlContent: string): string {
  if (!htmlContent) return ''
  
  return htmlContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s(on\w+|javascript:)[^>]*/gi, '')
    .trim()
}

/**
 * Synchronous function for immediate HTML preview (client-safe)
 */
export function getInstantEmailPreview(content: string): string {
  return getBasicEmailHTML(content)
}

/**
 * Cleans up emoji image tags by converting them to Unicode text (client-safe)
 */
export function cleanupEmojiImages(html: string): string {
  return html
    // Convert emoji images to Unicode text using alt attribute
    .replace(/<img[^>]*class="[^"]*emoji[^"]*"[^>]*alt="([^"]*)"[^>]*>/gi, '$1')
    // Convert emoji images with data-emoji attribute
    .replace(/<img[^>]*data-emoji="([^"]*)"[^>]*>/gi, '$1')
    // Convert emoji images with Unicode in filename
    .replace(/<img[^>]*src="[^"]*\/([^"\/]*\.(?:png|svg|gif))"[^>]*>/gi, (match, filename) => {
      // Try to extract emoji from filename if it contains Unicode
      const unicodeMatch = filename.match(/u([0-9a-f]{4,6})/i);
      if (unicodeMatch) {
        try {
          return String.fromCodePoint(parseInt(unicodeMatch[1], 16));
        } catch (e) {
          return ''; // Remove if conversion fails
        }
      }
      return ''; // Remove unrecognized emoji images
    })    // Remove any remaining emoji image tags
    .replace(/<img[^>]*class="[^"]*emoji[^"]*"[^>]*>/gi, '');
}

/**
 * Converts emoji images to text (client-safe)
 */
export function convertEmojiImagesToText(html: string): string {
  return cleanupEmojiImages(html);
}
