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
 * Formats email content using MJML for better email client compatibility
 * Ensures proper list indentation and bullet styling
 */
export function formatEmailHTML(htmlContent: string): string {
  try {
    // Check if MJML is available (server-side only)
    if (!mjml2html) {
      // Silently fall back to basic HTML during build
      return getFallbackHTML(htmlContent);
    }

    // First convert any emoji images to Unicode text
    const contentWithTextEmojis = convertEmojiImagesToText(htmlContent);
    
    // Basic HTML content cleaning and preparation with enhanced Gmail support
    const sanitizedContent = sanitizeEmailHTML(contentWithTextEmojis);
    
    // Ensure the content is properly wrapped and structured
    const wrappedContent = sanitizedContent.startsWith('<') ? sanitizedContent : `<p>${sanitizedContent}</p>`;
      // Create MJML template with full-width desktop styling
    const mjmlTemplate = `
      <mjml>
        <mj-head>
          <mj-attributes>
            <mj-all font-family="Aptos, sans-serif" font-size="16px" line-height="1.5" />
            <mj-text padding="0" />
            <mj-section padding="0" />
            <mj-column padding="0" />
          </mj-attributes>
          <mj-style>
            /* Full-width desktop email styling */
            .email-content {
              margin: 0 !important;
              line-height: 1.5 !important;
              font-family: Aptos, sans-serif !important;
              padding: 0 !important;
              width: 100% !important;
              max-width: none !important;
            }
            
            /* Paragraph spacing */
            .email-content p {
              margin: 0 0 16px 0 !important;
              padding: 0 !important;
              line-height: 1.5 !important;
              font-family: Aptos, sans-serif !important;
              font-size: 16px !important;
            }
            
            /* Remove extra spacing from last paragraph */
            .email-content p:last-child {
              margin-bottom: 0 !important;
            }
            
            /* Heading spacing */
            .email-content h1, .email-content h2, .email-content h3,
            .email-content h4, .email-content h5, .email-content h6 {
              margin: 0 0 16px 0 !important;
              padding: 0 !important;
              line-height: 1.3 !important;
              font-family: Aptos, sans-serif !important;
            }
            
            /* List spacing and styling */
            .email-content ul, .email-content ol {
              margin: 0 0 16px 0 !important;
              padding: 0 0 0 30px !important;
              font-family: Aptos, sans-serif !important;
            }
            
            .email-content li {
              margin: 0 0 8px 0 !important;
              padding: 0 !important;
              list-style-position: outside !important;
              line-height: 1.5 !important;
              font-family: Aptos, sans-serif !important;
            }
            
            .email-content ul li {
              list-style-type: disc !important;
            }
            
            .email-content ol li {
              list-style-type: decimal !important;
            }
            
            /* Nested list spacing */
            .email-content ul ul,
            .email-content ol ol,
            .email-content ul ol,
            .email-content ol ul {
              margin: 8px 0 8px 0 !important;
              padding: 0 0 0 25px !important;
            }
            
            /* Blockquote spacing */
            .email-content blockquote {
              margin: 0 0 16px 0 !important;
              padding: 16px 0 16px 20px !important;
              border-left: 3px solid #ccc !important;
              font-style: italic !important;
            }
            
            /* Link styling */
            .email-content a {
              color: #0066cc !important;
              text-decoration: underline !important;
              cursor: pointer !important;
            }
            
            .email-content a:hover {
              color: #004499 !important;
              text-decoration: underline !important;
            }
            
            .email-content a:visited {
              color: #0066cc !important;
            }
            
            /* Strong and emphasis */
            .email-content strong {
              font-weight: bold !important;
            }
            
            .email-content em {
              font-style: italic !important;
            }
            
            /* Ensure full width usage */
            table {
              width: 100% !important;
              max-width: none !important;
            }
          </mj-style>
        </mj-head>
        <mj-body width="100%">
          <mj-section padding="20px" width="100%">
            <mj-column width="100%">
              <mj-text padding="0" css-class="email-content" width="100%">
                ${wrappedContent}
              </mj-text>
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>
    `;    // Compile MJML to HTML with full-width settings
    const { html, errors } = mjml2html(mjmlTemplate, {
      validationLevel: 'soft',
      minify: false,
      beautify: true,
      fonts: {
        'Aptos': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
      }
    });

    if (errors && errors.length > 0) {
      console.warn('MJML compilation warnings:', errors);
    }

    return html;} catch (error) {
    console.error('MJML compilation failed:', error);
    return getFallbackHTML(htmlContent);
  }
}

