// MJML import only on server side
let mjml2html: any = null;
if (typeof window === 'undefined') {
  try {
    mjml2html = require('mjml');
  } catch (error) {
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
    
    // Clean up the HTML content
    const sanitizedContent = sanitizeEmailHTML(contentWithTextEmojis);
    
    // Gmail uses a very simple HTML structure - no tables, no complex wrappers
    // Just the content in a div with inline styles matching Gmail's defaults
    return formatAsGmailNative(sanitizedContent);
  } catch (error) {
    console.error('Email formatting failed:', error);
    return formatAsGmailNative(htmlContent);
  }
}

/**
 * Formats HTML to match Gmail's native email format exactly.
 * Gmail compose uses minimal HTML with Google's default font styling.
 */
function formatAsGmailNative(htmlContent: string): string {
  // Gmail's default styling - matches what Gmail uses when you compose an email
  // Font: Google Sans, Roboto, or system sans-serif at 14px (small) or ~10.5pt
  // Line height: normal (about 1.2)
  // No extra margins or padding on the outer container
  
  // Process the content to ensure proper Gmail-style formatting
  let processedContent = htmlContent;
  
  // Ensure paragraphs have Gmail-style spacing (Gmail uses <div> with <br> for line breaks)
  // Gmail doesn't use <p> tags much - it uses <div> tags
  processedContent = processedContent
    // Convert <p> tags to Gmail-style divs (Gmail uses div for paragraphs)
    .replace(/<p([^>]*)>/gi, '<div$1>')
    .replace(/<\/p>/gi, '</div>')
    // Ensure empty lines become <div><br></div> like Gmail does
    .replace(/<div><\/div>/gi, '<div><br></div>')
    .replace(/<div>\s*<\/div>/gi, '<div><br></div>');
  
  // Gmail's native email format - extremely simple
  // This is what Gmail actually sends when you compose and send an email
  return `<div dir="ltr">${processedContent}</div>`;
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
    const wrappedContent = sanitizedContent.startsWith('<') ? sanitizedContent : `<p>${sanitizedContent}</p>`;
      
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
      validationLevel: 'soft',
      minify: false
    });

    if (errors && errors.length > 0) {
      console.warn('MJML compilation warnings:', errors);
    }

    return html;
  } catch (error) {
    console.error('MJML compilation failed:', error);
    return formatAsGmailNative(htmlContent);
  }
}

/**
 * Fallback HTML formatter - simplified Gmail-like format
 */
function getFallbackHTML(htmlContent: string): string {
  return formatAsGmailNative(sanitizeEmailHTML(convertEmojiImagesToText(htmlContent)));
}

/**
 * Sanitizes HTML content while preserving formatting
 * Keeps the HTML clean and Gmail-compatible
 */
export function sanitizeEmailHTML(htmlContent: string): string {
  if (!htmlContent) return '';
  
  let sanitized = htmlContent;
  
  // Remove any complex table structures that aren't Gmail-native
  const hasComplexTables = htmlContent.includes('m_') || 
                          (htmlContent.includes('<table') && htmlContent.includes('class='));
  
  if (hasComplexTables) {
    sanitized = htmlContent
      // Convert Gmail-forwarded table cells to divs
      .replace(/<td[^>]*class="[^"]*m_[0-9]+[^"]*"[^>]*>/gi, '<div>')
      .replace(/<\/td>/gi, '</div>')
      .replace(/<table[^>]*>/gi, '<div>')
      .replace(/<\/table>/gi, '</div>')
      .replace(/<tbody[^>]*>/gi, '')
      .replace(/<\/tbody>/gi, '')
      .replace(/<tr[^>]*>/gi, '<div>')
      .replace(/<\/tr>/gi, '</div>')
      // Remove Gmail-specific classes
      .replace(/class="[^"]*m_[0-9]+[^"]*"/gi, '')
      // Clean up nested divs
      .replace(/<div>\s*<div>/gi, '<div>')
      .replace(/<\/div>\s*<\/div>/gi, '</div>');
  }
  
  // Always apply these cleanups
  sanitized = sanitized
    // Convert emoji images to text
    .replace(/<img[^>]*data-emoji="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '$2')
    .replace(/<img[^>]*alt="([^"]*)"[^>]*data-emoji="[^"]*"[^>]*>/gi, '$1')
    // Remove script tags and event handlers (security)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s(on\w+)=["'][^"']*["']/gi, '')
    .replace(/\sjavascript:[^"\s>]*/gi, '')
    // Ensure links work properly - Gmail style (blue, underlined)
    .replace(/<a\s+href="([^"]*)"([^>]*)>/gi, (match, href, rest) => {
      // Gmail default link style
      if (!rest.includes('style=')) {
        return `<a href="${href}"${rest} style="color:#15c;text-decoration:underline">`;
      }
      return match;
    })
    // Clean up whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
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
 */
export function convertToEmailHTML(editorContent: any): string {
  if (typeof editorContent === 'string') {
    return formatEmailHTML(editorContent);
  }
  
  if (editorContent && typeof editorContent === 'object') {
    const htmlString = JSON.stringify(editorContent);
    return formatEmailHTML(htmlString);
  }
  
  return '';
}

/**
 * Validates email HTML content
 */
export function validateEmailHTML(htmlContent: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!htmlContent || htmlContent.trim() === '') {
    errors.push('Email content is empty');
  }
  
  if (htmlContent.includes('<script')) {
    errors.push('Script tags are not allowed in email content');
  }
  
  if (htmlContent.includes('javascript:')) {
    errors.push('JavaScript URLs are not allowed in email content');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Converts emoji images to Unicode text characters
 */
export function convertEmojiImagesToText(html: string): string {
  if (!html) return '';
  
  return html
    // Convert emoji images without data-emoji to Unicode text
    .replace(/<img[^>]*class="[^"]*emoji[^"]*"[^>]*alt="([^"]*)"[^>]*(?![^>]*data-emoji)[^>]*>/gi, '$1')
    // Convert TipTap editor emoji images to Unicode
    .replace(/<img[^>]*src="[^"]*emoji[^"]*"[^>]*alt="([^"]*)"[^>]*(?![^>]*data-emoji)[^>]*>/gi, '$1')
    .replace(/<img[^>]*alt="([^"]*)"[^>]*src="[^"]*emoji[^"]*"[^>]*(?![^>]*data-emoji)[^>]*>/gi, '$1')
    // Convert emoji images with Unicode in src path
    .replace(/<img[^>]*src="[^"]*[\/\\]([0-9a-f]{4,6})\.(?:png|svg|gif)"[^>]*(?![^>]*data-emoji)[^>]*>/gi, (match, unicode) => {
      try {
        return String.fromCodePoint(parseInt(unicode, 16));
      } catch (e) {
        return '';
      }
    })
    // Remove any remaining emoji images without proper format
    .replace(/<img[^>]*class="[^"]*emoji[^"]*"[^>]*(?![^>]*data-emoji)[^>]*>/gi, '')
    .replace(/<img[^>]*emoji[^>]*(?![^>]*data-emoji)[^>]*>/gi, '')
    .replace(/<img[^>]*src="[^"]*emoji[^"]*"[^>]*(?![^>]*data-emoji)[^>]*>/gi, '');
}
