// MJML import only on server side
let mjml2html: any = null;
if (typeof window === 'undefined') {
  try {
    mjml2html = require('mjml');
  } catch (error) {
    console.warn('MJML not available:', error);
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
      console.warn('MJML not available, using fallback HTML');
      return getFallbackHTML(htmlContent);
    }

    // First convert any emoji images to Unicode text
    const contentWithTextEmojis = convertEmojiImagesToText(htmlContent);

    // Basic HTML content cleaning and preparation
    const sanitizedContent = sanitizeEmailHTML(contentWithTextEmojis);
      // Create MJML template with proper list styling
    const mjmlTemplate = `
      <mjml>
        <mj-head>          <mj-attributes>
            <mj-all font-family="Aptos, sans-serif" font-size="16px" line-height="14.95px" />
            <mj-text padding="0" />
            <mj-section padding="0" />
            <mj-column padding="0" />
          </mj-attributes>
          <mj-style>
            /* Apply your desired styling */
            .email-content {
              margin: 0in !important;
              line-height: 14.95px !important;
              font-family: Aptos, sans-serif !important;
              padding: 0 !important;
            }
              /* Paragraph spacing with your preferred styling */
            .email-content p {
              margin: 0in 0 16px 0 !important;
              padding: 0 !important;
              line-height: 14.95px !important;
              font-family: Aptos, sans-serif !important;
            }
            
            /* Remove extra spacing from last paragraph */
            .email-content p:last-child {
              margin-bottom: 0 !important;
            }
              /* Heading spacing with your preferred styling */
            .email-content h1, .email-content h2, .email-content h3,
            .email-content h4, .email-content h5, .email-content h6 {
              margin: 0in 0 12px 0 !important;
              padding: 0 !important;
              line-height: 14.95px !important;
              font-family: Aptos, sans-serif !important;
            }
              /* List spacing and styling with tab-like indentation */
            .email-content ul, .email-content ol {
              margin: 0in 0 16px 0 !important;
              padding: 0 0 0 0.5in !important; /* Tab-like indentation (0.5 inch) */
              font-family: Aptos, sans-serif !important;
            }
            
            .email-content li {
              margin: 0in 0 6px 0 !important;
              padding: 0 !important;
              list-style-position: outside !important;
              line-height: 14.95px !important;
              font-family: Aptos, sans-serif !important;
            }
            
            /* Nested list indentation - each level indents like pressing tab */
            .email-content ul ul, .email-content ol ol, 
            .email-content ul ol, .email-content ol ul {
              margin: 6px 0 6px 0 !important;
              padding: 0 0 0 0.5in !important; /* Additional tab indentation */
            }
            
            /* Third level indentation */
            .email-content ul ul ul, .email-content ol ol ol,
            .email-content ul ol ul, .email-content ol ul ol {
              padding: 0 0 0 0.5in !important; /* Another tab level */
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
              margin: 6px 0 6px 0 !important;
              padding: 0 0 0 20px !important;
            }
            
            /* Blockquote spacing */
            .email-content blockquote {
              margin: 0 0 16px 0 !important;
              padding: 12px 0 12px 16px !important;
              border-left: 3px solid #ccc !important;
              font-style: italic !important;
            }
            
            /* Remove spacing from first and last elements */
            .email-content > :first-child {
              margin-top: 0 !important;
            }
            
            .email-content > :last-child {
              margin-bottom: 0 !important;
            }
            
            /* Link styling */
            .email-content a {
              color: #0066cc !important;
              text-decoration: underline !important;
            }
            
            /* Strong and emphasis */
            .email-content strong {
              font-weight: bold !important;
            }
            
            .email-content em {
              font-style: italic !important;
            }
          </mj-style>
        </mj-head>
        <mj-body>
          <mj-section padding="20px">
            <mj-column>
              <mj-text padding="0" css-class="email-content">
                ${sanitizedContent}
              </mj-text>
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>
    `;

    // Compile MJML to HTML
    const { html, errors } = mjml2html(mjmlTemplate, {
      validationLevel: 'soft',
      fonts: {
        'Arial': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
      }
    });

    if (errors && errors.length > 0) {
      console.warn('MJML compilation warnings:', errors);
    }

    return html;  } catch (error) {
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0">        <style>
          body { 
            margin: 0in;
            line-height: 14.95px;
            font-family: Aptos, sans-serif;
            font-size: 16px;
            padding: 20px; 
            color: #333;
          }
            /* Paragraph spacing with your preferred styling */
          p { 
            margin: 0in 0 16px 0 !important;            padding: 0 !important;
            line-height: 14.95px !important;
            font-family: Aptos, sans-serif !important;
          }
          
          /* Remove extra spacing from last paragraph */
          p:last-child {
            margin-bottom: 0 !important;
          }
          
          /* Heading spacing with your preferred styling */
          h1, h2, h3, h4, h5, h6 {
            margin: 0in 0 12px 0 !important;
            padding: 0 !important;
            line-height: 14.95px !important;
            font-family: Aptos, sans-serif !important;
          }          /* List styling with tab-like indentation */
          ul, ol { 
            margin: 0in 0 16px 0 !important; 
            padding: 0 0 0 0.5in !important; /* Tab-like indentation (0.5 inch) */
            font-family: Aptos, sans-serif !important;
          }
          
          li { 
            margin: 0in 0 6px 0 !important; 
            padding: 0 !important;
            list-style-position: outside !important; 
            line-height: 14.95px !important;
            font-family: Aptos, sans-serif !important;
          }
          
          /* Nested list indentation - each level indents like pressing tab */
          ul ul, ol ol, ul ol, ol ul {
            margin: 6px 0 6px 0 !important;
            padding: 0 0 0 0.5in !important; /* Additional tab indentation */
          }
          
          /* Third level indentation */
          ul ul ul, ol ol ol, ul ol ul, ol ul ol {
            padding: 0 0 0 0.5in !important; /* Another tab level */
          }
          
          ul li { 
            list-style-type: disc !important; 
          }
          
          ol li { 
            list-style-type: decimal !important; 
          }
          
          /* Nested list spacing */
          ul ul, ol ol, ul ol, ol ul {
            margin: 6px 0 6px 0 !important;
            padding: 0 0 0 20px !important;
          }
          
          /* Blockquote spacing */
          blockquote {
            margin: 0 0 16px 0 !important;
            padding: 12px 0 12px 16px !important;
            border-left: 3px solid #ccc !important;
            font-style: italic !important;
          }
          
          /* Link styling */
          a {
            color: #0066cc !important;
            text-decoration: underline !important;
          }
          
          /* Strong and emphasis */
          strong {
            font-weight: bold !important;
          }
          
          em {
            font-style: italic !important;
          }        </style>
      </head>
      <body>
        ${sanitizeEmailHTML(convertEmojiImagesToText(htmlContent))}
      </body>
    </html>
  `;
}

/**
 * Sanitizes HTML content while preserving formatting and converting emoji images back to Unicode text
 */
export function sanitizeEmailHTML(htmlContent: string): string {
  if (!htmlContent) return '';
  
  // Convert emoji images back to Unicode text
  let sanitized = htmlContent
    // Convert emoji images to Unicode text using alt attribute
    .replace(/<img[^>]*class="[^"]*emoji[^"]*"[^>]*alt="([^"]*)"[^>]*>/gi, '$1')
    // Convert emoji images with data-emoji attribute
    .replace(/<img[^>]*data-emoji="([^"]*)"[^>]*>/gi, '$1')
    // Convert common emoji image patterns with Unicode in src or data attributes
    .replace(/<img[^>]*src="[^"]*\/([^"\/]*\.(?:png|svg|gif))"[^>]*>/gi, (match, filename) => {
      // Try to extract emoji from filename if it contains Unicode
      const unicodeMatch = filename.match(/u([0-9a-f]{4,6})/i);
      if (unicodeMatch) {
        try {
          return String.fromCodePoint(parseInt(unicodeMatch[1], 16));
        } catch (e) {
          return match; // Keep original if conversion fails
        }
      }
      return match;
    })
    // Remove any remaining emoji image tags that couldn't be converted
    .replace(/<img[^>]*class="[^"]*emoji[^"]*"[^>]*>/gi, '')
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove dangerous attributes but keep formatting
    .replace(/\s(on\w+|javascript:)[^>]*/gi, '')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
    
  return sanitized;
}

/**
 * Cleans up emoji image tags by converting them to Unicode text
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
    })
    // Remove any remaining emoji image tags
    .replace(/<img[^>]*class="[^"]*emoji[^"]*"[^>]*>/gi, '');
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
  
  return html
    // Convert emoji images with alt text to Unicode
    .replace(/<img[^>]*alt="([^"]*)"[^>]*class="[^"]*emoji[^"]*"[^>]*>/gi, '$1')
    .replace(/<img[^>]*class="[^"]*emoji[^"]*"[^>]*alt="([^"]*)"[^>]*>/gi, '$1')
    
    // Convert emoji images with data-emoji attribute
    .replace(/<img[^>]*data-emoji="([^"]*)"[^>]*>/gi, '$1')
    
    // Convert emoji images with Unicode in src path (common pattern)
    .replace(/<img[^>]*src="[^"]*[\/\\]([0-9a-f]{4,6})\.(?:png|svg|gif)"[^>]*>/gi, (match, unicode) => {
      try {
        return String.fromCodePoint(parseInt(unicode, 16));
      } catch (e) {
        return '';
      }
    })
    
    // Convert emoji images with emoji names/codes in src
    .replace(/<img[^>]*src="[^"]*emoji[^"]*[\/\\]([^"\/\\]+)\.(?:png|svg|gif)"[^>]*>/gi, (match, emojiName) => {
      // Common emoji name to Unicode mappings
      const emojiMap: { [key: string]: string } = {
        'smile': '😊',
        'heart': '❤️',
        'thumbs-up': '👍',
        'fire': '🔥',
        'star': '⭐',
        'check': '✅',
        'cross': '❌',
        'warning': '⚠️',
        'info': 'ℹ️',
        'rocket': '🚀',
        'email': '📧',
        'party': '🎉',
        'thinking': '🤔',
        'wink': '😉',
        'laugh': '😂',
        'cool': '😎',
        'love': '😍'
      };
      
      return emojiMap[emojiName.toLowerCase()] || '';
    })
    
    // Remove any remaining emoji image tags
    .replace(/<img[^>]*class="[^"]*emoji[^"]*"[^>]*>/gi, '')
    .replace(/<img[^>]*emoji[^>]*>/gi, '');
}
