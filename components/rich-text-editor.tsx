"use client"

import type React from "react"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TextAlign from "@tiptap/extension-text-align"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Underline from "@tiptap/extension-underline"
import TextStyle from "@tiptap/extension-text-style"
import Color from "@tiptap/extension-color"
import Highlight from "@tiptap/extension-highlight"
import Table from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import Placeholder from "@tiptap/extension-placeholder"
import Typography from "@tiptap/extension-typography"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cleanupEmojiImages } from "@/lib/email-formatter-client"
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
  Heading1,
  Heading2,
  Heading3,
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
} from "lucide-react"
import { useState, useCallback, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
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
]

const HIGHLIGHT_COLORS = [
  { name: "Yellow", color: "#fef08a" },
  { name: "Green", color: "#bbf7d0" },
  { name: "Blue", color: "#bfdbfe" },
  { name: "Purple", color: "#ddd6fe" },
  { name: "Pink", color: "#fbcfe8" },
  { name: "Orange", color: "#fed7aa" },
  { name: "Gray", color: "#e5e7eb" },
]

export function RichTextEditor({ content, onChange, placeholder = "" }: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false)
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)
  const [isHighlightPickerOpen, setIsHighlightPickerOpen] = useState(false)
  const [isHeadingMenuOpen, setIsHeadingMenuOpen] = useState(false)
  const [isTableMenuOpen, setIsTableMenuOpen] = useState(false)
  const [isAlignMenuOpen, setIsAlignMenuOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const colorPickerRef = useRef<HTMLDivElement>(null)
  const highlightPickerRef = useRef<HTMLDivElement>(null)
  const headingMenuRef = useRef<HTMLDivElement>(null)
  const tableMenuRef = useRef<HTMLDivElement>(null)
  const alignMenuRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setIsColorPickerOpen(false)
      }
      if (highlightPickerRef.current && !highlightPickerRef.current.contains(e.target as Node)) {
        setIsHighlightPickerOpen(false)
      }
      if (headingMenuRef.current && !headingMenuRef.current.contains(e.target as Node)) {
        setIsHeadingMenuOpen(false)
      }
      if (tableMenuRef.current && !tableMenuRef.current.contains(e.target as Node)) {
        setIsTableMenuOpen(false)
      }
      if (alignMenuRef.current && !alignMenuRef.current.contains(e.target as Node)) {
        setIsAlignMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Ensure we're only rendering on the client to prevent hydration issues
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Configure paragraph behavior for consistent spacing
        paragraph: {
          HTMLAttributes: {
            class: 'editor-paragraph',
          },
        },
        // Configure hard break to be more predictable
        hardBreak: {
          HTMLAttributes: {
            class: 'editor-break',
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
            class: 'code-block',
          },
        },
        // Enable blockquote from StarterKit
        blockquote: {
          HTMLAttributes: {
            class: 'blockquote',
          },
        },
        // Enable horizontal rule
        horizontalRule: {
          HTMLAttributes: {
            class: 'hr',
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
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline cursor-pointer",
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
          class: 'email-table',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: placeholder || 'Write your email content here...',
      }),
    ],
    content,
    immediatelyRender: false, // Fix SSR hydration mismatch
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "max-w-none focus:outline-none min-h-[150px] p-3 font-sans text-[14px] leading-[1.5] text-[#222222]",
        spellcheck: "true",
        style: "font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #222222; word-spacing: normal; letter-spacing: normal;",
      },
      handlePaste: (view, event) => {
        // Handle pasted HTML content
        const htmlData = event.clipboardData?.getData('text/html') || ''
        if (htmlData) {
          // Clean up emoji images in pasted HTML
          let cleanedHtml = cleanupEmojiImages(htmlData)
          
          // Preserve important formatting but clean up messy HTML
          cleanedHtml = cleanedHtml
            // Remove Word/Office specific tags
            .replace(/<o:p[^>]*>[\s\S]*?<\/o:p>/gi, '')
            .replace(/<!--\[if[^\]]*\]>[\s\S]*?<!\[endif\]-->/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/class="Mso[^"]*"/gi, '')
            // Clean up excessive whitespace between tags
            .replace(/>\s{2,}</g, '> <')
            // Keep formatting but remove excessive line breaks
            .replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>')
            .trim()
          
          // If the HTML was cleaned up, insert cleaned content
          if (cleanedHtml && cleanedHtml !== htmlData) {
            editor?.commands.insertContent(cleanedHtml, {
              parseOptions: {
                preserveWhitespace: 'full',
              },
            })
            return true // Prevent default paste behavior
          }
        }
        
        // Handle pasted text content with proper UTF-8 encoding
        const text = event.clipboardData?.getData('text/plain') || ''
        if (text && !htmlData) {
          // Normalize and sanitize pasted text
          const sanitized = text
            .normalize('NFC')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2013\u2014]/g, '-')
            .replace(/[\u2026]/g, '...')
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim()
          
          // Convert to paragraphs for better formatting
          if (sanitized.includes('\n\n')) {
            const paragraphs = sanitized.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
            editor?.commands.insertContent(paragraphs)
            return true
          }
        }
        
        return false
      },
    },
  })

  // Sync content prop with editor when it changes externally (e.g., loading draft data)
  useEffect(() => {
    if (editor && content !== undefined) {
      // Only update if the content is different from what's in the editor
      const currentContent = editor.getHTML()
      // Normalize for comparison (both empty cases)
      const isCurrentEmpty = !currentContent || currentContent === '<p></p>'
      const isNewEmpty = !content || content === '<p></p>'
      
      if (isCurrentEmpty && !isNewEmpty) {
        // Editor is empty but we have new content - set it
        editor.commands.setContent(content, false)
      } else if (content && currentContent !== content && !editor.isFocused) {
        // Content changed externally and editor is not focused - update it
        editor.commands.setContent(content, false)
      }
    }
  }, [editor, content])

  const addLink = useCallback(() => {
    if (linkUrl && editor) {
      editor.chain().focus().setLink({ href: linkUrl }).run()
      setLinkUrl("")
      setIsLinkDialogOpen(false)
    }
  }, [editor, linkUrl])

  const removeLink = useCallback(() => {
    if (editor) {
      editor.chain().focus().unsetLink().run()
      setLinkUrl("")
      setIsLinkDialogOpen(false)
    }
  }, [editor])

  // Function to handle link dialog opening
  const handleLinkDialog = useCallback(() => {
    if (editor) {
      const { href } = editor.getAttributes('link')
      if (href) {
        setLinkUrl(href)
      } else {
        setLinkUrl("")
      }
      setIsLinkDialogOpen(true)
    }
  }, [editor])

  const addImage = useCallback(() => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run()
      setImageUrl("")
      setIsImageDialogOpen(false)
    }
  }, [editor, imageUrl])

  const handleImageUpload = useCallback(async (file: File) => {
    if (file && editor) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = e.target?.result as string
        editor.chain().focus().setImage({ src: base64 }).run()
        setIsImageDialogOpen(false)
      }
      reader.readAsDataURL(file)
    }
  }, [editor])

  const setTextColor = useCallback((color: string) => {
    if (editor) {
      editor.chain().focus().setColor(color).run()
      setIsColorPickerOpen(false)
    }
  }, [editor])

  const setHighlightColor = useCallback((color: string) => {
    if (editor) {
      editor.chain().focus().toggleHighlight({ color }).run()
      setIsHighlightPickerOpen(false)
    }
  }, [editor])

  const removeHighlight = useCallback(() => {
    if (editor) {
      editor.chain().focus().unsetHighlight().run()
      setIsHighlightPickerOpen(false)
    }
  }, [editor])

  const insertTable = useCallback(() => {
    if (editor) {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
      setIsTableMenuOpen(false)
    }
  }, [editor])

  const addTableColumn = useCallback(() => {
    if (editor) {
      editor.chain().focus().addColumnAfter().run()
    }
  }, [editor])

  const addTableRow = useCallback(() => {
    if (editor) {
      editor.chain().focus().addRowAfter().run()
    }
  }, [editor])

  const deleteTable = useCallback(() => {
    if (editor) {
      editor.chain().focus().deleteTable().run()
      setIsTableMenuOpen(false)
    }
  }, [editor])
  if (!editor || !isMounted) {
    return (
      <div className="border rounded-lg overflow-hidden relative bg-white">
        <div className="border-b bg-gray-50 p-1.5">
          <div className="flex items-center gap-1 h-7">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-6 w-6 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
        <div className="min-h-[200px] p-3">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
        </div>
      </div>
    )
  }

  const ToolbarButton = ({
    onClick,
    isActive = false,
    disabled = false,
    children,
    title,
  }: {
    onClick: () => void
    isActive?: boolean
    disabled?: boolean
    children: React.ReactNode
    title: string
  }) => (
    <Button
      variant={isActive ? "default" : "ghost"}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-7 w-7 p-0 ${isActive ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "hover:bg-gray-100"}`}
    >
      {children}
    </Button>
  )

  const DropdownMenu = ({
    isOpen,
    onToggle,
    buttonContent,
    title,
    children,
    menuRef,
    isActive = false,
  }: {
    isOpen: boolean
    onToggle: () => void
    buttonContent: React.ReactNode
    title: string
    children: React.ReactNode
    menuRef: React.RefObject<HTMLDivElement>
    isActive?: boolean
  }) => (
    <div className="relative" ref={menuRef}>
      <Button
        variant={isActive ? "default" : "ghost"}
        size="sm"
        onClick={onToggle}
        title={title}
        className={`h-7 px-1.5 gap-0.5 ${isActive ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "hover:bg-gray-100"}`}
      >
        {buttonContent}
        <ChevronDown className="h-3 w-3" />
      </Button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-lg shadow-lg border p-1 min-w-[120px]">
          {children}
        </div>
      )}
    </div>
  )

  return (
    <div className="border rounded-lg overflow-hidden relative bg-white" suppressHydrationWarning>
      {/* Toolbar */}
      <div className="border-b bg-gray-50 p-1.5 overflow-x-auto">
        <div className="flex items-center gap-0.5 flex-wrap">
          {/* Heading Dropdown */}
          <DropdownMenu
            isOpen={isHeadingMenuOpen}
            onToggle={() => setIsHeadingMenuOpen(!isHeadingMenuOpen)}
            buttonContent={<Type className="h-3.5 w-3.5" />}
            title="Headings"
            menuRef={headingMenuRef as React.RefObject<HTMLDivElement>}
            isActive={editor.isActive('heading')}
          >
            <button
              className="w-full text-left px-2 py-1.5 text-xs hover:bg-gray-100 rounded flex items-center gap-2"
              onClick={() => { editor.chain().focus().setParagraph().run(); setIsHeadingMenuOpen(false) }}
            >
              <Type className="h-3.5 w-3.5" /> Normal
            </button>
            <button
              className={`w-full text-left px-2 py-1.5 text-lg font-bold hover:bg-gray-100 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-blue-50' : ''}`}
              onClick={() => { editor.chain().focus().toggleHeading({ level: 1 }).run(); setIsHeadingMenuOpen(false) }}
            >
              Heading 1
            </button>
            <button
              className={`w-full text-left px-2 py-1.5 text-base font-bold hover:bg-gray-100 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-50' : ''}`}
              onClick={() => { editor.chain().focus().toggleHeading({ level: 2 }).run(); setIsHeadingMenuOpen(false) }}
            >
              Heading 2
            </button>
            <button
              className={`w-full text-left px-2 py-1.5 text-sm font-bold hover:bg-gray-100 rounded ${editor.isActive('heading', { level: 3 }) ? 'bg-blue-50' : ''}`}
              onClick={() => { editor.chain().focus().toggleHeading({ level: 3 }).run(); setIsHeadingMenuOpen(false) }}
            >
              Heading 3
            </button>
            <button
              className={`w-full text-left px-2 py-1.5 text-xs font-bold hover:bg-gray-100 rounded ${editor.isActive('heading', { level: 4 }) ? 'bg-blue-50' : ''}`}
              onClick={() => { editor.chain().focus().toggleHeading({ level: 4 }).run(); setIsHeadingMenuOpen(false) }}
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
            menuRef={colorPickerRef as React.RefObject<HTMLDivElement>}
          >
            <div className="grid grid-cols-4 gap-1 p-1">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.color}
                  className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                  style={{ backgroundColor: c.color }}
                  onClick={() => setTextColor(c.color)}
                  title={c.name}
                />
              ))}
            </div>
          </DropdownMenu>

          {/* Highlight Color */}
          <DropdownMenu
            isOpen={isHighlightPickerOpen}
            onToggle={() => setIsHighlightPickerOpen(!isHighlightPickerOpen)}
            buttonContent={<Highlighter className="h-3.5 w-3.5" />}
            title="Highlight"
            menuRef={highlightPickerRef as React.RefObject<HTMLDivElement>}
            isActive={editor.isActive("highlight")}
          >
            <div className="grid grid-cols-4 gap-1 p-1">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.color}
                  className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                  style={{ backgroundColor: c.color }}
                  onClick={() => setHighlightColor(c.color)}
                  title={c.name}
                />
              ))}
            </div>
            <button
              className="w-full text-left px-2 py-1 text-xs hover:bg-gray-100 rounded mt-1"
              onClick={removeHighlight}
            >
              Remove Highlight
            </button>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Alignment */}
          <DropdownMenu
            isOpen={isAlignMenuOpen}
            onToggle={() => setIsAlignMenuOpen(!isAlignMenuOpen)}
            buttonContent={<AlignLeft className="h-3.5 w-3.5" />}
            title="Alignment"
            menuRef={alignMenuRef as React.RefObject<HTMLDivElement>}
          >
            <button
              className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-gray-100 rounded ${editor.isActive({ textAlign: 'left' }) ? 'bg-blue-50' : ''}`}
              onClick={() => { editor.chain().focus().setTextAlign('left').run(); setIsAlignMenuOpen(false) }}
            >
              <AlignLeft className="h-3.5 w-3.5" /> Left
            </button>
            <button
              className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-gray-100 rounded ${editor.isActive({ textAlign: 'center' }) ? 'bg-blue-50' : ''}`}
              onClick={() => { editor.chain().focus().setTextAlign('center').run(); setIsAlignMenuOpen(false) }}
            >
              <AlignCenter className="h-3.5 w-3.5" /> Center
            </button>
            <button
              className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-gray-100 rounded ${editor.isActive({ textAlign: 'right' }) ? 'bg-blue-50' : ''}`}
              onClick={() => { editor.chain().focus().setTextAlign('right').run(); setIsAlignMenuOpen(false) }}
            >
              <AlignRight className="h-3.5 w-3.5" /> Right
            </button>
            <button
              className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-gray-100 rounded ${editor.isActive({ textAlign: 'justify' }) ? 'bg-blue-50' : ''}`}
              onClick={() => { editor.chain().focus().setTextAlign('justify').run(); setIsAlignMenuOpen(false) }}
            >
              <AlignJustify className="h-3.5 w-3.5" /> Justify
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
            menuRef={tableMenuRef as React.RefObject<HTMLDivElement>}
            isActive={editor.isActive("table")}
          >
            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-gray-100 rounded"
              onClick={insertTable}
            >
              <Plus className="h-3 w-3" /> Insert Table
            </button>
            {editor.isActive("table") && (
              <>
                <button
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-gray-100 rounded"
                  onClick={addTableColumn}
                >
                  <Plus className="h-3 w-3" /> Add Column
                </button>
                <button
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-gray-100 rounded"
                  onClick={addTableRow}
                >
                  <Plus className="h-3 w-3" /> Add Row
                </button>
                <button
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded"
                  onClick={deleteTable}
                >
                  <Trash2 className="h-3 w-3" /> Delete Table
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
              <Label htmlFor="link-url" className="text-xs">URL</Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="text-xs h-8"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && linkUrl) {
                    addLink()
                  }
                  if (e.key === 'Escape') {
                    setIsLinkDialogOpen(false)
                  }
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={addLink} disabled={!linkUrl} size="sm" className="text-xs">
                {editor.isActive("link") ? "Update" : "Add"}
              </Button>
              {editor.isActive("link") && (
                <Button variant="outline" onClick={removeLink} size="sm" className="text-xs">
                  Remove
                </Button>
              )}
              <Button variant="ghost" onClick={() => setIsLinkDialogOpen(false)} size="sm" className="text-xs">
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
              <Label htmlFor="image-url" className="text-xs">Image URL</Label>
              <Input
                id="image-url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="text-xs h-8"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && imageUrl) {
                    addImage()
                  }
                }}
              />
            </div>
            <div className="text-xs text-gray-500 text-center">or</div>
            <div>
              <Label htmlFor="image-upload" className="text-xs">Upload Image</Label>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                className="text-xs h-8"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImageUpload(file)
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={addImage} disabled={!imageUrl} size="sm" className="text-xs">
                Insert
              </Button>
              <Button variant="ghost" onClick={() => setIsImageDialogOpen(false)} size="sm" className="text-xs">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Editor Content */}
      <div className="min-h-[200px] max-h-[400px] overflow-y-auto" suppressHydrationWarning>
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
          font-family: 'JetBrains Mono', monospace;
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
        .ProseMirror ul, .ProseMirror ol {
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
  )
}
