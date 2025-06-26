"use client"

import type React from "react"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TextAlign from "@tiptap/extension-text-align"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Underline from "@tiptap/extension-underline"
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
  Quote,
  Code,
  Minus,
} from "lucide-react"
import { useState, useCallback, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
}

export function RichTextEditor({ content, onChange, placeholder = "" }: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

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
      }),
      Underline,
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
      }),
    ],
    content,
    immediatelyRender: false, // Fix SSR hydration mismatch
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },    editorProps: {      attributes: {
        class: "max-w-none focus:outline-none min-h-[150px] p-2 font-sans text-[14px] leading-[1.4] text-[#222222]",
        spellcheck: "true",
        style: "font-family: Arial, sans-serif; font-size: 14px; line-height: 1.4; color: #222222; word-spacing: normal; letter-spacing: normal;",
      },
      handlePaste: (view, event, slice) => {
        // Handle pasted HTML content for emoji conversion
        const htmlData = event.clipboardData?.getData('text/html') || ''
        if (htmlData) {
          // Clean up emoji images in pasted HTML
          let cleanedHtml = cleanupEmojiImages(htmlData)
          
          // Also clean up spacing issues in the HTML
          cleanedHtml = cleanedHtml
            // Remove excessive empty paragraphs
            .replace(/<p><\/p>/gi, '')
            .replace(/<p[^>]*>\s*<\/p>/gi, '')
            .replace(/<p[^>]*>\s*<br[^>]*>\s*<\/p>/gi, '')
            // Remove multiple consecutive paragraph breaks
            .replace(/(<\/p>\s*<p[^>]*>){2,}/gi, '</p><p>')
            // Remove multiple line breaks
            .replace(/(<br\s*\/?>\s*){2,}/gi, '<br>')
            // Clean up leading/trailing empty paragraphs
            .replace(/^\s*<p[^>]*><\/p>\s*/gi, '')
            .replace(/\s*<p[^>]*><\/p>\s*$/gi, '')
            // Remove excessive whitespace between tags
            .replace(/>\s{2,}</g, '><')
            .trim()
          
          // If the HTML was cleaned up, insert cleaned content
          if (cleanedHtml !== htmlData) {
            editor?.commands.insertContent(cleanedHtml)
            return true // Prevent default paste behavior
          }
        }
        
        // Handle pasted text content with proper UTF-8 encoding and spacing cleanup
        const text = event.clipboardData?.getData('text/plain') || ''
        if (text) {
          // Normalize and sanitize pasted text, and remove excessive line breaks
          const sanitized = text
            .normalize('NFC')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2013\u2014]/g, '-')
            .replace(/[\u2026]/g, '...')
            // Remove excessive line breaks in plain text
            .replace(/\n{3,}/g, '\n\n')
            .replace(/\n\s+\n/g, '\n\n')
            .trim()
          
          // Insert the cleaned text if it was modified
          if (sanitized !== text) {
            editor?.commands.insertContent(sanitized)
            return true
          }
        }
        
        return false
      },
    },
  })

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
      // Check if there's an existing link at the current selection
      const { href } = editor.getAttributes('link')
      if (href) {
        // Pre-populate the input with existing link URL
        setLinkUrl(href)
      } else {
        // Clear the input for new links
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
  if (!editor || !isMounted) {
    return (
      <div className="border rounded-lg overflow-hidden relative bg-white">
        <div className="border-b bg-gray-50 p-1">
          <div className="flex items-center gap-0.5 min-w-[280px] h-8">
            {/* Skeleton toolbar */}
            <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="min-h-[150px] max-h-[300px] p-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
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
      className={`h-8 w-8 p-0 ${isActive ? "bg-blue-100 text-blue-700" : ""}`}
    >
      {children}
    </Button>
  )
  return (
    <div className="border rounded-lg overflow-hidden relative bg-white" suppressHydrationWarning>
      {/* Toolbar */}
      <div className="border-b bg-gray-50 p-1 overflow-x-auto">
        <div className="flex items-center gap-0.5 min-w-[280px]">
          {/* Text Formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            title="Bold"
          >
            <Bold className="h-3 w-3" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            title="Italic"
          >
            <Italic className="h-3 w-3" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive("underline")}
            title="Underline"
          >
            <UnderlineIcon className="h-3 w-3" />
          </ToolbarButton>

          <Separator orientation="vertical" className="h-4" />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            title="Bullet List"
          >
            <List className="h-3 w-3" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            title="Numbered List"
          >
            <ListOrdered className="h-3 w-3" />
          </ToolbarButton>

          <Separator orientation="vertical" className="h-4" />

          {/* Link */}
          <Button
            variant={editor.isActive("link") ? "default" : "ghost"}
            size="sm"
            title={editor.isActive("link") ? "Edit Link" : "Add Link"}
            className={`h-6 w-6 p-0 ${editor.isActive("link") ? "bg-blue-100 text-blue-700" : ""}`}
            onClick={handleLinkDialog}
          >
            <LinkIcon className="h-3 w-3" />
          </Button>

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
                  {editor.isActive("link") && (
                    <p className="text-xs text-gray-600 mt-1">
                      Current link: {editor.getAttributes('link').href}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={addLink} disabled={!linkUrl} size="sm" className="text-xs">
                    {editor.isActive("link") ? "Update Link" : "Add Link"}
                  </Button>
                  {editor.isActive("link") && (
                    <Button variant="outline" onClick={removeLink} size="sm" className="text-xs">
                      Remove Link
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => setIsLinkDialogOpen(false)} size="sm" className="text-xs">
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Undo/Redo */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo className="h-3 w-3" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo className="h-3 w-3" />
          </ToolbarButton>
        </div>
      </div>      {/* Editor Content */}
      <div className="min-h-[150px] max-h-[300px] overflow-y-auto" suppressHydrationWarning>
        <EditorContent 
          editor={editor} 
          className="[&_.ProseMirror]:outline-none [&_.ProseMirror]:p-2 [&_.ProseMirror]:min-h-[130px] [&_.ProseMirror_p]:my-3 [&_.ProseMirror_p]:leading-relaxed [&_.ProseMirror_br]:block [&_.ProseMirror_br]:my-1 [&_.ProseMirror]:text-sm [&_.ProseMirror]:leading-relaxed" 
        />
      </div>

      {/* Placeholder when empty */}
      {editor.isEmpty && <div className="absolute top-12 left-2 text-gray-400 pointer-events-none text-sm" suppressHydrationWarning>{placeholder}</div>}
    </div>
  )
}
