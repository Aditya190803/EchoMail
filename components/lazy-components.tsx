"use client";

/**
 * Lazy Loading Component Wrappers
 *
 * These dynamic imports enable code splitting for heavy components
 * to improve initial page load performance.
 */

import dynamic from "next/dynamic";

import { Loader2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

// Loading placeholder for RichTextEditor
const RichTextEditorSkeleton = () => (
  <div className="space-y-2">
    {/* Toolbar skeleton */}
    <Skeleton className="h-10 w-full rounded-md" />
    {/* Editor area skeleton */}
    <Skeleton className="h-48 w-full rounded-md" />
  </div>
);

// Loading placeholder for EmailPreview
const EmailPreviewSkeleton = () => (
  <div className="flex items-center justify-center p-8">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Loading preview...</span>
    </div>
  </div>
);

// Loading placeholder for EmailClientPreview
const EmailClientPreviewSkeleton = () => (
  <div className="flex items-center justify-center p-8">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <span className="text-sm text-muted-foreground">
        Loading email client preview...
      </span>
    </div>
  </div>
);

/**
 * Lazily loaded RichTextEditor
 *
 * This reduces initial bundle size by ~150KB (TipTap + extensions)
 * Only loaded when the component is actually needed.
 */
export const LazyRichTextEditor = dynamic(
  () =>
    import("@/components/rich-text-editor").then((mod) => mod.RichTextEditor),
  {
    loading: () => <RichTextEditorSkeleton />,
    ssr: false, // Disable SSR for editor (requires DOM)
  },
);

/**
 * Lazily loaded EmailPreview
 *
 * Loaded on-demand when user requests email preview.
 */
export const LazyEmailPreview = dynamic(
  () => import("@/components/email-preview").then((mod) => mod.EmailPreview),
  {
    loading: () => <EmailPreviewSkeleton />,
    ssr: false,
  },
);

/**
 * Lazily loaded EmailClientPreview
 *
 * Heavy component with multiple device/client previews.
 */
export const LazyEmailClientPreview = dynamic(
  () =>
    import("@/components/email-client-preview").then(
      (mod) => mod.EmailClientPreview,
    ),
  {
    loading: () => <EmailClientPreviewSkeleton />,
    ssr: false,
  },
);

/**
 * Lazily loaded CSVUpload
 *
 * CSV parsing library is only loaded when needed.
 */
export const LazyCSVUpload = dynamic(
  () => import("@/components/csv-upload").then((mod) => mod.CSVUpload),
  {
    loading: () => <Skeleton className="h-32 w-full rounded-md" />,
    ssr: false,
  },
);

/**
 * Lazily loaded KeyboardShortcutsModal
 */
export const LazyKeyboardShortcutsModal = dynamic(
  () =>
    import("@/components/keyboard-shortcuts-modal").then(
      (mod) => mod.KeyboardShortcutsModal,
    ),
  {
    loading: () => null,
    ssr: false,
  },
);
