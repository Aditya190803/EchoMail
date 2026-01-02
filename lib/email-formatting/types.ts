/**
 * Email Formatting Types
 *
 * Core type definitions for the email formatting system.
 * This module provides type safety across all formatting functions.
 */

/**
 * Options for email formatting
 */
export interface EmailFormatterOptions {
  /** Whether to convert emoji images to Unicode text (default: true) */
  convertEmojis?: boolean;
  /** Whether to sanitize HTML by removing scripts/handlers (default: true) */
  sanitize?: boolean;
  /** Whether to apply inline styles (default: true) */
  inlineStyles?: boolean;
  /** Whether to wrap content in Gmail-style container (default: true) */
  wrapForGmail?: boolean;
  /** Whether to strip editor-specific classes (default: true) */
  stripEditorClasses?: boolean;
}

/**
 * Result from the formatting pipeline
 */
export interface FormattingResult {
  /** The formatted HTML content */
  html: string;
  /** Whether formatting was successful */
  success: boolean;
  /** Any warnings generated during formatting */
  warnings: string[];
  /** Debug information about transformations applied */
  debug?: {
    originalLength: number;
    formattedLength: number;
    emojisConverted: number;
    stylesInlined: boolean;
  };
}

/**
 * Result from HTML validation
 */
export interface ValidationResult {
  /** Whether the content is valid for email */
  isValid: boolean;
  /** List of validation errors */
  errors: string[];
  /** List of validation warnings */
  warnings: string[];
}

/**
 * Style definition for HTML elements
 */
export interface ElementStyle {
  /** CSS properties as key-value pairs */
  [property: string]: string;
}

/**
 * Map of HTML element selectors to their inline styles
 */
export interface StyleMap {
  [selector: string]: ElementStyle;
}

/**
 * Emoji mapping from name to Unicode character
 */
export interface EmojiMap {
  [name: string]: string;
}

/**
 * Default formatting options
 */
export const DEFAULT_FORMATTER_OPTIONS: Required<EmailFormatterOptions> = {
  convertEmojis: true,
  sanitize: true,
  inlineStyles: true,
  wrapForGmail: true,
  stripEditorClasses: true,
};

/**
 * Gmail wrapper styles
 */
export const GMAIL_WRAPPER_STYLES = {
  fontFamily: "Arial, sans-serif",
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#222222",
} as const;

/**
 * Common color constants used in email styling
 */
export const COLORS = {
  // Text colors
  textPrimary: "#222222",
  textSecondary: "#666666",
  textMuted: "#9ca3af",

  // Background colors
  bgCode: "#f5f5f5",
  bgCodeInline: "#f1f5f9",
  bgHighlight: "#fef08a",
  bgTableHeader: "#f3f4f6",

  // Border colors
  borderLight: "#e5e7eb",
  borderMedium: "#d1d5db",
  borderBlockquote: "#cccccc",

  // Accent colors
  link: "#2563eb",
  codeText: "#e11d48",
} as const;
