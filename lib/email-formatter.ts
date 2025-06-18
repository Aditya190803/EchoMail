/**
 * Email formatting utilities to ensure consistent spacing and styling
 * across different email clients, especially to match Gmail's appearance
 */

export function formatEmailHTML(htmlContent: string): string {
  // Remove any existing HTML structure and extract just the body content
  const cleanContent = htmlContent
    .replace(/<html[^>]*>/gi, '')
    .replace(/<\/html>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<body[^>]*>/gi, '')
    .replace(/<\/body>/gi, '')
    .trim()

  // Process content to match Gmail's exact structure
  const bodyContent = processContentForGmail(cleanContent)
  // Email-safe CSS that perfectly mimics Gmail's exact styling
  const emailCSS = `
    <style type="text/css">      /* Exact Gmail reset and base styles */
      * {
        box-sizing: border-box;
        font-size: 14px !important;
        line-height: 1.4 !important;
        color: #222222 !important;
        font-family: Arial, sans-serif !important;
      }
      
      body, table, td, p, a, li, blockquote, div {
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
        margin: 0;
        padding: 0;
        font-size: 14px !important;
        line-height: 1.4 !important;
        color: #222222 !important;
        font-family: Arial, sans-serif !important;
      }}      /* Gmail's exact body styling */
      body {
        font-family: Arial, sans-serif !important;
        font-size: 14px !important;
        line-height: 1.4 !important;
        color: #222222 !important;
        background-color: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        min-width: 100% !important;
        word-spacing: normal !important;
        letter-spacing: normal !important;
      }      /* Gmail's content wrapper - no extra containers */
      .gmail-content {
        font-family: Arial, sans-serif !important;
        font-size: 14px !important;
        line-height: 1.4 !important;
        color: #222222 !important;
        margin: 0 !important;
        padding: 0 !important;
      }
        margin: 0 !important;
        padding: 0 !important;
      }
      
      /* Ensure first element in content has no top margin */
      .gmail-content > :first-child {
        margin-top: 0 !important;
        padding-top: 0 !important;
      }
      
      /* Ensure last element in content has no bottom margin */
      .gmail-content > :last-child {
        margin-bottom: 0 !important;
        padding-bottom: 0 !important;
      }      /* Gmail's exact paragraph styling */
      p {
        font-family: Arial, sans-serif !important;
        font-size: 14px !important;
        line-height: 1.4 !important;
        color: #222222 !important;
        margin: 0 0 1em 0 !important;
        padding: 0 !important;
        word-spacing: normal !important;
        letter-spacing: normal !important;
        font-weight: normal !important;
      }
        /* Remove margin from last paragraph like Gmail */
      p:last-child {
        margin-bottom: 0 !important;
      }
      
      /* Remove margin from first paragraph to eliminate leading space */
      p:first-child {
        margin-top: 0 !important;
      }      /* Gmail's exact div styling */
      div {
        font-family: Arial, sans-serif !important;
        font-size: 14px !important;
        line-height: 1.4 !important;
        color: #222222 !important;
        margin: 0 !important;
        padding: 0 !important;
        word-spacing: normal !important;
        letter-spacing: normal !important;
      }
      
      /* Gmail's line break handling */
      br {
        line-height: 1.4 !important;
      }
        word-spacing: normal !important;
        letter-spacing: normal !important;
      }
      
      /* Ensure proper spacing for content blocks */
      div + div {
        margin-top: 1em !important;
      }      /* Heading styles matching Gmail exactly */
      h1 {
        font-size: 24px !important;
        font-weight: bold !important;
        margin: 0 0 1em 0 !important;
        padding: 0 !important;
        color: #222222 !important;
        line-height: 1.4 !important;
        font-family: Arial, sans-serif !important;
        word-spacing: normal !important;
        letter-spacing: normal !important;
      }
      
      h2 {
        font-size: 18px !important;
        font-weight: bold !important;
        margin: 0 0 1em 0 !important;
        padding: 0 !important;
        color: #222222 !important;
        line-height: 1.4 !important;
        font-family: Arial, sans-serif !important;
        word-spacing: normal !important;
        letter-spacing: normal !important;
      }
      
      h3 {
        font-size: 16px !important;
        font-weight: bold !important;
        margin: 0 0 1em 0 !important;
        padding: 0 !important;
        color: #222222 !important;
        line-height: 1.4 !important;
        font-family: Arial, sans-serif !important;
        word-spacing: normal !important;
        letter-spacing: normal !important;
      }
        font-family: Arial, sans-serif !important;
        word-spacing: normal !important;
        letter-spacing: normal !important;
      }        /* List styles matching Gmail exactly */
      ul, ol {
        margin: 0 0 1em 0 !important;
        padding-left: 30px !important;
        font-family: Arial, sans-serif !important;
        font-size: 14px !important;
        line-height: 1.4 !important;
        color: #222222 !important;
        word-spacing: normal !important;
        letter-spacing: normal !important;
      }
      
      li {
        margin: 0 0 0.3em 0 !important;
        padding: 0 !important;
        font-size: 14px !important;
        line-height: 1.4 !important;
        color: #222222 !important;
        font-family: Arial, sans-serif !important;
        word-spacing: normal !important;
        letter-spacing: normal !important;
      }
        letter-spacing: normal !important;
      }
      
      li:last-child {
        margin-bottom: 0 !important;
      }
      
      /* Nested lists */
      ul ul, ol ol, ul ol, ol ul {
        margin: 0.3em 0 0.3em 0 !important;
        padding-left: 25px !important;
      }
        /* Link styles matching Gmail */
      a {
        color: #1a0dab !important;
        text-decoration: underline !important;
      }
      
      a:hover {
        color: #1a0dab !important;
        text-decoration: underline !important;
      }      /* Blockquote styles matching Gmail exactly */
      blockquote {
        margin: 0 0 1em 0 !important;
        padding: 0 0 0 15px !important;
        border-left: 2px solid #dcdcdc !important;
        color: #222222 !important;
        font-style: normal !important;
        font-size: 14px !important;
        line-height: 1.4 !important;
        font-family: Arial, sans-serif !important;
        word-spacing: normal !important;
        letter-spacing: normal !important;
      }
      }
        /* Code styles matching Gmail */
      code {
        background-color: #f5f5f5 !important;
        padding: 2px 4px !important;
        border-radius: 3px !important;
        font-family: 'Courier New', Courier, monospace !important;
        font-size: 12px !important;
        color: #d73a49 !important;
        word-spacing: normal !important;
        letter-spacing: normal !important;
      }
      
      /* Image styles */
      img {
        max-width: 100% !important;
        height: auto !important;
        border: none !important;
        outline: none !important;
      }      /* Strong and emphasis matching Gmail */
      strong, b {
        font-weight: bold !important;
        color: #222222 !important;
        font-family: Arial, sans-serif !important;
        font-size: inherit !important;
        word-spacing: normal !important;
        letter-spacing: normal !important;
      }
      
      em, i {
        font-style: italic !important;
        color: #222222 !important;
        font-family: Arial, sans-serif !important;
        font-size: inherit !important;
        word-spacing: normal !important;
        letter-spacing: normal !important;
      }
      
      /* Underline */
      u {
        text-decoration: underline !important;
      }
      
      /* Text alignment */
      .text-left { text-align: left !important; }
      .text-center { text-align: center !important; }
      .text-right { text-align: right !important; }
      .text-justify { text-align: justify !important; }      /* Ensure Gmail-style rendering across all clients */
      @media screen and (-webkit-min-device-pixel-ratio: 0) {
        .gmail-content, .gmail-content * {
          font-size: 14px !important;
          line-height: 1.4 !important;
          font-family: Arial, sans-serif !important;
          color: #222222 !important;
          word-spacing: normal !important;
          letter-spacing: normal !important;
        }
      }
        /* Signature styling matching Gmail */
      .signature {
        color: #5f6368 !important;
        font-size: 12px !important;
        font-family: Arial, sans-serif !important;
        line-height: 1.4 !important;
        margin: 1em 0 0 0 !important;
        padding: 0 !important;
      }
        /* Table layout support for Gmail compatibility */
      table {
        border-collapse: collapse !important;
        width: 100% !important;
        font-family: Arial, sans-serif !important;
        font-size: 14px !important;
        line-height: 1.4 !important;
        color: #222222 !important;
      }
      
      td {
        padding: 0 !important;
        vertical-align: top !important;
        font-family: Arial, sans-serif !important;
        font-size: 14px !important;
        line-height: 1.4 !important;
        color: #222222 !important;
      }
    </style>
  `
  // Construct Gmail-compatible HTML structure (simplified like Gmail)
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${emailCSS}
</head>
<body>
  <div class="gmail-content">
    ${bodyContent}
  </div>
</body>
</html>`
}

/**
 * Sanitize HTML content for email while preserving formatting
 */
export function sanitizeEmailHTML(html: string): string {
  // Basic sanitization while preserving email-safe HTML
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove existing styles (will be replaced)
    .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '') // Remove javascript: links
    .replace(/data:/gi, '') // Remove data: URLs for security
}

/**
 * Preview how the email will look with Gmail-like styling
 * This can be used in the compose preview
 */
export function getEmailPreviewHTML(htmlContent: string): string {
  const sanitized = sanitizeEmailHTML(htmlContent)
  return formatEmailHTML(sanitized)
}

/**
 * Process content to match Gmail's exact HTML structure
 */
function processContentForGmail(htmlContent: string): string {
  // Remove TipTap's editor classes and attributes that don't match Gmail
  let processed = htmlContent
    .replace(/class="[^"]*"/g, '') // Remove all classes
    .replace(/style="[^"]*"/g, '') // Remove inline styles (we'll add our own)
    .replace(/data-[^=]*="[^"]*"/g, '') // Remove data attributes
    .replace(/contenteditable="[^"]*"/g, '') // Remove contenteditable
    .replace(/spellcheck="[^"]*"/g, '') // Remove spellcheck
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()

  // Ensure proper paragraph structure like Gmail
  processed = processed
    .replace(/<div><br><\/div>/g, '<p><br></p>') // Convert empty divs to paragraphs
    .replace(/<div>/g, '<p>') // Convert divs to paragraphs
    .replace(/<\/div>/g, '</p>') // Convert closing divs
    .replace(/<p><\/p>/g, '<p><br></p>') // Empty paragraphs get br
    .replace(/<p>\s*<br>\s*<\/p>/g, '<p><br></p>') // Clean up br in paragraphs

  // Add inline styles to ALL elements
  const inlineStyle = 'margin: 0 0 1em 0 !important; padding: 0 !important; font-size: 14px !important; line-height: 1.4 !important; color: #222222 !important; font-family: Arial, sans-serif !important;'
  
  processed = processed
    // Add styles to paragraphs
    .replace(/<p>/g, `<p style="${inlineStyle}">`)
    .replace(/<p([^>]*)>/g, `<p$1 style="${inlineStyle}">`)
    
    // Add styles to divs
    .replace(/<div>/g, `<div style="${inlineStyle}">`)
    .replace(/<div([^>]*)>/g, `<div$1 style="${inlineStyle}">`)
    
    // Add styles to spans
    .replace(/<span>/g, `<span style="${inlineStyle}">`)
    .replace(/<span([^>]*)>/g, `<span$1 style="${inlineStyle}">`)
    
    // Add styles to headings
    .replace(/<h1>/g, `<h1 style="${inlineStyle}">`)
    .replace(/<h1([^>]*)>/g, `<h1$1 style="${inlineStyle}">`)
    .replace(/<h2>/g, `<h2 style="${inlineStyle}">`)
    .replace(/<h2([^>]*)>/g, `<h2$1 style="${inlineStyle}">`)
    .replace(/<h3>/g, `<h3 style="${inlineStyle}">`)
    .replace(/<h3([^>]*)>/g, `<h3$1 style="${inlineStyle}">`)
    
    // Add styles to lists
    .replace(/<ul>/g, `<ul style="${inlineStyle}">`)
    .replace(/<ul([^>]*)>/g, `<ul$1 style="${inlineStyle}">`)
    .replace(/<ol>/g, `<ol style="${inlineStyle}">`)
    .replace(/<ol([^>]*)>/g, `<ol$1 style="${inlineStyle}">`)
    .replace(/<li>/g, `<li style="${inlineStyle}">`)
    .replace(/<li([^>]*)>/g, `<li$1 style="${inlineStyle}">`)
    
    // Add styles to other elements
    .replace(/<strong>/g, `<strong style="${inlineStyle}">`)
    .replace(/<strong([^>]*)>/g, `<strong$1 style="${inlineStyle}">`)
    .replace(/<b>/g, `<b style="${inlineStyle}">`)
    .replace(/<b([^>]*)>/g, `<b$1 style="${inlineStyle}">`)
    .replace(/<em>/g, `<em style="${inlineStyle}">`)
    .replace(/<em([^>]*)>/g, `<em$1 style="${inlineStyle}">`)
    .replace(/<i>/g, `<i style="${inlineStyle}">`)
    .replace(/<i([^>]*)>/g, `<i$1 style="${inlineStyle}">`)
    .replace(/<u>/g, `<u style="${inlineStyle}">`)
    .replace(/<u([^>]*)>/g, `<u$1 style="${inlineStyle}">`)
    .replace(/<blockquote>/g, `<blockquote style="${inlineStyle}">`)
    .replace(/<blockquote([^>]*)>/g, `<blockquote$1 style="${inlineStyle}">`)

  // Remove leading empty elements that cause extra spacing
  processed = processed
    .replace(/^(<p[^>]*><br><\/p>|<p[^>]*><\/p>|<br>|<div[^>]*><\/div>)+/i, '') // Remove leading empty elements
    .replace(/^(<p[^>]*>\s*<\/p>)+/i, '') // Remove leading empty paragraphs with whitespace
    .replace(/^\s+/, '') // Remove any remaining leading whitespace
    .trim()

  // Remove trailing empty elements
  processed = processed
    .replace(/(<p[^>]*><br><\/p>|<p[^>]*><\/p>|<br>|<div[^>]*><\/div>)+$/i, '') // Remove trailing empty elements
    .replace(/(<p[^>]*>\s*<\/p>)+$/i, '') // Remove trailing empty paragraphs
    .replace(/\s+$/, '') // Remove trailing whitespace
    .trim()

  // If content is empty or only contains empty elements, return empty string
  if (!processed || processed.match(/^(<p[^>]*><br><\/p>|<p[^>]*><\/p>|<br>|\s)*$/i)) {
    return ''
  }

  return processed
}
