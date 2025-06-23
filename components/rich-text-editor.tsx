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
import { cleanupEmojiImages } from "@/lib/email-formatter"
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
import { useState, useCallback } from "react"
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

  const editor = useEditor({
    extensions: [
      StarterKit,
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
    },    editorProps: {
      attributes: {
        class: "max-w-none focus:outline-none min-h-[150px] p-2 font-sans text-[14px] leading-[1.4] text-[#222222] [&_p]:my-[1em] [&_p]:leading-[1.4] [&_p]:text-[14px] [&_p]:text-[#222222] [&_h1]:my-4 [&_h1]:text-[24px] [&_h1]:leading-[1.4] [&_h1]:text-[#222222] [&_h2]:my-4 [&_h2]:text-[18px] [&_h2]:leading-[1.4] [&_h2]:text-[#222222] [&_h3]:my-4 [&_h3]:text-[16px] [&_h3]:leading-[1.4] [&_h3]:text-[#222222] [&_ul]:my-4 [&_ul]:text-[14px] [&_ul]:leading-[1.4] [&_ul]:text-[#222222] [&_ol]:my-4 [&_ol]:text-[14px] [&_ol]:leading-[1.4] [&_ol]:text-[#222222] [&_li]:my-1 [&_li]:text-[14px] [&_li]:leading-[1.4] [&_li]:text-[#222222] [&_blockquote]:my-4 [&_blockquote]:pl-4 [&_blockquote]:border-l-2 [&_blockquote]:border-[#dcdcdc] [&_blockquote]:text-[14px] [&_blockquote]:leading-[1.4] [&_blockquote]:text-[#222222] [&_a]:text-[#1a0dab] [&_a]:underline [&_code]:text-[12px] [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_strong]:text-[#222222] [&_b]:text-[#222222] [&_em]:text-[#222222] [&_i]:text-[#222222]",
        spellcheck: "true",
        style: "font-family: Arial, sans-serif; font-size: 14px; line-height: 1.4; color: #222222; word-spacing: normal; letter-spacing: normal;",
      },      handlePaste: (view, event, slice) => {
        // Handle pasted HTML content first
        const htmlData = event.clipboardData?.getData('text/html') || ''
        if (htmlData) {
          // Clean up emoji images in pasted HTML
          const cleanedHtml = cleanupEmojiImages(htmlData)
          if (cleanedHtml !== htmlData) {
            // If emojis were converted, insert the cleaned HTML
            editor?.commands.insertContent(cleanedHtml)
            return true // Prevent default paste behavior
          }
        }
        
        // Handle pasted text content with proper UTF-8 encoding
        const text = event.clipboardData?.getData('text/plain') || ''
        if (text) {
          // Normalize and sanitize pasted text
          const sanitized = text
            .normalize('NFC')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2013\u2014]/g, '-')
            .replace(/[\u2026]/g, '...')
          
          // Let the editor handle the sanitized content normally
          return false
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
    }
  }, [editor])

  const addImage = useCallback(() => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run()
      setImageUrl("")
      setIsImageDialogOpen(false)
    }
  }, [editor, imageUrl])

  if (!editor) {
    return null
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
    <div className="border rounded-lg overflow-hidden relative bg-white">
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
          <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant={editor.isActive("link") ? "default" : "ghost"}
                size="sm"
                title="Add Link"
                className={`h-6 w-6 p-0 ${editor.isActive("link") ? "bg-blue-100 text-blue-700" : ""}`}
              >
                <LinkIcon className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-sm">Add Link</DialogTitle>
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
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={addLink} disabled={!linkUrl} size="sm" className="text-xs">
                    Add Link
                  </Button>
                  <Button variant="outline" onClick={removeLink} size="sm" className="text-xs">
                    Remove Link
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
      </div>

      {/* Editor Content */}
      <div className="min-h-[150px] max-h-[300px] overflow-y-auto">
        <EditorContent editor={editor} className="prose prose-sm max-w-none text-sm" />
      </div>

      {/* Placeholder when empty */}
      {editor.isEmpty && <div className="absolute top-12 left-2 text-gray-400 pointer-events-none text-sm">{placeholder}</div>}
    </div>
  )
}
