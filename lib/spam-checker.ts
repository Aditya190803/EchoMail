/**
 * Spam Score Checker
 *
 * Analyzes email content for potential spam indicators
 * before sending to improve deliverability.
 */

/**
 * Spam check result
 */
export interface SpamCheckResult {
  score: number; // 0-100, higher = more likely spam
  level: "low" | "medium" | "high" | "critical";
  issues: SpamIssue[];
  suggestions: string[];
  passedChecks: string[];
}

/**
 * Individual spam issue
 */
export interface SpamIssue {
  type: string;
  severity: "info" | "warning" | "error";
  description: string;
  location?: string;
}

/**
 * Spam patterns to check
 */
const SPAM_PATTERNS = {
  // Excessive capitalization
  excessiveCaps: /[A-Z]{5,}/g,

  // Multiple exclamation marks
  excessiveExclamation: /!{2,}/g,

  // Common spam phrases
  spamPhrases: [
    /\bfree\s+money\b/i,
    /\bact\s+now\b/i,
    /\blimited\s+time\s+offer\b/i,
    /\bcongratulations?\s+you('ve)?\s+(won|been\s+selected)\b/i,
    /\bclick\s+here\s+to\s+claim\b/i,
    /\b100%\s+free\b/i,
    /\bmake\s+money\s+fast\b/i,
    /\bno\s+obligation\b/i,
    /\brisk\s+free\b/i,
    /\bunsubscribe\b/i,
    /\bthis\s+is\s+not\s+spam\b/i,
    /\bdouble\s+your\s+money\b/i,
    /\bearn\s+extra\s+cash\b/i,
    /\bwork\s+from\s+home\b/i,
    /\bweight\s+loss\b/i,
    /\bviagra|cialis|pharmacy\b/i,
    /\bprince|nigerian?\b/i,
    /\binheritance\b/i,
  ],

  // Suspicious URLs
  suspiciousUrls: [/bit\.ly/i, /tinyurl/i, /goo\.gl/i, /t\.co/i],

  // Urgency words
  urgencyWords: [
    /\burgent\b/i,
    /\bimmediately\b/i,
    /\bexpires?\s+(today|soon|now)\b/i,
    /\blast\s+chance\b/i,
    /\bdon't\s+miss\b/i,
    /\bfinal\s+(notice|warning)\b/i,
  ],

  // Money-related spam
  moneySpam: [
    /\$\d{3,}/g, // Large dollar amounts
    /\bcash\s+prize\b/i,
    /\bmillion\s+dollars?\b/i,
  ],

  // Hidden text indicators
  hiddenText: [
    /font-size:\s*0/i,
    /display:\s*none/i,
    /visibility:\s*hidden/i,
    /color:\s*#fff\s*;.*background:\s*#fff/i,
  ],
};

/**
 * Subject line spam patterns
 */
const SUBJECT_SPAM_PATTERNS = [
  /^RE:\s*RE:/i, // Fake reply chain
  /^FW:\s*FW:/i, // Fake forward chain
  /^\[.*URGENT.*\]/i,
  /^!!!+/,
  /\$\$\$+/,
];

/**
 * Check email content for spam indicators
 */
export function checkSpamScore(
  subject: string,
  htmlContent: string,
  textContent?: string,
): SpamCheckResult {
  const issues: SpamIssue[] = [];
  const passedChecks: string[] = [];
  let score = 0;

  // Extract text from HTML for analysis
  const text = textContent || extractTextFromHtml(htmlContent);

  // ===== Subject Line Checks =====

  // Check subject length
  if (subject.length > 100) {
    issues.push({
      type: "subject_length",
      severity: "warning",
      description: "Subject line is too long (over 100 characters)",
    });
    score += 10;
  } else if (subject.length < 5) {
    issues.push({
      type: "subject_length",
      severity: "warning",
      description: "Subject line is too short",
    });
    score += 5;
  } else {
    passedChecks.push("Subject length is appropriate");
  }

  // Check for all caps in subject
  if (subject === subject.toUpperCase() && subject.length > 5) {
    issues.push({
      type: "subject_caps",
      severity: "error",
      description: "Subject line is all capitals",
    });
    score += 20;
  } else {
    passedChecks.push("Subject is not all capitals");
  }

  // Check subject spam patterns
  for (const pattern of SUBJECT_SPAM_PATTERNS) {
    if (pattern.test(subject)) {
      issues.push({
        type: "subject_spam_pattern",
        severity: "error",
        description: `Subject contains spam-like pattern: ${pattern.source}`,
      });
      score += 15;
    }
  }

  // ===== Content Checks =====

  // Check excessive capitalization
  const capsMatches = text.match(SPAM_PATTERNS.excessiveCaps) || [];
  if (capsMatches.length > 3) {
    issues.push({
      type: "excessive_caps",
      severity: "warning",
      description: `Content contains ${capsMatches.length} instances of excessive capitalization`,
    });
    score += capsMatches.length * 2;
  } else {
    passedChecks.push("No excessive capitalization");
  }

  // Check excessive exclamation marks
  const exclamationMatches =
    text.match(SPAM_PATTERNS.excessiveExclamation) || [];
  if (exclamationMatches.length > 2) {
    issues.push({
      type: "excessive_exclamation",
      severity: "warning",
      description: `Content contains ${exclamationMatches.length} instances of multiple exclamation marks`,
    });
    score += exclamationMatches.length * 3;
  } else {
    passedChecks.push("Punctuation is appropriate");
  }

  // Check spam phrases
  for (const pattern of SPAM_PATTERNS.spamPhrases) {
    if (pattern.test(text)) {
      issues.push({
        type: "spam_phrase",
        severity: "error",
        description: `Content contains spam phrase: "${pattern.source}"`,
      });
      score += 15;
    }
  }

  // Check urgency words
  let urgencyCount = 0;
  for (const pattern of SPAM_PATTERNS.urgencyWords) {
    if (pattern.test(text)) {
      urgencyCount++;
    }
  }
  if (urgencyCount > 2) {
    issues.push({
      type: "urgency_overuse",
      severity: "warning",
      description: `Content uses ${urgencyCount} urgency-related phrases`,
    });
    score += urgencyCount * 5;
  } else {
    passedChecks.push("Appropriate use of urgency language");
  }

  // Check suspicious URLs
  for (const pattern of SPAM_PATTERNS.suspiciousUrls) {
    if (pattern.test(htmlContent)) {
      issues.push({
        type: "suspicious_url",
        severity: "warning",
        description: "Content contains URL shortener links",
        location: "Links",
      });
      score += 10;
    }
  }

  // Check hidden text
  for (const pattern of SPAM_PATTERNS.hiddenText) {
    if (pattern.test(htmlContent)) {
      issues.push({
        type: "hidden_text",
        severity: "error",
        description: "Content may contain hidden text (spam technique)",
      });
      score += 25;
    }
  }

  // Check image to text ratio
  const imageCount = (htmlContent.match(/<img/gi) || []).length;
  const textLength = text.length;
  if (imageCount > 0 && textLength < 100) {
    issues.push({
      type: "low_text_ratio",
      severity: "warning",
      description: "Email has too many images compared to text",
    });
    score += 15;
  } else {
    passedChecks.push("Good text-to-image ratio");
  }

  // Check for missing unsubscribe link (for marketing emails)
  if (!htmlContent.includes("unsubscribe") && text.length > 500) {
    issues.push({
      type: "missing_unsubscribe",
      severity: "info",
      description: "Consider adding an unsubscribe link for marketing emails",
    });
    score += 5;
  }

  // Check for personalization
  if (!text.includes("{{") && text.length > 200) {
    issues.push({
      type: "no_personalization",
      severity: "info",
      description: "Consider adding personalization to improve engagement",
    });
  } else {
    passedChecks.push("Email includes personalization");
  }

  // Normalize score to 0-100
  score = Math.min(100, score);

  // Determine level
  let level: SpamCheckResult["level"];
  if (score < 20) {
    level = "low";
  } else if (score < 40) {
    level = "medium";
  } else if (score < 70) {
    level = "high";
  } else {
    level = "critical";
  }

  // Generate suggestions
  const suggestions = generateSuggestions(issues);

  return {
    score,
    level,
    issues,
    suggestions,
    passedChecks,
  };
}

/**
 * Generate suggestions based on issues
 */
function generateSuggestions(issues: SpamIssue[]): string[] {
  const suggestions: string[] = [];
  const types = new Set(issues.map((i) => i.type));

  if (types.has("subject_caps") || types.has("excessive_caps")) {
    suggestions.push("Use proper capitalization - avoid all caps");
  }

  if (types.has("subject_length")) {
    suggestions.push(
      "Keep subject lines between 30-60 characters for best results",
    );
  }

  if (types.has("spam_phrase")) {
    suggestions.push("Remove or rephrase spam trigger words and phrases");
  }

  if (types.has("urgency_overuse")) {
    suggestions.push("Reduce use of urgency-related language");
  }

  if (types.has("suspicious_url")) {
    suggestions.push("Use full URLs instead of URL shorteners");
  }

  if (types.has("low_text_ratio")) {
    suggestions.push("Add more text content relative to images");
  }

  if (types.has("missing_unsubscribe")) {
    suggestions.push("Add an unsubscribe link for compliance and trust");
  }

  if (types.has("excessive_exclamation")) {
    suggestions.push("Use exclamation marks sparingly");
  }

  return suggestions;
}

/**
 * Extract text from HTML content
 */
function extractTextFromHtml(html: string): string {
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, " ");

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");

  // Normalize whitespace
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * Quick check if email is likely to be marked as spam
 */
export function isLikelySpam(subject: string, htmlContent: string): boolean {
  const result = checkSpamScore(subject, htmlContent);
  return result.level === "high" || result.level === "critical";
}

/**
 * Get spam score badge color
 */
export function getSpamScoreColor(score: number): string {
  if (score < 20) {
    return "text-green-500";
  }
  if (score < 40) {
    return "text-yellow-500";
  }
  if (score < 70) {
    return "text-orange-500";
  }
  return "text-red-500";
}