/**
 * Fallback HTML formatter when MJML is not available
 */
function getFallbackHTML(htmlContent: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            margin: 0;
            line-height: 1.5;
            font-family: Aptos, sans-serif;
            font-size: 16px;
            padding: 20px; 
            color: #333;
            width: 100%;
            max-width: none;
          }
          
          /* Full-width container */
          .email-container {
            width: 100%;
            max-width: none;
            margin: 0;
            padding: 0;
          }
          
          /* Paragraph spacing */
          p { 
            margin: 0 0 16px 0 !important;
            padding: 0 !important;
            line-height: 1.5 !important;
            font-family: Aptos, sans-serif !important;
            font-size: 16px !important;
          }
          
          /* Remove extra spacing from last paragraph */
          p:last-child {
            margin-bottom: 0 !important;
          }
          
          /* Heading spacing */
          h1, h2, h3, h4, h5, h6 {
            margin: 0 0 16px 0 !important;
            padding: 0 !important;
            line-height: 1.3 !important;
            font-family: Aptos, sans-serif !important;
          }
          
          /* List styling */
          ul, ol { 
            margin: 0 0 16px 0 !important; 
            padding: 0 0 0 30px !important;
            font-family: Aptos, sans-serif !important;
          }
          
          li { 
            margin: 0 0 8px 0 !important; 
            padding: 0 !important;
            list-style-position: outside !important; 
            line-height: 1.5 !important;
            font-family: Aptos, sans-serif !important;
          }
          
          /* Nested list indentation */
          ul ul, ol ol, ul ol, ol ul {
            margin: 8px 0 8px 0 !important;
            padding: 0 0 0 25px !important;
          }
          
          ul li { 
            list-style-type: disc !important; 
          }
          
          ol li { 
            list-style-type: decimal !important; 
          }
          
          /* Blockquote spacing */
          blockquote {
            margin: 0 0 16px 0 !important;
            padding: 16px 0 16px 20px !important;
            border-left: 3px solid #ccc !important;
            font-style: italic !important;
          }
          
          /* Link styling */
          a {
            color: #0066cc !important;
            text-decoration: underline !important;
            cursor: pointer !important;
          }
          
          a:hover {
            color: #004499 !important;
            text-decoration: underline !important;
          }
          
          a:visited {
            color: #0066cc !important;
          }
          
          /* Strong and emphasis */
          strong {
            font-weight: bold !important;
          }
          
          em {
            font-style: italic !important;
          }
          
          /* Ensure full width usage */
          table {
            width: 100% !important;
            max-width: none !important;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          ${sanitizeEmailHTML(convertEmojiImagesToText(htmlContent))}
        </div>
      </body>
    </html>
  `;
}

/**
 * Sanitizes HTML content while preserving formatting and converting emoji images back to Unicode text
 */
export function sanitizeEmailHTML(htmlContent: string): string {
  if (!htmlContent) return '';
  
  // First, check if content already has good structure (like correctformat.html)
  // If it's already clean with just div and p tags, minimal processing needed
  const isAlreadyClean = !htmlContent.includes('<table') && 
                        !htmlContent.includes('<td') && 
                        !htmlContent.includes('m_') &&
                        htmlContent.includes('<div>') && 
                        htmlContent.includes('<p>');
  
  let sanitized = htmlContent;
  
  if (!isAlreadyClean) {
    // Only apply heavy sanitization if content has complex Gmail structures
    sanitized = htmlContent
      // Clean up Gmail-specific HTML structures only if present
      .replace(/<td[^>]*class="[^"]*m_[0-9]+[^"]*"[^>]*>/gi, '<div>') // Convert Gmail table cells to divs
      .replace(/<\/td>/gi, '</div>')
      .replace(/<table[^>]*>/gi, '<div>') // Convert tables to divs for better email compatibility
      .replace(/<\/table>/gi, '</div>')
      .replace(/<tbody[^>]*>/gi, '<div>')
      .replace(/<\/tbody>/gi, '</div>')
      .replace(/<tr[^>]*>/gi, '<div>')
      .replace(/<\/tr>/gi, '</div>')
      // Remove Gmail-specific classes but preserve other classes (be more specific)
      .replace(/class="[^"]*m_[0-9]+[^"]*"/gi, (match) => {
        // Only remove if it's purely Gmail classes, otherwise preserve other classes
        const classContent = match.match(/class="([^"]*)"/)?.[1] || '';
        const nonGmailClasses = classContent.split(' ').filter(cls => !cls.match(/^m_[0-9]+/));
        return nonGmailClasses.length > 0 ? `class="${nonGmailClasses.join(' ')}"` : '';
      })
      // Remove excessive nested divs
      .replace(/<div>\s*<div>/gi, '<div>')
      .replace(/<\/div>\s*<\/div>/gi, '</div>');
  }
  
  // Always apply these minimal cleanups
  sanitized = sanitized
    // Convert emoji images to Unicode text using alt attribute (preserve emojis in correct format)
    .replace(/<img[^>]*data-emoji="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '$2')
    .replace(/<img[^>]*alt="([^"]*)"[^>]*data-emoji="[^"]*"[^>]*>/gi, '$1')
    // Only remove dangerous script content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s(on\w+)=["'][^"']*["']/gi, '') // Remove onXXX event handlers
    .replace(/\sjavascript:[^"\s>]*/gi, '') // Remove javascript: URLs
    // Preserve links but ensure they have proper attributes
    .replace(/<a([^>]*href="[^"]*"[^>]*)>/gi, (match, attributes) => {
      // Ensure links have proper styling for email clients
      if (!attributes.includes('style=')) {
        return `<a${attributes} style="color: #0066cc; text-decoration: underline;">`;
      }
      return match;
    })
    // Clean up excessive whitespace but preserve line structure
    .replace(/[ \t]+/g, ' ') // Only collapse spaces and tabs, not newlines
    .replace(/\n\s*\n\s*\n+/g, '\n\n') // Collapse multiple newlines to max 2
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
  // For Gmail, we can use the same MJML formatting
  return formatEmailHTML(htmlContent);
}

/**
 * Converts rich text editor content to email-safe HTML
 */
export function convertToEmailHTML(editorContent: any): string {
  if (typeof editorContent === 'string') {
    return formatEmailHTML(editorContent);
  }
  
  // If it's a structured object from a rich text editor
  if (editorContent && typeof editorContent === 'object') {
    // Convert to HTML string first (this would depend on your editor format)
    const htmlString = JSON.stringify(editorContent); // Placeholder - implement based on your editor
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
  
  // Check for potentially problematic content
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
 * This should be called before any email formatting to ensure emojis are text-based
 */
export function convertEmojiImagesToText(html: string): string {
  if (!html) return '';
  
  // For the correct format, we want to preserve emoji images with data-emoji and alt attributes
  // Only convert if they don't already have the correct format
  return html
    // Convert emoji images without data-emoji to Unicode text
    .replace(/<img[^>]*class="[^"]*emoji[^"]*"[^>]*alt="([^"]*)"[^>]*(?![^>]*data-emoji)[^>]*>/gi, '$1')
    
    // Convert TipTap editor emoji images to Unicode (these don't have data-emoji)
    .replace(/<img[^>]*src="[^"]*emoji[^"]*"[^>]*alt="([^"]*)"[^>]*(?![^>]*data-emoji)[^>]*>/gi, '$1')
    .replace(/<img[^>]*alt="([^"]*)"[^>]*src="[^"]*emoji[^"]*"[^>]*(?![^>]*data-emoji)[^>]*>/gi, '$1')
    
    // Convert emoji images with Unicode in src path (but not the ones with data-emoji)
    .replace(/<img[^>]*src="[^"]*[\/\\]([0-9a-f]{4,6})\.(?:png|svg|gif)"[^>]*(?![^>]*data-emoji)[^>]*>/gi, (match, unicode) => {
      try {
        return String.fromCodePoint(parseInt(unicode, 16));
      } catch (e) {
        return '';
      }
    })
    
    // Remove any remaining emoji image tags that don't have the correct format
    .replace(/<img[^>]*class="[^"]*emoji[^"]*"[^>]*(?![^>]*data-emoji)[^>]*>/gi, '')
    .replace(/<img[^>]*emoji[^>]*(?![^>]*data-emoji)[^>]*>/gi, '')
    .replace(/<img[^>]*src="[^"]*emoji[^"]*"[^>]*(?![^>]*data-emoji)[^>]*>/gi, '');
}
