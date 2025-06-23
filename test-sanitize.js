// Test sanitization function in isolation
function sanitizeEmailHTML(htmlContent) {
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
    .replace(/<img[^>]*class="[^"]*emoji[^"]*"[^>]*>/gi, '')    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove dangerous attributes but keep formatting (be more specific)
    .replace(/\s(on\w+)=["'][^"']*["']/gi, '') // Remove onXXX event handlers
    .replace(/\sjavascript:[^"\s>]*/gi, '') // Remove javascript: URLs
    // Clean up excessive whitespace but preserve line structure
    .replace(/[ \t]+/g, ' ') // Only collapse spaces and tabs, not newlines
    .replace(/\n\s*\n\s*\n+/g, '\n\n') // Collapse multiple newlines to max 2
    .trim();
    
  return sanitized;
}

const testInput = "<p>The Best of MASCC conference serves as a focused platform for healthcare professionals, researchers, and experts to exchange ideas, showcase innovations, and elevate standards of care in oncology support. With a strong foundation in evidence-based practice and compassionate care, this event continues to foster meaningful dialogue and collaboration across the community.</p>";

console.log("Input:", testInput);
console.log("Input length:", testInput.length);

const output = sanitizeEmailHTML(testInput);
console.log("Output:", output);
console.log("Output length:", output.length);
console.log("Contains full text:", output.includes('across the community'));
