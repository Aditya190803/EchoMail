/**
 * Type definitions for TipTap editor content
 */

/**
 * TipTap text mark (bold, italic, link, etc.)
 */
export interface TipTapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

/**
 * TipTap content node (paragraph, heading, text, etc.)
 */
export interface TipTapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  marks?: TipTapMark[];
  text?: string;
}

/**
 * TipTap document structure (root node)
 */
export interface TipTapDocument {
  type: "doc";
  content: TipTapNode[];
}

/**
 * Editor content - can be HTML string or TipTap JSON
 */
export type EditorContent = string | TipTapDocument;

/**
 * Check if content is a TipTap document
 */
export function isTipTapDocument(content: unknown): content is TipTapDocument {
  return (
    typeof content === "object" &&
    content !== null &&
    "type" in content &&
    (content as TipTapDocument).type === "doc" &&
    "content" in content &&
    Array.isArray((content as TipTapDocument).content)
  );
}
