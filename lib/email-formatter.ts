/**
 * Email formatting utilities to ensure consistent spacing and styling
 * across different email clients, especially to match Gmail's appearance
 */

export function formatEmailHTML(htmlContent: string): string {
  // Remove any existing HTML structure and extract just the body content
  const bodyContent = htmlContent
    .replace(/<html[^>]*>/gi, '')
    .replace(/<\/html>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<body[^>]*>/gi, '')
    .replace(/<\/body>/gi, '')
    .trim()

  // Email-safe CSS that mimics Gmail's default styling
  const emailCSS = `
    <style type="text/css">
      /* Reset for email clients */
      body, table, td, p, a, li, blockquote {
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
      }
      
      /* Base styles matching Gmail's defaults */
      body {
        margin: 0 !important;
        padding: 0 !important;
        background-color: #ffffff;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 14px;
        line-height: 1.4;
        color: #222222;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      
      /* Container for proper spacing */
      .email-container {
        max-width: 100%;
        padding: 0;
        margin: 0;
      }
      
      .email-content {
        padding: 0;
        margin: 0;
      }
      
      /* Paragraph spacing to match Gmail */
      p {
        margin: 0 0 1em 0 !important;
        padding: 0 !important;
        font-size: 14px !important;
        line-height: 1.4 !important;
        color: #222222 !important;
      }
      
      /* Remove extra margin from last paragraph */
      p:last-child {
        margin-bottom: 0 !important;
      }
      
      /* Heading styles matching Gmail */
      h1 {
        font-size: 24px !important;
        font-weight: bold !important;
        margin: 0 0 0.67em 0 !important;
        padding: 0 !important;
        color: #222222 !important;
        line-height: 1.2 !important;
      }
      
      h2 {
        font-size: 20px !important;
        font-weight: bold !important;
        margin: 0 0 0.75em 0 !important;
        padding: 0 !important;
        color: #222222 !important;
        line-height: 1.2 !important;
      }
      
      h3 {
        font-size: 16px !important;
        font-weight: bold !important;
        margin: 0 0 0.83em 0 !important;
        padding: 0 !important;
        color: #222222 !important;
        line-height: 1.2 !important;
      }
      
      /* List styles matching Gmail */
      ul, ol {
        margin: 0 0 1em 0 !important;
        padding-left: 30px !important;
      }
      
      li {
        margin: 0 0 0.5em 0 !important;
        padding: 0 !important;
        font-size: 14px !important;
        line-height: 1.4 !important;
        color: #222222 !important;
      }
      
      li:last-child {
        margin-bottom: 0 !important;
      }
      
      /* Link styles */
      a {
        color: #1a73e8 !important;
        text-decoration: underline !important;
      }
      
      a:hover {
        color: #1557b0 !important;
      }
      
      /* Blockquote styles */
      blockquote {
        margin: 0 0 1em 0 !important;
        padding: 0 0 0 15px !important;
        border-left: 3px solid #e0e0e0 !important;
        color: #666666 !important;
        font-style: italic !important;
      }
      
      /* Code styles */
      code {
        background-color: #f5f5f5 !important;
        padding: 2px 4px !important;
        border-radius: 3px !important;
        font-family: monospace !important;
        font-size: 13px !important;
        color: #d73a49 !important;
      }
      
      /* Image styles */
      img {
        max-width: 100% !important;
        height: auto !important;
        border: none !important;
        outline: none !important;
      }
      
      /* Strong and emphasis */
      strong, b {
        font-weight: bold !important;
        color: #222222 !important;
      }
      
      em, i {
        font-style: italic !important;
        color: #222222 !important;
      }
      
      /* Underline */
      u {
        text-decoration: underline !important;
      }
      
      /* Text alignment */
      .text-left { text-align: left !important; }
      .text-center { text-align: center !important; }
      .text-right { text-align: right !important; }
      .text-justify { text-align: justify !important; }
      
      /* Ensure proper rendering in Outlook */
      @media screen and (-webkit-min-device-pixel-ratio: 0) {
        .email-content {
          font-size: 14px !important;
          line-height: 1.4 !important;
        }
      }
    </style>
  `

  // Construct the complete HTML email
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title></title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  ${emailCSS}
</head>
<body>
  <div class="email-container">
    <div class="email-content">
      ${bodyContent}
    </div>
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
