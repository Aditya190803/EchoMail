"use client";

import type React from "react";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import {
  Table,
  TableRow,
  TableCell,
  TableHeader,
} from "@tiptap/extension-table";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { convertEmojisToUnicode } from "@/lib/email-formatting/client";
import {
  Bold,
  Italic,
  UnderlineIcon,
  LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  ImageIcon,
  Undo,
  Redo,
  Type,
  Quote,
  Code,
  Minus,
  Strikethrough,
  Highlighter,
  Palette,
  TableIcon,
  Plus,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

// Common colors for text and highlight
const TEXT_COLORS = [
  { name: "Default", color: "#222222" },
  { name: "Red", color: "#dc2626" },
  { name: "Orange", color: "#ea580c" },
  { name: "Amber", color: "#d97706" },
  { name: "Yellow", color: "#ca8a04" },
  { name: "Green", color: "#16a34a" },
  { name: "Teal", color: "#0d9488" },
  { name: "Blue", color: "#2563eb" },
  { name: "Indigo", color: "#4f46e5" },
  { name: "Purple", color: "#9333ea" },
  { name: "Pink", color: "#db2777" },
  { name: "Gray", color: "#6b7280" },
];

const HIGHLIGHT_COLORS = [
  { name: "Yellow", color: "#fef08a" },
  { name: "Green", color: "#bbf7d0" },
  { name: "Blue", color: "#bfdbfe" },
  { name: "Purple", color: "#ddd6fe" },
  { name: "Pink", color: "#fbcfe8" },
  { name: "Orange", color: "#fed7aa" },
  { name: "Gray", color: "#e5e7eb" },
];

export function RichTextEditor({
  content,
  onChange,
  placeholder = "",
}: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isHighlightPickerOpen, setIsHighlightPickerOpen] = useState(false);
  const [isHeadingMenuOpen, setIsHeadingMenuOpen] = useState(false);
  const [isTableMenuOpen, setIsTableMenuOpen] = useState(false);
  const [isAlignMenuOpen, setIsAlignMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [_tableRows, _setTableRows] = useState(3);
  const [_tableCols, _setTableCols] = useState(3);
  const [hoveredCell, setHoveredCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const highlightPickerRef = useRef<HTMLDivElement>(null);
  const headingMenuRef = useRef<HTMLDivElement>(null);
  const tableMenuRef = useRef<HTMLDivElement>(null);
  const alignMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(e.target as Node)
      ) {
        setIsColorPickerOpen(false);
      }
      if (
        highlightPickerRef.current &&
        !highlightPickerRef.current.contains(e.target as Node)
      ) {
        setIsHighlightPickerOpen(false);
      }
      if (
        headingMenuRef.current &&
        !headingMenuRef.current.contains(e.target as Node)
      ) {
        setIsHeadingMenuOpen(false);
      }
      if (
        tableMenuRef.current &&
        !tableMenuRef.current.contains(e.target as Node)
      ) {
        setIsTableMenuOpen(false);
      }
      if (
        alignMenuRef.current &&
        !alignMenuRef.current.contains(e.target as Node)
      ) {
        setIsAlignMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Ensure we're only rendering on the client to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Configure paragraph behavior for consistent spacing
        paragraph: {
          HTMLAttributes: {
            class: "editor-paragraph",
          },
        },
        // Configure hard break to be more predictable
        hardBreak: {
          HTMLAttributes: {
            class: "editor-break",
          },
          keepMarks: false,
        },
        // Keep heading from StarterKit
        heading: {
          levels: [1, 2, 3, 4],
        },
        // Enable code block from StarterKit
        codeBlock: {
          HTMLAttributes: {
            class: "code-block",
          },
        },
        // Enable blockquote from StarterKit
        blockquote: {
          HTMLAttributes: {
            class: "blockquote",
          },
        },
        // Enable horizontal rule
        horizontalRule: {
          HTMLAttributes: {
            class: "hr",
          },
        },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Typography,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false, // Don't open on regular click (allows editing)
        autolink: true, // Automatically detect and convert URLs to links
        linkOnPaste: true, // Convert pasted URLs to links
        HTMLAttributes: {
          class: "text-blue-600 underline cursor-pointer",
          target: "_blank",
          rel: "noopener noreferrer nofollow",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg",
        },
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "email-table",
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: placeholder || "Write your email content here...",
      }),
    ],
    content,
    immediatelyRender: false, // Fix SSR hydration mismatch
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "max-w-none focus:outline-none min-h-[150px] p-3 font-sans text-[14px] leading-[1.5] text-[#222222]",
        spellcheck: "true",
        style:
          "font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #222222; word-spacing: normal; letter-spacing: normal;",
      },
      handlePaste: (view, event) => {
        const htmlData = event.clipboardData?.getData("text/html") || "";
        const textData = event.clipboardData?.getData("text/plain") || "";

        // Handle HTML content (from Gmail, other rich sources)
        if (htmlData) {
          // Clean up emoji images in pasted HTML, but preserve all other formatting
          let cleanedHtml = convertEmojisToUnicode(htmlData);

          // Clean up HTML while preserving formatting
          cleanedHtml = cleanedHtml
            // Remove everything before the body content (meta tags, style, head, etc.)
            .replace(/^[\s\S]*?<body[^>]*>/i, "")
            .replace(/<\/body>[\s\S]*$/i, "")
            // Remove Word/Office specific tags
            .replace(/<o:p[^>]*>[\s\S]*?<\/o:p>/gi, "")
            .replace(/<!--[\s\S]*?-->/g, "") // Remove all HTML comments
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<meta[^>]*>/gi, "")
            .replace(/class="Mso[^"]*"/gi, "")
            // Remove mso-* styles but keep other inline styles
            .replace(/mso-[^;:"]+:[^;:"]+;?/gi, "")
            // Remove Gmail-specific wrapper classes but keep the content
            .replace(/class="gmail_[^"]*"/gi, "")

            // CRITICAL: Remove Gmail's layout tables (they use tables for email layout)
            // This must happen before other processing
            .replace(/<table[^>]*>[\s\S]*?<tbody[^>]*>/gi, "")
            .replace(/<\/tbody>[\s\S]*?<\/table>/gi, "")
            .replace(/<\/?table[^>]*>/gi, "")
            .replace(/<\/?tbody[^>]*>/gi, "")
            .replace(/<\/?thead[^>]*>/gi, "")
            .replace(/<\/?tfoot[^>]*>/gi, "")
            .replace(/<\/?tr[^>]*>/gi, "")
            .replace(/<\/?td[^>]*>/gi, "")
            .replace(/<\/?th[^>]*>/gi, "")

            // IMPORTANT: Remove ALL trailing <br> tags inside divs/paragraphs BEFORE converting boundaries
            // Gmail often adds <br><br> at end of lines which would create extra newlines
            .replace(/(<br\s*\/?>\s*)+<\/div>/gi, "</div>")
            .replace(/(<br\s*\/?>\s*)+<\/p>/gi, "</p>")

            // Also handle <p><br></p> which Gmail uses for blank lines - convert to single marker
            .replace(/<p[^>]*>\s*(<br\s*\/?>\s*)+<\/p>/gi, "{{BLANK_LINE}}")

            // Convert Gmail's div-based structure to line breaks
            // Gmail wraps each line in <div>content</div>
            .replace(/<\/div>\s*<div[^>]*>/gi, "\n")
            .replace(/<div[^>]*>\s*<\/div>/gi, "\n")
            .replace(/<\/?div[^>]*>/gi, "")

            // Convert <p> tags to line breaks
            .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
            .replace(/<\/?p[^>]*>/gi, "")

            // Convert blank line markers to double newline
            .replace(/\{\{BLANK_LINE\}\}/g, "\n")

            // Convert remaining <br> to newlines (for mid-line breaks like Shift+Enter)
            .replace(/<br\s*\/?>/gi, "\n")

            // Clean up whitespace-only lines that create extra spacing
            .replace(/\n\s+\n/g, "\n\n")

            // Normalize multiple newlines - STRICT: only allow double for intentional blank lines
            .replace(/\n{2,}/g, "\n\n")
            // Remove leading/trailing newlines
            .replace(/^\n+/, "")
            .replace(/\n+$/, "")

            // Ensure links have proper attributes
            .replace(/<a\s+([^>]*href="[^"]*"[^>]*)>/gi, (match, attrs) => {
              if (!attrs.includes("target=")) {
                attrs += ' target="_blank"';
              }
              if (!attrs.includes("rel=")) {
                attrs += ' rel="noopener noreferrer nofollow"';
              }
              return `<a ${attrs}>`;
            })
            .trim();

          if (cleanedHtml) {
            // Convert newlines back to TipTap-compatible structure
            // Use insertContentAt to insert at cursor position
            const lines = cleanedHtml.split("\n");

            if (lines.length === 1) {
              // Single line - just insert the content inline
              editor?.commands.insertContent(cleanedHtml);
            } else {
              // Multiple lines - insert with proper line break handling
              // Join with hard breaks for TipTap
              const content = lines
                .map((line, index) => {
                  if (index === lines.length - 1) {
                    return line;
                  }
                  return line + "<br>";
                })
                .join("");

              editor?.commands.insertContent(content);
            }
            return true;
          }
        }

        // Handle plain text pasting (no HTML available)
        if (textData && !htmlData) {
          const sanitized = textData
            .normalize("NFC")
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2013\u2014]/g, "-")
            .replace(/[\u2026]/g, "...")
            .replace(/\r\n/g, "\n");

          const lines = sanitized.split("\n");
          const content = lines
            .map((line, index) => {
              if (index === lines.length - 1) {
                return line;
              }
              return line + "<br>";
            })
            .join("");

          editor?.commands.insertContent(content);
          return true;
        }

        return false;
      },
    },
  });

  // Sync content prop with editor when it changes externally (e.g., loading draft data)
  useEffect(() => {
    if (editor && content !== undefined) {
      // Only update if the content is different from what's in the editor
      const currentContent = editor.getHTML();
      // Normalize for comparison (both empty cases)
      const isCurrentEmpty = !currentContent || currentContent === "<p></p>";
      const isNewEmpty = !content || content === "<p></p>";

      if (isCurrentEmpty && !isNewEmpty) {
        // Editor is empty but we have new content - set it
        editor.commands.setContent(content, { emitUpdate: false });
      } else if (content && currentContent !== content && !editor.isFocused) {
        // Content changed externally and editor is not focused - update it
        editor.commands.setContent(content, { emitUpdate: false });
      }
    }
  }, [editor, content]);

  const addLink = useCallback(() => {
    if (linkUrl && editor) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl("");
      setIsLinkDialogOpen(false);
    }
  }, [editor, linkUrl]);

  const removeLink = useCallback(() => {
    if (editor) {
      editor.chain().focus().unsetLink().run();
      setLinkUrl("");
      setIsLinkDialogOpen(false);
    }
  }, [editor]);

  // Function to handle link dialog opening
  const handleLinkDialog = useCallback(() => {
    if (editor) {
      const { href } = editor.getAttributes("link");
      if (href) {
        setLinkUrl(href);
      } else {
        setLinkUrl("");
      }
      setIsLinkDialogOpen(true);
    }
  }, [editor]);

  const addImage = useCallback(() => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl("");
      setIsImageDialogOpen(false);
    }
  }, [editor, imageUrl]);

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (file && editor) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          editor.chain().focus().setImage({ src: base64 }).run();
          setIsImageDialogOpen(false);
        };
        reader.readAsDataURL(file);
      }
    },
    [editor],
  );

  const setTextColor = useCallback(
    (color: string) => {
      if (editor) {
        editor.chain().focus().setColor(color).run();
        setIsColorPickerOpen(false);
      }
    },
    [editor],
  );

  const setHighlightColor = useCallback(
    (color: string) => {
      if (editor) {
        editor.chain().focus().toggleHighlight({ color }).run();
        setIsHighlightPickerOpen(false);
      }
    },
    [editor],
  );

  const removeHighlight = useCallback(() => {
    if (editor) {
      editor.chain().focus().unsetHighlight().run();
      setIsHighlightPickerOpen(false);
    }
  }, [editor]);

  const insertTable = useCallback(
    (rows: number, cols: number) => {
      if (editor) {
        editor
          .chain()
          .focus()
          .insertTable({ rows, cols, withHeaderRow: true })
          .run();
        setIsTableMenuOpen(false);
        setHoveredCell(null);
      }
    },
    [editor],
  );

  const addTableColumn = useCallback(() => {
    if (editor) {
      editor.chain().focus().addColumnAfter().run();
    }
  }, [editor]);

  const addTableRow = useCallback(() => {
    if (editor) {
      editor.chain().focus().addRowAfter().run();
    }
  }, [editor]);

  const deleteTable = useCallback(() => {
    if (editor) {
      editor.chain().focus().deleteTable().run();
      setIsTableMenuOpen(false);
    }
  }, [editor]);
  if (!editor || !isMounted) {
    return (
      <div className="border rounded-lg overflow-hidden relative bg-white dark:bg-zinc-900">
        <div className="border-b bg-gray-50 dark:bg-zinc-800 p-1.5">
          <div className="flex items-center gap-1 h-7">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-6 w-6 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse"
              />
            ))}
          </div>
        </div>
        <div className="min-h-[200px] p-3">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  const ToolbarButton = ({
    onClick,
    isActive = false,
    disabled = false,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <Button
      variant={isActive ? "default" : "ghost"}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-7 w-7 p-0 ${isActive ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50" : "hover:bg-gray-100 dark:hover:bg-zinc-700"}`}
    >
      {children}
    </Button>
  );

  const DropdownMenu = ({
    isOpen,
    onToggle,
    buttonContent,
    title,
    children,
    menuRef,
    isActive = false,
  }: {
    isOpen: boolean;
    onToggle: () => void;
    buttonContent: React.ReactNode;
    title: string;
    children: React.ReactNode;
    menuRef: React.RefObject<HTMLDivElement | null>;
    isActive?: boolean;
  }) => (
    <div className="relative" ref={menuRef}>
      <Button
        variant={isActive ? "default" : "ghost"}
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        title={title}
        className={`h-7 px-1.5 gap-0.5 ${isActive ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50" : "hover:bg-gray-100 dark:hover:bg-zinc-700"}`}
      >
        {buttonContent}
        <ChevronDown
          className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </Button>
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 z-[100] bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-gray-200 dark:border-zinc-700 p-1.5 min-w-[140px] animate-in fade-in-0 zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div
      className="border rounded-lg overflow-visible relative bg-white dark:bg-zinc-900"
      suppressHydrationWarning
    >
      {/* Toolbar */}
      <div className="border-b bg-gray-50 dark:bg-zinc-800 p-1.5 overflow-visible">
        <div className="flex items-center gap-0.5 flex-wrap">
          {/* Heading Dropdown */}
          <DropdownMenu
            isOpen={isHeadingMenuOpen}
            onToggle={() => setIsHeadingMenuOpen(!isHeadingMenuOpen)}
            buttonContent={<Type className="h-3.5 w-3.5" />}
            title="Headings"
            menuRef={headingMenuRef}
            isActive={editor.isActive("heading")}
          >
            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 rounded flex items-center gap-2 transition-colors"
              onClick={() => {
                editor.chain().focus().setParagraph().run();
                setIsHeadingMenuOpen(false);
              }}
            >
              <Type className="h-4 w-4" /> Normal Text
            </button>
            <button
              className={`w-full text-left px-3 py-2 text-lg font-bold hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors ${editor.isActive("heading", { level: 1 }) ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : ""}`}
              onClick={() => {
                editor.chain().focus().toggleHeading({ level: 1 }).run();
                setIsHeadingMenuOpen(false);
              }}
            >
              Heading 1
            </button>
            <button
              className={`w-full text-left px-3 py-2 text-base font-bold hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors ${editor.isActive("heading", { level: 2 }) ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : ""}`}
              onClick={() => {
                editor.chain().focus().toggleHeading({ level: 2 }).run();
                setIsHeadingMenuOpen(false);
              }}
            >
              Heading 2
            </button>
            <button
              className={`w-full text-left px-3 py-2 text-sm font-bold hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors ${editor.isActive("heading", { level: 3 }) ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : ""}`}
              onClick={() => {
                editor.chain().focus().toggleHeading({ level: 3 }).run();
                setIsHeadingMenuOpen(false);
              }}
            >
              Heading 3
            </button>
            <button
              className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors ${editor.isActive("heading", { level: 4 }) ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : ""}`}
              onClick={() => {
                editor.chain().focus().toggleHeading({ level: 4 }).run();
                setIsHeadingMenuOpen(false);
              }}
            >
              Heading 4
            </button>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Text Formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive("underline")}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive("strike")}
            title="Strikethrough"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </ToolbarButton>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Text Color */}
          <DropdownMenu
            isOpen={isColorPickerOpen}
            onToggle={() => setIsColorPickerOpen(!isColorPickerOpen)}
            buttonContent={<Palette className="h-3.5 w-3.5" />}
            title="Text Color"
            menuRef={colorPickerRef}
          >
            <div className="p-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
                Text Color
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.color}
                    className="w-7 h-7 rounded-md border border-gray-200 dark:border-zinc-600 hover:scale-110 hover:shadow-md transition-all duration-150"
                    style={{ backgroundColor: c.color }}
                    onClick={() => setTextColor(c.color)}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </DropdownMenu>

          {/* Highlight Color */}
          <DropdownMenu
            isOpen={isHighlightPickerOpen}
            onToggle={() => setIsHighlightPickerOpen(!isHighlightPickerOpen)}
            buttonContent={<Highlighter className="h-3.5 w-3.5" />}
            title="Highlight"
            menuRef={highlightPickerRef}
            isActive={editor.isActive("highlight")}
          >
            <div className="p-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
                Highlight Color
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.color}
                    className="w-7 h-7 rounded-md border border-gray-200 dark:border-zinc-600 hover:scale-110 hover:shadow-md transition-all duration-150"
                    style={{ backgroundColor: c.color }}
                    onClick={() => setHighlightColor(c.color)}
                    title={c.name}
                  />
                ))}
              </div>
              <button
                className="w-full text-left px-2 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-zinc-700 rounded mt-2 text-gray-600 dark:text-gray-300 transition-colors"
                onClick={removeHighlight}
              >
                ✕ Remove Highlight
              </button>
            </div>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Alignment */}
          <DropdownMenu
            isOpen={isAlignMenuOpen}
            onToggle={() => setIsAlignMenuOpen(!isAlignMenuOpen)}
            buttonContent={<AlignLeft className="h-3.5 w-3.5" />}
            title="Alignment"
            menuRef={alignMenuRef}
          >
            <button
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors ${editor.isActive({ textAlign: "left" }) ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : ""}`}
              onClick={() => {
                editor.chain().focus().setTextAlign("left").run();
                setIsAlignMenuOpen(false);
              }}
            >
              <AlignLeft className="h-4 w-4" /> Align Left
            </button>
            <button
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors ${editor.isActive({ textAlign: "center" }) ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : ""}`}
              onClick={() => {
                editor.chain().focus().setTextAlign("center").run();
                setIsAlignMenuOpen(false);
              }}
            >
              <AlignCenter className="h-4 w-4" /> Center
            </button>
            <button
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors ${editor.isActive({ textAlign: "right" }) ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : ""}`}
              onClick={() => {
                editor.chain().focus().setTextAlign("right").run();
                setIsAlignMenuOpen(false);
              }}
            >
              <AlignRight className="h-4 w-4" /> Align Right
            </button>
            <button
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors ${editor.isActive({ textAlign: "justify" }) ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : ""}`}
              onClick={() => {
                editor.chain().focus().setTextAlign("justify").run();
                setIsAlignMenuOpen(false);
              }}
            >
              <AlignJustify className="h-4 w-4" /> Justify
            </button>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            title="Bullet List"
          >
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            title="Numbered List"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarButton>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Block Elements */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive("blockquote")}
            title="Quote"
          >
            <Quote className="h-3.5 w-3.5" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive("codeBlock")}
            title="Code Block"
          >
            <Code className="h-3.5 w-3.5" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Rule"
          >
            <Minus className="h-3.5 w-3.5" />
          </ToolbarButton>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Table */}
          <DropdownMenu
            isOpen={isTableMenuOpen}
            onToggle={() => setIsTableMenuOpen(!isTableMenuOpen)}
            buttonContent={<TableIcon className="h-3.5 w-3.5" />}
            title="Table"
            menuRef={tableMenuRef}
            isActive={editor.isActive("table")}
          >
            {!editor.isActive("table") ? (
              <div className="p-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
                  Insert Table
                </p>
                <div className="grid grid-cols-6 gap-0.5 mb-2">
                  {Array.from({ length: 6 }).map((_, rowIndex) =>
                    Array.from({ length: 6 }).map((_, colIndex) => (
                      <button
                        key={`${rowIndex}-${colIndex}`}
                        className={`w-5 h-5 border rounded-sm transition-colors ${
                          hoveredCell &&
                          rowIndex <= hoveredCell.row &&
                          colIndex <= hoveredCell.col
                            ? "bg-blue-500 border-blue-600"
                            : "bg-gray-100 dark:bg-zinc-700 border-gray-300 dark:border-zinc-600 hover:bg-gray-200 dark:hover:bg-zinc-600"
                        }`}
                        onMouseEnter={() =>
                          setHoveredCell({ row: rowIndex, col: colIndex })
                        }
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => insertTable(rowIndex + 1, colIndex + 1)}
                        title={`${rowIndex + 1} × ${colIndex + 1}`}
                      />
                    )),
                  )}
                </div>
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                  {hoveredCell
                    ? `${hoveredCell.row + 1} × ${hoveredCell.col + 1}`
                    : "Select size"}
                </p>
              </div>
            ) : (
              <>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors"
                  onClick={addTableColumn}
                >
                  <Plus className="h-4 w-4" /> Add Column
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors"
                  onClick={addTableRow}
                >
                  <Plus className="h-4 w-4" /> Add Row
                </button>
                <div className="border-t border-gray-200 dark:border-zinc-600 my-1" />
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  onClick={deleteTable}
                >
                  <Trash2 className="h-4 w-4" /> Delete Table
                </button>
              </>
            )}
          </DropdownMenu>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Link */}
          <ToolbarButton
            onClick={handleLinkDialog}
            isActive={editor.isActive("link")}
            title={editor.isActive("link") ? "Edit Link" : "Add Link"}
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </ToolbarButton>

          {/* Image */}
          <ToolbarButton
            onClick={() => setIsImageDialogOpen(true)}
            title="Insert Image"
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </ToolbarButton>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Undo/Redo */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo (Ctrl+Z)"
          >
            <Undo className="h-3.5 w-3.5" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo (Ctrl+Y)"
          >
            <Redo className="h-3.5 w-3.5" />
          </ToolbarButton>
        </div>
      </div>

      {/* Link Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editor.isActive("link") ? "Edit Link" : "Add Link"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="link-url" className="text-xs">
                URL
              </Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="text-xs h-8"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && linkUrl) {
                    addLink();
                  }
                  if (e.key === "Escape") {
                    setIsLinkDialogOpen(false);
                  }
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={addLink}
                disabled={!linkUrl}
                size="sm"
                className="text-xs"
              >
                {editor.isActive("link") ? "Update" : "Add"}
              </Button>
              {editor.isActive("link") && (
                <Button
                  variant="outline"
                  onClick={removeLink}
                  size="sm"
                  className="text-xs"
                >
                  Remove
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => setIsLinkDialogOpen(false)}
                size="sm"
                className="text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Insert Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="image-url" className="text-xs">
                Image URL
              </Label>
              <Input
                id="image-url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="text-xs h-8"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && imageUrl) {
                    addImage();
                  }
                }}
              />
            </div>
            <div className="text-xs text-gray-500 text-center">or</div>
            <div>
              <Label htmlFor="image-upload" className="text-xs">
                Upload Image
              </Label>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                className="text-xs h-8"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={addImage}
                disabled={!imageUrl}
                size="sm"
                className="text-xs"
              >
                Insert
              </Button>
              <Button
                variant="ghost"
                onClick={() => setIsImageDialogOpen(false)}
                size="sm"
                className="text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Editor Content */}
      <div
        className="min-h-[200px] max-h-[400px] overflow-y-auto"
        suppressHydrationWarning
      >
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:p-3 [&_.ProseMirror]:min-h-[180px]"
        />
      </div>

      {/* Editor Styles */}
      <style jsx global>{`
        .ProseMirror p {
          margin: 0.5em 0;
        }
        .ProseMirror h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 0.67em 0;
        }
        .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 0.75em 0;
        }
        .ProseMirror h3 {
          font-size: 1.17em;
          font-weight: bold;
          margin: 0.83em 0;
        }
        .ProseMirror h4 {
          font-size: 1em;
          font-weight: bold;
          margin: 1em 0;
        }
        .ProseMirror blockquote {
          border-left: 3px solid #ccc;
          margin: 1em 0;
          padding-left: 1em;
          color: #666;
          font-style: italic;
        }
        .ProseMirror pre {
          background: #1e1e1e;
          color: #d4d4d4;
          font-family: "JetBrains Mono", monospace;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1em 0;
        }
        .ProseMirror code {
          background: #f1f5f9;
          color: #e11d48;
          padding: 0.2em 0.4em;
          border-radius: 0.25rem;
          font-family: monospace;
          font-size: 0.9em;
        }
        .ProseMirror pre code {
          background: none;
          color: inherit;
          padding: 0;
        }
        .ProseMirror hr {
          border: none;
          border-top: 2px solid #e5e7eb;
          margin: 1.5em 0;
        }
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .ProseMirror ul {
          list-style-type: disc;
        }
        .ProseMirror ol {
          list-style-type: decimal;
        }
        .ProseMirror ul ul {
          list-style-type: circle;
        }
        .ProseMirror ul ul ul {
          list-style-type: square;
        }
        .ProseMirror li {
          margin: 0.25em 0;
        }
        .ProseMirror table {
          border-collapse: collapse;
          margin: 1em 0;
          overflow: hidden;
          width: 100%;
        }
        .ProseMirror table td,
        .ProseMirror table th {
          border: 1px solid #d1d5db;
          padding: 0.5em;
          position: relative;
          vertical-align: top;
          min-width: 100px;
        }
        .ProseMirror table th {
          background: #f3f4f6;
          font-weight: bold;
        }
        .ProseMirror table .selectedCell {
          background: #dbeafe;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          margin: 0.5em 0;
        }
        .ProseMirror a {
          color: #2563eb;
          text-decoration: underline;
          cursor: pointer;
        }
        .ProseMirror mark {
          background-color: #fef08a;
          border-radius: 0.25em;
          padding: 0.1em 0.2em;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          position: absolute;
          height: 0;
        }
      `}</style>
    </div>
  );
}
