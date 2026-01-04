"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import {
  Send,
  Paperclip,
  Upload,
  X,
  Users,
  FileSpreadsheet,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Save,
  Trash2,
  RefreshCw,
  FileText,
  Tag,
  Pen,
  FileCode,
  StopCircle,
  Play,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  User,
  History,
  Sparkles,
  Loader2,
  Monitor,
  Smartphone,
  Settings,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import {
  LazyRichTextEditor,
  LazyCSVUpload,
  LazyEmailClientPreview,
} from "@/components/lazy-components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBeforeUnload } from "@/hooks/useBeforeUnload";
import { useEmailSend } from "@/hooks/useEmailSend";
import { generateCampaignId } from "@/lib/analytics";
import {
  contactsService,
  campaignsService,
  templatesService,
  contactGroupsService,
  draftEmailsService,
  signaturesService,
  unsubscribesService,
  type EmailTemplate,
  type ContactGroup,
  type EmailSignature,
} from "@/lib/appwrite";
import { detectPdfColumn, isPdfUrl } from "@/lib/attachment-fetcher";
import { componentLogger } from "@/lib/client-logger";
import { CSRF_HEADER_NAME, CSRF_TOKEN_NAME } from "@/lib/constants";
import { getEmailPreview } from "@/lib/email-formatting/client";
import { getCookie } from "@/lib/utils";
import type { CSVRow } from "@/types/email";

// Draft storage key
const DRAFT_STORAGE_KEY = "echomail_draft";

// File size threshold for immediate Appwrite upload (5MB)
const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024;

// Auto-save delay in ms
const AUTO_SAVE_DELAY = 2000;

// Draft sync status
type DraftSyncStatus = "idle" | "saving" | "saved" | "error";

interface EmailDraft {
  subject: string;
  content: string;
  recipients: string[];
  attachments: any[];
  savedAt: string;
}

interface Contact {
  $id: string;
  email: string;
  name?: string;
}

export function ComposeForm() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Form state
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPreparingSend, setIsPreparingSend] = useState(false);

  // Editing draft email state
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);

  // Manual email entry state
  const [manualEmail, setManualEmail] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualEntries, setManualEntries] = useState<
    { email: string; name: string }[]
  >([]);

  // Draft state (toggle to save as draft instead of sending immediately)
  const [saveAsDraft, setSaveAsDraft] = useState(false);

  // Marketing vs Transactional state
  const [isMarketing, setIsMarketing] = useState(false);

  // Tracking state
  const [trackingEnabled, _setTrackingEnabled] = useState(true);

  // Signature state
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [selectedSignature, setSelectedSignature] = useState<string | null>(
    null,
  );
  const [_showSignatureDialog, _setShowSignatureDialog] = useState(false);

  // HTML import state
  const [showHtmlImport, setShowHtmlImport] = useState(false);
  const [htmlImportCode, setHtmlImportCode] = useState("");

  // UI state
  const [activeTab, setActiveTab] = useState("recipients");
  const [_showPreview, _setShowPreview] = useState(false);
  const [showSendingDialog, setShowSendingDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [showDraftRecoveryDialog, setShowDraftRecoveryDialog] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<EmailDraft | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(
    new Set(),
  );
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

  // CSV data
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);

  // PDF attachment column (for personalized certificates)
  const [pdfColumn, setPdfColumn] = useState<string | null>(null);
  const [showPersonalizedAttachments, setShowPersonalizedAttachments] =
    useState(false);

  // Sync toggle with pdfColumn state
  useEffect(() => {
    if (pdfColumn) {
      setShowPersonalizedAttachments(true);
    }
  }, [pdfColumn]);

  // Set marketing mode based on A/B testing or content
  useEffect(() => {
    const abTestId = searchParams.get("abTestId");
    if (abTestId) {
      setIsMarketing(true);
    }
  }, [searchParams]);

  // Preview state
  const [previewRecipientIndex, setPreviewRecipientIndex] = useState(0);
  const [formattedPreviewHtml, setFormattedPreviewHtml] = useState<string>("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">(
    "desktop",
  );
  const [showClientPreview, setShowClientPreview] = useState(false);

  // Personalized attachment metadata state
  interface AttachmentMetadata {
    fileName: string;
    fileSize: number | null;
    fileType:
      | "pdf"
      | "image"
      | "document"
      | "spreadsheet"
      | "presentation"
      | "other";
    contentType?: string;
    source: "google-drive" | "onedrive" | "dropbox" | "direct";
    accessible: boolean;
    originalUrl: string;
  }
  const [personalizedAttachmentMetadata, setPersonalizedAttachmentMetadata] =
    useState<{
      [email: string]: AttachmentMetadata | null;
    }>({});
  const [isLoadingAttachmentMetadata, setIsLoadingAttachmentMetadata] =
    useState(false);
  const [showAttachmentPreview, setShowAttachmentPreview] = useState(false);
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<
    string | null
  >(null);

  // Draft state
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftSyncStatus, setDraftSyncStatus] =
    useState<DraftSyncStatus>("idle");
  const [_draftName, _setDraftName] = useState(""); // Custom name for the draft
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>("");

  // Email send hook
  const {
    sendEmails,
    progress,
    sendStatus,
    isLoading: isSending,
    isStopping,
    isPaused,
    isOffline,
    error: sendError,
    failedEmails,
    hasPendingRetries,
    retryFailedEmails,
    stopSending,
    resumeCampaign,
    clearSavedCampaign,
    hasSavedCampaign,
    savedCampaignInfo,
    quotaInfo,
  } = useEmailSend();

  // Load template or campaign content if templateId is provided
  useEffect(() => {
    const templateId = searchParams.get("templateId");
    if (!templateId) {
      return;
    }

    const loadTemplate = async () => {
      try {
        setIsLoadingTemplates(true);
        // Try to fetch as a template first
        try {
          const template = await templatesService.get(templateId);
          setSubject(template.subject || "");
          setContent(template.content || "");
          toast.success("Template loaded!");
          return;
        } catch (_e) {
          // If not a template, try as a campaign
          try {
            const campaign = await campaignsService.get(templateId);
            setSubject(campaign.subject || "");
            setContent(campaign.content || "");
            // Also set marketing mode if it was a marketing campaign
            if (campaign.campaign_type === "marketing") {
              setIsMarketing(true);
            }
            toast.success("Campaign content loaded!");
          } catch (e2) {
            componentLogger.error(
              "Failed to load template or campaign",
              e2 instanceof Error ? e2 : undefined,
            );
            toast.error("Failed to load content");
          }
        }
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    loadTemplate();
  }, [searchParams]);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = () => {
      try {
        // First check if we're editing a draft
        const editMode = searchParams.get("edit");
        if (editMode === "draft") {
          const draftData = sessionStorage.getItem("editDraftEmail");
          if (draftData) {
            const draft = JSON.parse(draftData);
            setEditingDraftId(draft.id);
            setSubject(draft.subject || "");
            setContent(draft.content || "");
            setRecipients(draft.recipients || []);
            setSaveAsDraft(true); // Keep it as draft mode when editing

            // Handle attachments
            if (draft.attachments && draft.attachments.length > 0) {
              const parsedAttachments = draft.attachments.map((a: any) => ({
                name: a.fileName,
                type: "application/octet-stream",
                data: a.fileUrl,
                appwriteUrl: a.fileUrl,
                appwriteFileId: a.appwrite_file_id,
                fileSize: a.fileSize,
              }));
              setAttachments(parsedAttachments);
            }

            // Handle CSV data for personalization
            if (draft.csv_data) {
              try {
                const csvDataParsed =
                  typeof draft.csv_data === "string"
                    ? JSON.parse(draft.csv_data)
                    : draft.csv_data;
                if (Array.isArray(csvDataParsed) && csvDataParsed.length > 0) {
                  setCsvData(csvDataParsed);
                  // Extract headers from the first row
                  const headers = Object.keys(csvDataParsed[0]);
                  setCsvHeaders(headers);
                }
              } catch (e) {
                componentLogger.error(
                  "Error parsing csv_data",
                  e instanceof Error ? e : undefined,
                );
              }
            }

            // Restore personalized attachment settings
            if (draft.has_personalized_attachments) {
              setShowPersonalizedAttachments(true);
              if (draft.personalized_attachment_column) {
                setPdfColumn(draft.personalized_attachment_column);
              }
            }

            sessionStorage.removeItem("editDraftEmail");
            toast.success("Editing draft");
            return;
          }
        }

        // Check if there's a template from the templates page
        const templateData = sessionStorage.getItem("selectedTemplate");
        if (templateData) {
          const template = JSON.parse(templateData);
          setSubject(template.subject || "");
          setContent(template.content || "");
          sessionStorage.removeItem("selectedTemplate");
          toast.success("Template loaded!");
          return; // Don't load draft if template was selected
        }

        // Check if there's a duplicated campaign from the history page
        const duplicateCampaignData =
          sessionStorage.getItem("duplicateCampaign");
        if (duplicateCampaignData) {
          const campaign = JSON.parse(duplicateCampaignData);
          setSubject(campaign.subject || "");
          setContent(campaign.content || "");
          if (campaign.recipients && Array.isArray(campaign.recipients)) {
            setRecipients(campaign.recipients);
          }
          if (campaign.attachments && Array.isArray(campaign.attachments)) {
            setAttachments(
              campaign.attachments.map((att: any) => ({
                name: att.fileName || att.name,
                size: att.fileSize || att.size || 0,
                type: att.fileType || att.type || "application/octet-stream",
                path: att.fileUrl || att.path || "",
              })),
            );
          }
          sessionStorage.removeItem("duplicateCampaign");
          toast.success("Campaign duplicated! You can now edit and send.");
          return; // Don't load draft if duplicating campaign
        }

        const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) {
          const draft: EmailDraft = JSON.parse(saved);
          setHasDraft(true);

          // Show draft recovery dialog instead of confirm()
          setPendingDraft(draft);
          setShowDraftRecoveryDialog(true);
        }
      } catch (e) {
        componentLogger.error(
          "Error loading draft",
          e instanceof Error ? e : undefined,
        );
      }
    };

    loadDraft();
  }, [searchParams]);

  // Handle draft recovery
  const restoreDraft = useCallback((draft: EmailDraft) => {
    setSubject(draft.subject || "");
    setContent(draft.content || "");
    setRecipients(draft.recipients || []);
    setAttachments(draft.attachments || []);
    setLastSaved(new Date(draft.savedAt));
    lastSavedContentRef.current = JSON.stringify({
      subject: draft.subject,
      content: draft.content,
      recipients: draft.recipients,
      attachments: (draft.attachments || []).map((a) => a.name),
    });
    setShowDraftRecoveryDialog(false);
    setPendingDraft(null);
    toast.success("Draft restored!");
  }, []);

  // Clear draft from localStorage (defined before discardPendingDraft that uses it)
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setHasDraft(false);
      setLastSaved(null);
      setHasUnsavedChanges(false);
      lastSavedContentRef.current = "";
      setDraftSyncStatus("idle");
    } catch (e) {
      componentLogger.error(
        "Error clearing draft",
        e instanceof Error ? e : undefined,
      );
    }
  }, []);

  const discardPendingDraft = useCallback(() => {
    clearDraft();
    setShowDraftRecoveryDialog(false);
    setPendingDraft(null);
  }, [clearDraft]);

  // Create content hash for change detection
  const currentContentHash = useMemo(() => {
    return JSON.stringify({
      subject,
      content,
      recipients,
      attachments: attachments.map((a) => a.name),
    });
  }, [subject, content, recipients, attachments]);

  // Track unsaved changes
  useEffect(() => {
    if (
      lastSavedContentRef.current &&
      currentContentHash !== lastSavedContentRef.current
    ) {
      setHasUnsavedChanges(true);
      setDraftSyncStatus("idle");
    }
  }, [currentContentHash]);

  // Warn before leaving with unsaved changes
  useBeforeUnload(
    hasUnsavedChanges && (subject.length > 0 || content.length > 0),
    "You have unsaved changes. Are you sure you want to leave?",
  );

  // Auto-save draft when content changes (debounced)
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Only auto-save if there's content and changes
    if ((subject || content || recipients.length > 0) && hasUnsavedChanges) {
      setDraftSyncStatus("idle");
      autoSaveTimerRef.current = setTimeout(() => {
        saveDraft();
      }, AUTO_SAVE_DELAY);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, content, recipients, hasUnsavedChanges]);

  // Keyboard shortcuts for drafts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save draft
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveDraft();
        toast.success("Draft saved");
      }

      // Ctrl/Cmd + Shift + S to save as draft to Appwrite
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") {
        e.preventDefault();
        if (subject && content && recipients.length > 0) {
          setSaveAsDraft(true);
          // Trigger save via button click simulation
          handleSend();
        } else {
          toast.error(
            "Please fill in subject, content, and at least one recipient",
          );
        }
      }

      // Ctrl/Cmd + Enter to send
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!saveAsDraft && subject && content && recipients.length > 0) {
          handleSend();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, content, recipients, saveAsDraft]);

  // Load contacts, groups, and signatures
  useEffect(() => {
    const loadContactsGroupsAndSignatures = async () => {
      if (!session?.user?.email) {
        return;
      }

      try {
        const [contactsResponse, groupsResponse, signaturesResponse] =
          await Promise.all([
            contactsService.listByUser(session.user.email),
            contactGroupsService.listByUser(session.user.email),
            signaturesService.listByUser(session.user.email),
          ]);
        setContacts(contactsResponse.documents as any[]);
        setGroups(groupsResponse.documents);
        setSignatures(signaturesResponse.documents);

        // Set default signature if available
        const defaultSig = signaturesResponse.documents.find(
          (s) => s.is_default,
        );
        if (defaultSig) {
          setSelectedSignature(defaultSig.$id!);
        }
      } catch (error) {
        componentLogger.error(
          "Error loading contacts/groups/signatures",
          error instanceof Error ? error : undefined,
        );
      }
    };

    loadContactsGroupsAndSignatures();
  }, [session?.user?.email]);

  // Load templates
  const loadTemplates = useCallback(async () => {
    if (!session?.user?.email) {
      return;
    }

    setIsLoadingTemplates(true);
    try {
      const response = await templatesService.listByUser(session.user.email);
      setTemplates(
        response.documents.map((doc) => ({
          $id: doc.$id,
          name: (doc as any).name,
          subject: (doc as any).subject,
          content: (doc as any).content,
          category: (doc as any).category,
          user_email: (doc as any).user_email,
        })) as EmailTemplate[],
      );
    } catch (error) {
      componentLogger.error(
        "Error loading templates",
        error instanceof Error ? error : undefined,
      );
    }
    setIsLoadingTemplates(false);
  }, [session?.user?.email]);

  // Apply template to form
  const applyTemplate = (template: EmailTemplate) => {
    setSubject(template.subject);
    setContent(template.content);
    setShowTemplateDialog(false);
    toast.success(`Template "${template.name}" applied!`);
  };

  // Helper function to get time ago string
  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) {
      return "just now";
    }
    if (seconds < 3600) {
      return `${Math.floor(seconds / 60)} minutes ago`;
    }
    if (seconds < 86400) {
      return `${Math.floor(seconds / 3600)} hours ago`;
    }
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  // Save draft to localStorage with improved tracking
  const saveDraft = useCallback(() => {
    try {
      // Don't save if there's nothing to save
      if (!subject && !content && recipients.length === 0) {
        return;
      }

      setIsSavingDraft(true);
      setDraftSyncStatus("saving");

      const draft: EmailDraft = {
        subject,
        content,
        recipients,
        attachments,
        savedAt: new Date().toISOString(),
      };

      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));

      // Update tracking refs and state
      lastSavedContentRef.current = JSON.stringify({
        subject,
        content,
        recipients,
        attachments: attachments.map((a) => a.name),
      });
      setLastSaved(new Date());
      setHasDraft(true);
      setHasUnsavedChanges(false);
      setDraftSyncStatus("saved");
      setIsSavingDraft(false);

      // Reset status after 3 seconds
      setTimeout(() => {
        setDraftSyncStatus("idle");
      }, 3000);
    } catch (e) {
      componentLogger.error(
        "Error saving draft",
        e instanceof Error ? e : undefined,
      );
      setDraftSyncStatus("error");
      setIsSavingDraft(false);
    }
  }, [subject, content, recipients, attachments]);

  // Helper function to convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle file upload with background processing:
  // - Immediately show files as "processing"
  // - Small files (<5MB): Encode to base64 in background
  // - Large files (>=5MB): Upload to Appwrite in background
  // - Update state when ready
  const handleFileUpload = async (files: FileList) => {
    if (!files.length) {
      return;
    }

    // Immediately add files as "processing" state
    const processingAttachments: any[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const tempId = `temp_${Date.now()}_${i}`;
      processingAttachments.push({
        tempId,
        name: file.name,
        type: file.type || "application/octet-stream",
        data: "processing", // Will be replaced with base64 or 'appwrite'
        fileSize: file.size,
        isProcessing: true,
      });
    }

    // Add to state immediately so user sees them
    setAttachments((prev) => [...prev, ...processingAttachments]);
    setIsUploading(true);

    // Process each file in background
    const fileArray = Array.from(files);

    // Process small and large files in parallel
    const processPromises = fileArray.map(async (file, index) => {
      const tempId = processingAttachments[index].tempId;

      if (file.size < LARGE_FILE_THRESHOLD) {
        // Small file: convert to base64 in background
        try {
          componentLogger.debug(`Encoding file to base64`, { name: file.name });
          const base64 = await fileToBase64(file);
          componentLogger.debug(`Encoded file`, { name: file.name });

          // Update the attachment with the actual data
          setAttachments((prev) =>
            prev.map((a) =>
              a.tempId === tempId
                ? { ...a, data: base64, isProcessing: false, tempId: undefined }
                : a,
            ),
          );
          return { success: true, name: file.name };
        } catch (error) {
          componentLogger.error(
            `Error reading file ${file.name}`,
            error instanceof Error ? error : undefined,
          );
          // Remove failed attachment
          setAttachments((prev) => prev.filter((a) => a.tempId !== tempId));
          return { success: false, name: file.name, error };
        }
      } else {
        // Large file: upload to Appwrite in background
        try {
          componentLogger.debug(`Uploading file to Appwrite`, {
            name: file.name,
          });
          const formData = new FormData();
          formData.append("files", file);

          const csrfToken = getCookie(CSRF_TOKEN_NAME);
          const response = await fetch("/api/upload-attachment", {
            method: "POST",
            headers: {
              ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
            },
            body: formData,
          });

          const result = await response.json();

          if (result.success && result.uploads[0] && !result.uploads[0].error) {
            const upload = result.uploads[0];
            componentLogger.debug(`Uploaded file to Appwrite`, {
              name: file.name,
            });

            // Update the attachment with Appwrite info
            setAttachments((prev) =>
              prev.map((a) =>
                a.tempId === tempId
                  ? {
                      ...a,
                      data: "appwrite",
                      appwriteFileId: upload.appwrite_file_id,
                      appwriteUrl: upload.url,
                      isProcessing: false,
                      tempId: undefined,
                    }
                  : a,
              ),
            );
            return { success: true, name: file.name };
          } else {
            throw new Error(result.uploads?.[0]?.error || "Upload failed");
          }
        } catch (error) {
          componentLogger.error(
            `Error uploading file ${file.name}`,
            error instanceof Error ? error : undefined,
          );
          // Remove failed attachment
          setAttachments((prev) => prev.filter((a) => a.tempId !== tempId));
          return { success: false, name: file.name, error };
        }
      }
    });

    // Wait for all processing to complete
    const results = await Promise.all(processPromises);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    if (failCount > 0) {
      toast.error(`${failCount} file(s) failed to process`);
    }
    if (successCount > 0) {
      toast.success(`${successCount} file(s) ready`);
    }

    setIsUploading(false);
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Handle CSV data
  const handleCsvData = (data: CSVRow[]) => {
    setCsvData(data);

    // Extract headers from first row
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      setCsvHeaders(headers);

      // Auto-detect PDF/certificate column
      const detectedPdfCol = detectPdfColumn(headers);
      if (detectedPdfCol) {
        setPdfColumn(detectedPdfCol);
        setShowPersonalizedAttachments(true);
        // Verify at least one row has a valid URL
        const hasValidUrls = data.some((row) => isPdfUrl(row[detectedPdfCol]));
        if (hasValidUrls) {
          toast.success(`Detected certificate column: "${detectedPdfCol}"`, {
            description:
              "Each recipient will receive their personalized PDF attachment",
          });
        }
      } else {
        setPdfColumn(null);
      }
    }

    // Extract emails from CSV
    const emails = data
      .map((row) => row.email)
      .filter((email) => email && email.includes("@"));

    if (emails.length > 0) {
      setRecipients(emails);
      toast.success(`Found ${emails.length} recipients`);
    } else {
      toast.error("No valid emails found in CSV");
    }
  };

  // Toggle contact selection
  const toggleContact = (contactId: string, email: string) => {
    const newSelected = new Set(selectedContacts);

    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
      setRecipients(recipients.filter((r) => r !== email));
    } else {
      newSelected.add(contactId);
      if (!recipients.includes(email)) {
        setRecipients([...recipients, email]);
      }
    }

    setSelectedContacts(newSelected);
  };

  // Toggle group selection
  const toggleGroup = (groupId: string) => {
    const group = groups.find((g) => g.$id === groupId);
    if (!group) {
      return;
    }

    const newSelectedGroups = new Set(selectedGroups);
    const newSelectedContacts = new Set(selectedContacts);
    let newRecipients = [...recipients];

    // Get emails for contacts in this group
    const _groupContactEmails = contacts
      .filter((c) => group.contact_ids.includes(c.$id))
      .map((c) => c.email);

    if (newSelectedGroups.has(groupId)) {
      // Deselect group
      newSelectedGroups.delete(groupId);
      // Remove contacts that are only in this group
      group.contact_ids.forEach((contactId) => {
        const contact = contacts.find((c) => c.$id === contactId);
        if (contact) {
          const isInOtherSelectedGroup = groups.some(
            (g) =>
              g.$id !== groupId &&
              newSelectedGroups.has(g.$id!) &&
              g.contact_ids.includes(contactId),
          );
          if (!isInOtherSelectedGroup) {
            newSelectedContacts.delete(contactId);
            newRecipients = newRecipients.filter((r) => r !== contact.email);
          }
        }
      });
    } else {
      // Select group
      newSelectedGroups.add(groupId);
      // Add all contacts from this group
      group.contact_ids.forEach((contactId) => {
        const contact = contacts.find((c) => c.$id === contactId);
        if (contact) {
          newSelectedContacts.add(contactId);
          if (!newRecipients.includes(contact.email)) {
            newRecipients.push(contact.email);
          }
        }
      });
    }

    setSelectedGroups(newSelectedGroups);
    setSelectedContacts(newSelectedContacts);
    setRecipients(newRecipients);
  };

  // Add manual email entry (email + name)
  const addManualEntry = () => {
    const email = manualEmail.trim().toLowerCase();
    const name = manualName.trim();

    if (!email || !email.includes("@") || !email.includes(".")) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (recipients.includes(email)) {
      toast.error("This email is already added");
      return;
    }

    // Add to recipients
    setRecipients([...recipients, email]);

    // Add to manual entries for display
    setManualEntries([...manualEntries, { email, name }]);

    // Add to CSV data for personalization
    const data: Record<string, string> = { email };
    if (name) {
      data.name = name;
    }
    setCsvData((prev) => [...prev, data]);
    if (csvHeaders.length === 0) {
      setCsvHeaders(["email", "name"]);
    }

    // Clear inputs
    setManualEmail("");
    setManualName("");
    toast.success("Recipient added");
  };

  // Remove a recipient
  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter((r) => r !== email));
    // Also remove from manual entries
    setManualEntries((prev) => prev.filter((e) => e.email !== email));
    // Also remove from CSV data
    setCsvData((prev) => prev.filter((row) => row.email !== email));
    // Also update selected contacts if it was from contacts
    const contact = contacts.find((c) => c.email === email);
    if (contact) {
      const newSelected = new Set(selectedContacts);
      newSelected.delete(contact.$id);
      setSelectedContacts(newSelected);
    }
  };

  // Replace placeholders in text with recipient data
  const replacePlaceholders = (
    text: string,
    data: Record<string, string>,
  ): string => {
    // Support both {{placeholder}} and {placeholder} formats
    return text
      .replace(
        /\{\{(\w+)\}\}/g,
        (match, key) => data[key.toLowerCase()] || data[key] || match,
      )
      .replace(
        /\{(\w+)\}/g,
        (match, key) => data[key.toLowerCase()] || data[key] || match,
      );
  };

  // Get personalized content for a specific recipient
  const getPersonalizedContent = (recipientIndex: number) => {
    if (recipients.length === 0) {
      return {
        email: "recipient@example.com",
        subject: subject || "(No subject)",
        content: content || "<p>Your email content will appear here...</p>",
      };
    }

    const recipientEmail = recipients[recipientIndex] || recipients[0];

    // Find data for this recipient from CSV data or manual entries
    const csvRow = csvData.find((row) => row.email === recipientEmail) || {};
    const manualEntry = manualEntries.find((e) => e.email === recipientEmail);

    // Merge data sources (CSV takes precedence, then manual entry)
    const recipientData: Record<string, string> = {
      email: recipientEmail,
      name: manualEntry?.name || "",
      ...csvRow,
    };

    // Apply personalization
    const personalizedSubject = replacePlaceholders(subject, recipientData);
    const personalizedContent = replacePlaceholders(content, recipientData);

    return {
      email: recipientEmail,
      subject: personalizedSubject || "(No subject)",
      content:
        personalizedContent || "<p>Your email content will appear here...</p>",
      data: recipientData,
    };
  };

  // Load formatted preview HTML when preview tab is active
  useEffect(() => {
    const loadFormattedPreview = async () => {
      if (activeTab !== "preview") {
        return;
      }

      const preview = getPersonalizedContent(previewRecipientIndex);
      setIsLoadingPreview(true);

      try {
        const formattedHtml = await getEmailPreview(preview.content);
        // Wrap in Gmail-like preview wrapper
        const wrappedHtml = createGmailPreviewWrapper(formattedHtml);
        setFormattedPreviewHtml(wrappedHtml);
      } catch (error) {
        componentLogger.error(
          "Failed to load formatted preview",
          error instanceof Error ? error : undefined,
        );
        // Fallback to basic preview
        setFormattedPreviewHtml(createGmailPreviewWrapper(preview.content));
      }

      setIsLoadingPreview(false);
    };

    loadFormattedPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    previewRecipientIndex,
    content,
    subject,
    recipients,
    csvData,
    manualEntries,
  ]);

  // Fetch personalized attachment metadata when preview tab is active
  useEffect(() => {
    const fetchAttachmentMetadata = async () => {
      if (activeTab !== "preview" || !pdfColumn) {
        return;
      }

      const preview = getPersonalizedContent(previewRecipientIndex);
      const attachmentUrl = preview.data?.[pdfColumn];

      if (!attachmentUrl || !isPdfUrl(String(attachmentUrl))) {
        return;
      }

      // Check if we already have metadata for this recipient
      if (personalizedAttachmentMetadata[preview.email]) {
        return;
      }

      setIsLoadingAttachmentMetadata(true);

      try {
        const csrfToken = getCookie(CSRF_TOKEN_NAME);
        const response = await fetch("/api/attachment-metadata", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
          },
          body: JSON.stringify({
            url: String(attachmentUrl),
            recipientName:
              preview.data?.name ||
              preview.data?.Name ||
              preview.email.split("@")[0],
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.metadata) {
            setPersonalizedAttachmentMetadata((prev) => ({
              ...prev,
              [preview.email]: result.metadata,
            }));
          }
        }
      } catch (error) {
        componentLogger.error(
          "Failed to fetch attachment metadata",
          error instanceof Error ? error : undefined,
        );
      }

      setIsLoadingAttachmentMetadata(false);
    };

    fetchAttachmentMetadata();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, previewRecipientIndex, pdfColumn, recipients]);

  // Send emails
  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }

    if (!content.trim()) {
      toast.error("Please enter email content");
      return;
    }

    if (recipients.length === 0) {
      toast.error("Please add at least one recipient");
      return;
    }

    // Immediately show preparing state to prevent double-clicks
    setIsPreparingSend(true);

    // No date/time validation needed for drafts - saved immediately

    // Filter out unsubscribed emails - only for marketing emails, not transactional
    let filteredRecipients = recipients;
    if (isMarketing && session?.user?.email) {
      try {
        filteredRecipients = await unsubscribesService.filterUnsubscribed(
          session.user.email,
          recipients,
        );
        if (filteredRecipients.length < recipients.length) {
          const skipped = recipients.length - filteredRecipients.length;
          toast.info(`${skipped} unsubscribed email(s) will be skipped`);
        }
      } catch (error) {
        componentLogger.error(
          "Error filtering unsubscribes",
          error instanceof Error ? error : undefined,
        );
      }
    }

    // Append signature if selected
    let finalContent = content;
    if (selectedSignature) {
      const signature = signatures.find((s) => s.$id === selectedSignature);
      if (signature) {
        finalContent = `${content}<br/><br/>${signature.content}`;
      }
    }

    // Handle saving as draft
    if (saveAsDraft && session?.user?.email) {
      // Use current time for draft save timestamp
      const savedAt = new Date().toISOString();

      setIsSavingDraft(true);
      try {
        // Upload any base64 attachments to Appwrite for draft persistence
        const processedAttachments = await Promise.all(
          attachments.map(async (a) => {
            // If it's already in Appwrite, use existing reference
            if (a.appwriteFileId) {
              return {
                fileName: a.name,
                fileUrl: a.appwriteUrl || "",
                fileSize: a.fileSize || 0,
                appwrite_file_id: a.appwriteFileId,
              };
            }

            // If it has base64 data, upload to Appwrite now for draft persistence
            if (a.data && a.data !== "appwrite") {
              try {
                // Convert base64 back to blob for upload
                const byteCharacters = atob(a.data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: a.type });
                const file = new File([blob], a.name, { type: a.type });

                const formData = new FormData();
                formData.append("files", file);

                const csrfToken = getCookie(CSRF_TOKEN_NAME);
                const response = await fetch("/api/upload-attachment", {
                  method: "POST",
                  headers: {
                    ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
                  },
                  body: formData,
                });

                const result = await response.json();

                if (
                  result.success &&
                  result.uploads[0] &&
                  !result.uploads[0].error
                ) {
                  const upload = result.uploads[0];
                  return {
                    fileName: upload.fileName,
                    fileUrl: upload.url,
                    fileSize: upload.fileSize,
                    appwrite_file_id: upload.appwrite_file_id,
                  };
                }
              } catch (uploadError) {
                componentLogger.error(
                  `Error uploading attachment ${a.name} for draft`,
                  uploadError instanceof Error ? uploadError : undefined,
                );
              }
            }

            // Fallback: save reference without Appwrite (attachment may be lost)
            return {
              fileName: a.name,
              fileUrl: "",
              fileSize: a.fileSize || 0,
              appwrite_file_id: "",
            };
          }),
        );

        // Build personalization data for each recipient
        const recipientCsvData = filteredRecipients.map((recipientEmail) => {
          // Find CSV row with case-insensitive email matching
          const csvRow =
            csvData.find((row) => {
              const rowEmail = row.email || row.Email || row.EMAIL || "";
              return rowEmail.toLowerCase() === recipientEmail.toLowerCase();
            }) || {};
          const manualEntry = manualEntries.find(
            (e) => e.email.toLowerCase() === recipientEmail.toLowerCase(),
          );
          return {
            email: recipientEmail,
            name:
              manualEntry?.name ||
              csvRow.name ||
              csvRow.Name ||
              csvRow.NAME ||
              "",
            ...csvRow,
          };
        });

        const draftEmailData = {
          subject,
          content: finalContent,
          recipients: filteredRecipients,
          saved_at: savedAt,
          attachments: processedAttachments.filter((a) => a.appwrite_file_id), // Only save attachments that were uploaded
          csv_data: recipientCsvData,
          // Save personalized attachment settings
          has_personalized_attachments:
            !!pdfColumn && showPersonalizedAttachments,
          personalized_attachment_column: pdfColumn || undefined,
        };

        if (editingDraftId) {
          // Update existing draft
          await draftEmailsService.update(editingDraftId, draftEmailData);
          clearDraft();
          toast.success("Draft updated");
        } else {
          // Create new draft
          await draftEmailsService.create(draftEmailData);
          clearDraft();
          toast.success("Draft saved — send it when you're ready!");
        }

        router.push("/draft");
        return;
      } catch (error) {
        componentLogger.error(
          "Error saving draft",
          error instanceof Error ? error : undefined,
        );
        toast.error("Failed to save draft");
        return;
      } finally {
        setIsSavingDraft(false);
        setIsPreparingSend(false);
      }
    }

    setShowSendingDialog(true);
    setIsPreparingSend(false); // Reset preparing state once sending dialog is shown

    // Prepare personalized emails
    const personalizedEmails = filteredRecipients.map((email) => {
      // Find the CSV row for this recipient (case-insensitive email match)
      const csvRow =
        csvData.find((row) => {
          const rowEmail = row.email || row.Email || row.EMAIL || "";
          return rowEmail.toLowerCase() === email.toLowerCase();
        }) || {};

      // Check if there's a personalized PDF attachment for this recipient
      let personalizedAttachment = undefined;
      if (pdfColumn && csvRow[pdfColumn] && isPdfUrl(csvRow[pdfColumn])) {
        personalizedAttachment = {
          url: csvRow[pdfColumn],
          fileName: undefined, // Let the fetcher determine the filename and extension
        };
      }

      return {
        to: email,
        subject,
        message: finalContent,
        originalRowData: csvRow,
        attachments,
        personalizedAttachment,
      };
    });

    try {
      const campaignId = generateCampaignId();
      const results = await sendEmails(personalizedEmails, {
        campaignId,
        isTransactional: !isMarketing,
        trackingEnabled,
      });

      const successCount = results.filter((r) => r.status === "success").length;
      const failCount = results.filter((r) => r.status === "error").length;

      // Save campaign to Appwrite (user_email is set server-side)
      if (session?.user?.email) {
        await campaignsService.create({
          id: campaignId,
          subject,
          content,
          recipients,
          sent: successCount,
          failed: failCount,
          status: failCount === 0 ? "completed" : "completed",
          campaign_type: csvData.length > 0 ? "bulk" : "contact_list",
          attachments: attachments.map((a) => ({
            fileName: a.name,
            fileUrl: a.appwriteUrl || a.data,
            fileSize: a.fileSize || 0,
            appwrite_file_id: a.appwriteFileId,
          })),
          send_results: results.map((r) => ({
            email: r.email,
            status:
              r.status === "skipped"
                ? ("error" as const)
                : (r.status as "success" | "error"),
            error: r.error,
          })),
          // Save personalized attachment info
          has_personalized_attachments:
            !!pdfColumn && showPersonalizedAttachments,
          personalized_attachment_column: pdfColumn || undefined,
        });
      }

      // Clear draft after successful send
      clearDraft();

      toast.success(
        `Campaign complete! ${successCount} sent, ${failCount} failed`,
      );
    } catch (error) {
      componentLogger.error(
        "Send error",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to send emails");
    }
  };

  return (
    <div className="space-y-6">
      {/* Resume Campaign Banner */}
      {hasSavedCampaign && savedCampaignInfo && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-warning/10 border border-warning/30 rounded-lg">
          <div className="flex items-center gap-2 sm:gap-3">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-warning flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-xs sm:text-sm">
                Incomplete Campaign Found
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {savedCampaignInfo.subject
                  ? `"${savedCampaignInfo.subject}" - `
                  : ""}
                {savedCampaignInfo.remaining} of {savedCampaignInfo.total}{" "}
                emails remaining
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => {
                clearSavedCampaign();
                toast.success("Campaign discarded");
              }}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Discard
            </Button>
            <Button
              size="sm"
              className="text-xs h-8"
              onClick={async () => {
                setShowSendingDialog(true);
                await resumeCampaign();
              }}
            >
              <Play className="h-3 w-3 mr-1" />
              Resume
            </Button>
          </div>
        </div>
      )}

      {/* Draft Status Bar */}
      {(hasDraft || lastSaved || hasUnsavedChanges || subject || content) && (
        <div
          className={`flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 p-2 sm:p-3 rounded-lg transition-colors ${
            hasUnsavedChanges
              ? "bg-warning/10 border border-warning/30"
              : draftSyncStatus === "saved"
                ? "bg-success/10 border border-success/30"
                : "bg-muted/50"
          }`}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            {/* Sync Status Indicator */}
            {draftSyncStatus === "saving" || isSavingDraft ? (
              <>
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-primary" />
                <span className="text-muted-foreground">Saving...</span>
              </>
            ) : draftSyncStatus === "saved" ? (
              <>
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
                <span className="text-success">
                  Saved {lastSaved ? getTimeAgo(lastSaved) : ""}
                </span>
              </>
            ) : draftSyncStatus === "error" ? (
              <>
                <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                <span className="text-destructive">Failed to save</span>
              </>
            ) : hasUnsavedChanges ? (
              <>
                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-warning" />
                <span className="text-warning">Unsaved changes</span>
              </>
            ) : lastSaved ? (
              <>
                <Save className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Draft saved {getTimeAgo(lastSaved)}
                </span>
              </>
            ) : (
              <>
                <Save className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Draft</span>
              </>
            )}

            {/* Keyboard shortcut hint */}
            <span className="hidden sm:inline text-xs text-muted-foreground ml-2">
              (Ctrl+S to save)
            </span>
          </div>

          <div className="flex items-center gap-2 self-end xs:self-auto">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                saveDraft();
                toast.success("Draft saved");
              }}
              disabled={isSavingDraft || !hasUnsavedChanges}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Now
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (
                  confirm(
                    "Are you sure you want to clear this draft? This cannot be undone.",
                  )
                ) {
                  setSubject("");
                  setContent("");
                  setRecipients([]);
                  setAttachments([]);
                  setManualEntries([]);
                  setCsvData([]);
                  setCsvHeaders([]);
                  clearDraft();
                  toast.success("Draft cleared");
                }
              }}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4 md:space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger
            value="recipients"
            className="flex items-center gap-1 md:gap-2 py-2 md:py-3 text-xs md:text-sm"
          >
            <Users className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden xs:inline">Recipients</span>
            {recipients.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 text-[10px] md:text-xs px-1 md:px-2"
              >
                {recipients.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="compose"
            className="flex items-center gap-1 md:gap-2 py-2 md:py-3 text-xs md:text-sm"
          >
            <Mail className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden xs:inline">Compose</span>
          </TabsTrigger>
          <TabsTrigger
            value="preview"
            className="flex items-center gap-1 md:gap-2 py-2 md:py-3 text-xs md:text-sm"
          >
            <Eye className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden xs:inline">Preview</span>
          </TabsTrigger>
        </TabsList>

        {/* Recipients Tab */}
        <TabsContent value="recipients" className="space-y-6">
          {/* Manual Email Entry */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4" />
                Add Recipients Manually
              </CardTitle>
              <CardDescription>
                Add recipients one by one with their name for personalization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Input Row */}
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="manual-email" className="text-xs">
                    Email *
                  </Label>
                  <Input
                    id="manual-email"
                    type="email"
                    placeholder="john@example.com"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addManualEntry();
                      }
                    }}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="manual-name" className="text-xs">
                    Name (optional)
                  </Label>
                  <Input
                    id="manual-name"
                    type="text"
                    placeholder="John Doe"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addManualEntry();
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  onClick={addManualEntry}
                  disabled={!manualEmail.trim()}
                >
                  Add
                </Button>
              </div>

              {/* Added entries preview */}
              {manualEntries.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Added manually:
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {manualEntries.map((entry, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        {entry.name
                          ? `${entry.name} <${entry.email}>`
                          : entry.email}
                        <button
                          onClick={() => removeRecipient(entry.email)}
                          className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* CSV Import with visual cue */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSpreadsheet className="h-4 w-4" />
                Import from CSV
                <Badge variant="secondary" className="ml-2">
                  Recommended for bulk
                </Badge>
              </CardTitle>
              <CardDescription>
                Need more fields like company, title, or custom data? Use a CSV
                file for full personalization with placeholders like {"{name}"},{" "}
                {"{company}"}, etc.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LazyCSVUpload onDataLoad={handleCsvData} csvData={csvData} />
              {csvData.length > 0 && (
                <div className="mt-4 space-y-3">
                  <Badge variant="success">{csvData.length} rows loaded</Badge>

                  {/* PDF/Certificate Column Selector moved to Compose tab */}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Groups */}
          {groups.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Tag className="h-4 w-4" />
                  Select Contact Groups
                </CardTitle>
                <CardDescription>
                  Quickly add all contacts from a group
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {groups.map((group) => (
                    <button
                      key={group.$id}
                      onClick={() => toggleGroup(group.$id!)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                        selectedGroups.has(group.$id!)
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          group.color === "blue"
                            ? "bg-blue-500"
                            : group.color === "green"
                              ? "bg-green-500"
                              : group.color === "purple"
                                ? "bg-purple-500"
                                : group.color === "orange"
                                  ? "bg-orange-500"
                                  : group.color === "pink"
                                    ? "bg-pink-500"
                                    : group.color === "red"
                                      ? "bg-red-500"
                                      : group.color === "yellow"
                                        ? "bg-yellow-500"
                                        : "bg-gray-500"
                        }`}
                      />
                      <span className="font-medium">{group.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {group.contact_ids.length}
                      </Badge>
                      {selectedGroups.has(group.$id!) && (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Select from Contacts
              </CardTitle>
              <CardDescription>Choose from your saved contacts</CardDescription>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No contacts found. Add contacts from the Contacts page.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {contacts.map((contact) => (
                    <label
                      key={contact.$id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedContacts.has(contact.$id)
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedContacts.has(contact.$id)}
                        onChange={() =>
                          toggleContact(contact.$id, contact.email)
                        }
                        className="sr-only"
                      />
                      <div className="flex-1 min-w-0">
                        {contact.name && (
                          <p className="font-medium truncate">{contact.name}</p>
                        )}
                        <p className="text-sm text-muted-foreground truncate">
                          {contact.email}
                        </p>
                      </div>
                      {selectedContacts.has(contact.$id) && (
                        <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Recipients Summary */}
          {recipients.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">
                  {recipients.length} Recipients Selected
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRecipients([]);
                    setSelectedContacts(new Set());
                    setSelectedGroups(new Set());
                    toast.success("All recipients cleared");
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {recipients.map((email, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      {email}
                      <button
                        onClick={() => removeRecipient(email)}
                        className="ml-1 hover:bg-destructive/20 rounded p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Compose Tab */}
        <TabsContent value="compose" className="space-y-4">
          {/* Template & HTML Import */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-muted-foreground">
              Start from scratch or use a template
            </div>
            <div className="flex flex-wrap gap-2">
              <Dialog open={showHtmlImport} onOpenChange={setShowHtmlImport}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm"
                  >
                    <FileCode className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Import</span> HTML
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Import HTML Template</DialogTitle>
                    <DialogDescription>
                      Paste your HTML code to use as email content
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <textarea
                      value={htmlImportCode}
                      onChange={(e) => setHtmlImportCode(e.target.value)}
                      placeholder="Paste your HTML code here..."
                      className="w-full h-48 sm:h-64 p-3 rounded-md border bg-muted/50 font-mono text-xs sm:text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          if (htmlImportCode.trim()) {
                            setContent(htmlImportCode);
                            setShowHtmlImport(false);
                            setHtmlImportCode("");
                            toast.success("HTML template imported!");
                          }
                        }}
                        disabled={!htmlImportCode.trim()}
                        className="flex-1"
                      >
                        Import
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowHtmlImport(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog
                open={showTemplateDialog}
                onOpenChange={(open) => {
                  setShowTemplateDialog(open);
                  if (open) {
                    loadTemplates();
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm"
                  >
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Use</span> Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-lg max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Choose a Template</DialogTitle>
                    <DialogDescription>
                      Select a template to use as a starting point
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="relative">
                      <Pen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search templates..."
                        className="pl-9"
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                      />
                    </div>
                    {isLoadingTemplates ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <>
                        {/* User's saved templates */}
                        {templates.filter(
                          (t) =>
                            t.name
                              .toLowerCase()
                              .includes(templateSearch.toLowerCase()) ||
                            t.subject
                              .toLowerCase()
                              .includes(templateSearch.toLowerCase()),
                        ).length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">
                              Your Templates
                            </h4>
                            {templates
                              .filter(
                                (t) =>
                                  t.name
                                    .toLowerCase()
                                    .includes(templateSearch.toLowerCase()) ||
                                  t.subject
                                    .toLowerCase()
                                    .includes(templateSearch.toLowerCase()),
                              )
                              .map((template) => (
                                <button
                                  key={template.$id}
                                  onClick={() => applyTemplate(template)}
                                  className="w-full text-left p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                                >
                                  <div className="font-medium mb-1">
                                    {template.name}
                                  </div>
                                  <div className="text-sm text-muted-foreground truncate">
                                    {template.subject}
                                  </div>
                                </button>
                              ))}
                          </div>
                        )}

                        {/* Quick starter templates */}
                        {[
                          {
                            name: "Welcome",
                            icon: "👋",
                            subject: "Welcome, {{name}}!",
                            content:
                              "<p>Hi {{name}},</p><p>Welcome aboard! We're excited to have you.</p><p>Best regards</p>",
                          },
                          {
                            name: "Thank You",
                            icon: "🙏",
                            subject: "Thank you, {{name}}!",
                            content:
                              "<p>Dear {{name}},</p><p>Thank you so much for your support!</p><p>Warm regards</p>",
                          },
                          {
                            name: "Meeting",
                            icon: "📅",
                            subject: "Meeting Request: {{topic}}",
                            content:
                              "<p>Hi {{name}},</p><p>I'd like to schedule a meeting to discuss {{topic}}.</p><p>Would any of these times work for you?</p><p>Best</p>",
                          },
                          {
                            name: "Follow-up",
                            icon: "🔄",
                            subject: "Following up: {{topic}}",
                            content:
                              "<p>Hi {{name}},</p><p>I wanted to follow up on {{topic}}.</p><p>Have you had a chance to think about it?</p><p>Best</p>",
                          },
                          {
                            name: "Reminder",
                            icon: "⏰",
                            subject: "Reminder: {{event}}",
                            content:
                              "<p>Hi {{name}},</p><p>This is a friendly reminder about {{event}}.</p><p>See you soon!</p>",
                          },
                          {
                            name: "Invitation",
                            icon: "🎉",
                            subject: "You're Invited: {{event}}",
                            content:
                              "<p>Dear {{name}},</p><p>You're invited to {{event}}!</p><p>We hope to see you there.</p><p>Best regards</p>",
                          },
                        ].filter(
                          (qt) =>
                            qt.name
                              .toLowerCase()
                              .includes(templateSearch.toLowerCase()) ||
                            qt.subject
                              .toLowerCase()
                              .includes(templateSearch.toLowerCase()),
                        ).length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              Quick Start
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                {
                                  name: "Welcome",
                                  icon: "👋",
                                  subject: "Welcome, {{name}}!",
                                  content:
                                    "<p>Hi {{name}},</p><p>Welcome aboard! We're excited to have you.</p><p>Best regards</p>",
                                },
                                {
                                  name: "Thank You",
                                  icon: "🙏",
                                  subject: "Thank you, {{name}}!",
                                  content:
                                    "<p>Dear {{name}},</p><p>Thank you so much for your support!</p><p>Warm regards</p>",
                                },
                                {
                                  name: "Meeting",
                                  icon: "📅",
                                  subject: "Meeting Request: {{topic}}",
                                  content:
                                    "<p>Hi {{name}},</p><p>I'd like to schedule a meeting to discuss {{topic}}.</p><p>Would any of these times work for you?</p><p>Best</p>",
                                },
                                {
                                  name: "Follow-up",
                                  icon: "🔄",
                                  subject: "Following up: {{topic}}",
                                  content:
                                    "<p>Hi {{name}},</p><p>I wanted to follow up on {{topic}}.</p><p>Have you had a chance to think about it?</p><p>Best</p>",
                                },
                                {
                                  name: "Reminder",
                                  icon: "⏰",
                                  subject: "Reminder: {{event}}",
                                  content:
                                    "<p>Hi {{name}},</p><p>This is a friendly reminder about {{event}}.</p><p>See you soon!</p>",
                                },
                                {
                                  name: "Invitation",
                                  icon: "🎉",
                                  subject: "You're Invited: {{event}}",
                                  content:
                                    "<p>Dear {{name}},</p><p>You're invited to {{event}}!</p><p>We hope to see you there.</p><p>Best regards</p>",
                                },
                              ]
                                .filter(
                                  (qt) =>
                                    qt.name
                                      .toLowerCase()
                                      .includes(templateSearch.toLowerCase()) ||
                                    qt.subject
                                      .toLowerCase()
                                      .includes(templateSearch.toLowerCase()),
                                )
                                .map((qt, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => {
                                      setSubject(qt.subject);
                                      setContent(qt.content);
                                      setShowTemplateDialog(false);
                                      toast.success(
                                        `"${qt.name}" template applied`,
                                      );
                                    }}
                                    className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                                  >
                                    <span className="text-lg">{qt.icon}</span>
                                    <span className="text-sm font-medium">
                                      {qt.name}
                                    </span>
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Link to full templates page */}
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setShowTemplateDialog(false);
                            router.push("/templates");
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Browse All Templates
                        </Button>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Enter email subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Email Body</Label>
            <LazyRichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Compose your email..."
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Attachments
              <span className="text-xs text-muted-foreground font-normal">
                (Gmail limit: 25MB total)
              </span>
            </Label>

            {/* Total size warning */}
            {(() => {
              const totalSize = attachments.reduce(
                (sum, a) => sum + (a.fileSize || 0),
                0,
              );
              const totalMB = totalSize / 1024 / 1024;
              if (totalMB > 20) {
                return (
                  <div
                    className={`text-xs p-2 rounded ${totalMB > 25 ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}
                  >
                    {totalMB > 25
                      ? `⚠️ Total size (${totalMB.toFixed(1)}MB) exceeds Gmail's 25MB limit!`
                      : `⚠️ Total size: ${totalMB.toFixed(1)}MB (approaching 25MB limit)`}
                  </div>
                );
              }
              return null;
            })()}

            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <Badge
                  key={file.tempId || index}
                  variant={file.isProcessing ? "outline" : "secondary"}
                  className={`flex items-center gap-2 py-2 ${file.isProcessing ? "animate-pulse" : ""}`}
                >
                  {file.isProcessing ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Paperclip className="h-3 w-3" />
                  )}
                  {file.name}
                  {file.fileSize && (
                    <span className="text-xs text-muted-foreground">
                      ({(file.fileSize / 1024 / 1024).toFixed(1)}MB)
                    </span>
                  )}
                  {file.isProcessing && (
                    <span className="text-xs text-muted-foreground">
                      {file.fileSize >= LARGE_FILE_THRESHOLD
                        ? "uploading..."
                        : "encoding..."}
                    </span>
                  )}
                  <button
                    onClick={() => removeAttachment(index)}
                    className="hover:text-destructive"
                    disabled={file.isProcessing}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}

              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) =>
                    e.target.files && handleFileUpload(e.target.files)
                  }
                  disabled={isUploading}
                />
                <Badge
                  variant="outline"
                  className="flex items-center gap-2 py-2 cursor-pointer hover:bg-muted"
                >
                  {isUploading ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3" />
                  )}
                  Add Files
                </Badge>
              </label>
            </div>
          </div>

          {/* Personalized Attachments Toggle */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Personalized Attachments
                </Label>
                <p className="text-sm text-muted-foreground">
                  Send a unique file to each recipient (e.g. certificates,
                  invoices)
                </p>
              </div>
              <Switch
                checked={showPersonalizedAttachments}
                onCheckedChange={(checked) => {
                  setShowPersonalizedAttachments(checked);
                  if (!checked) {
                    setPdfColumn(null);
                  } else if (csvHeaders.length > 0 && !pdfColumn) {
                    // Try to auto-detect or default to first
                    const detected = detectPdfColumn(csvHeaders);
                    setPdfColumn(detected || csvHeaders[0]);
                  }
                }}
              />
            </div>

            {showPersonalizedAttachments && (
              <div className="p-4 border rounded-lg bg-muted/30 space-y-4 animate-in fade-in slide-in-from-top-2">
                {csvData.length === 0 ? (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">
                      Please upload a CSV file in the Recipients tab first.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Select Attachment Column</Label>
                    <select
                      value={pdfColumn || ""}
                      onChange={(e) => setPdfColumn(e.target.value || null)}
                      className="w-full p-2 text-sm border rounded-md bg-background"
                    >
                      <option value="">Select a column...</option>
                      {csvHeaders.map((header) => (
                        <option key={header} value={header}>
                          {header}{" "}
                          {isPdfUrl(csvData[0]?.[header])
                            ? "(Detected Link)"
                            : ""}
                        </option>
                      ))}
                    </select>
                    {pdfColumn && (
                      <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle className="h-3 w-3" />
                        <span>
                          {
                            csvData.filter((row) => isPdfUrl(row[pdfColumn]))
                              .length
                          }{" "}
                          valid links found in {csvData.length} rows
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Email Signature */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Pen className="h-4 w-4" />
              Email Signature
            </Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedSignature === null ? "secondary" : "outline"}
                size="sm"
                onClick={() => setSelectedSignature(null)}
              >
                No Signature
              </Button>
              {signatures.map((sig) => (
                <Button
                  key={sig.$id}
                  variant={
                    selectedSignature === sig.$id ? "secondary" : "outline"
                  }
                  size="sm"
                  onClick={() => setSelectedSignature(sig.$id!)}
                >
                  {sig.name}
                  {sig.is_default && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      Default
                    </Badge>
                  )}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/settings/signatures")}
              >
                Manage Signatures
              </Button>
            </div>
          </div>

          {/* Email Options Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Email Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Type Selector */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Email Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsMarketing(false)}
                    disabled={!!searchParams.get("abTestId")}
                    className={`relative flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all text-left ${
                      !isMarketing
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-muted hover:border-muted-foreground/30 hover:bg-muted/50"
                    } ${searchParams.get("abTestId") ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {!isMarketing && (
                      <div className="absolute top-3 right-3">
                        <CheckCircle className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`p-2 rounded-lg ${!isMarketing ? "bg-primary/10" : "bg-muted"}`}
                    >
                      <Send className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Transactional</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Important emails like receipts or confirmations. Always
                        delivered, even to unsubscribed users.
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMarketing(true)}
                    disabled={!!searchParams.get("abTestId")}
                    className={`relative flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all text-left ${
                      isMarketing
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-muted hover:border-muted-foreground/30 hover:bg-muted/50"
                    } ${searchParams.get("abTestId") ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {isMarketing && (
                      <div className="absolute top-3 right-3">
                        <CheckCircle className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`p-2 rounded-lg ${isMarketing ? "bg-primary/10" : "bg-muted"}`}
                    >
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Marketing</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Promotional emails with unsubscribe link. Respects user
                        preferences.
                      </p>
                    </div>
                  </button>
                </div>
                {searchParams.get("abTestId") && (
                  <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Marketing mode is required for A/B testing
                  </p>
                )}
                {/* Analytics info */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <Eye className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>
                    All emails include open and click tracking for analytics
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t" />

              {/* Toggle Options */}
              <div className="space-y-4">
                {/* Save as Draft Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${saveAsDraft ? "bg-primary/10" : "bg-muted"}`}
                    >
                      <Save className="h-4 w-4" />
                    </div>
                    <div>
                      <Label
                        htmlFor="draft-toggle"
                        className="font-medium cursor-pointer"
                      >
                        Save as Draft
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Save without sending — send later from Drafts
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="draft-toggle"
                    checked={saveAsDraft}
                    onCheckedChange={setSaveAsDraft}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Email Preview
                  </CardTitle>
                  <CardDescription>
                    Preview exactly how your email will appear in Gmail
                  </CardDescription>
                </div>
                {/* Desktop/Mobile Toggle */}
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                  <Button
                    variant={previewMode === "desktop" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setPreviewMode("desktop")}
                    className="flex items-center gap-2"
                  >
                    <Monitor className="h-4 w-4" />
                    <span className="hidden sm:inline">Desktop</span>
                  </Button>
                  <Button
                    variant={previewMode === "mobile" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setPreviewMode("mobile")}
                    className="flex items-center gap-2"
                  >
                    <Smartphone className="h-4 w-4" />
                    <span className="hidden sm:inline">Mobile</span>
                  </Button>
                  <div className="border-l mx-1 h-6" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowClientPreview(true)}
                    className="flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    <span className="hidden sm:inline">Client Preview</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Recipient Selector */}
              {recipients.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setPreviewRecipientIndex(
                        Math.max(0, previewRecipientIndex - 1),
                      )
                    }
                    disabled={previewRecipientIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      Recipient {previewRecipientIndex + 1} of{" "}
                      {recipients.length}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setPreviewRecipientIndex(
                        Math.min(
                          recipients.length - 1,
                          previewRecipientIndex + 1,
                        ),
                      )
                    }
                    disabled={previewRecipientIndex >= recipients.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Preview Accuracy Notice */}
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                <p className="text-xs text-green-800 dark:text-green-300">
                  <strong>Accurate preview:</strong> This shows exactly how your
                  email will appear in Gmail.
                </p>
              </div>

              {/* Personalization Info */}
              {(() => {
                const preview = getPersonalizedContent(previewRecipientIndex);
                const hasPlaceholders = (subject + content).match(
                  /\{\{?\w+\}?\}/,
                );
                const csvRow = csvData.find(
                  (row) => row.email === preview.email,
                );
                const manualEntry = manualEntries.find(
                  (e) => e.email === preview.email,
                );

                return (
                  <>
                    {hasPlaceholders && (csvRow || manualEntry) && (
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <p className="text-sm font-medium text-primary mb-2">
                          Personalization Data:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(preview.data || {})
                            .filter(([key, value]) => value && key !== "email")
                            .map(([key, value]) => (
                              <Badge
                                key={key}
                                variant="outline"
                                className="text-xs"
                              >
                                {key}: {String(value)}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Email Header */}
                    <div
                      className={`border rounded-lg bg-white dark:bg-zinc-900 overflow-hidden ${
                        previewMode === "mobile" ? "max-w-[375px] mx-auto" : ""
                      }`}
                    >
                      <div className="border-b p-4 bg-gray-50 dark:bg-zinc-800">
                        <p className="text-sm">
                          <span className="font-medium text-muted-foreground">
                            To:
                          </span>{" "}
                          <span className="text-foreground">
                            {preview.email}
                          </span>
                        </p>
                        <p className="text-sm mt-1">
                          <span className="font-medium text-muted-foreground">
                            Subject:
                          </span>{" "}
                          <span className="text-foreground font-semibold">
                            {preview.subject}
                          </span>
                        </p>
                      </div>

                      {/* Email Body - Formatted Preview */}
                      <div className="relative">
                        {isLoadingPreview ? (
                          <div className="flex flex-col items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                            <p className="text-sm text-muted-foreground">
                              Formatting preview...
                            </p>
                          </div>
                        ) : (
                          <iframe
                            srcDoc={formattedPreviewHtml}
                            className={`w-full border-0 bg-white ${
                              previewMode === "mobile"
                                ? "h-[500px]"
                                : "h-[400px]"
                            }`}
                            title={`Email preview for ${preview.email}`}
                            sandbox="allow-same-origin"
                          />
                        )}
                      </div>

                      {/* Show attachments section */}
                      {(attachments.length > 0 ||
                        (pdfColumn && preview.data?.[pdfColumn])) && (
                        <div className="border-t p-4 bg-gray-50 dark:bg-zinc-800">
                          <p className="text-sm font-medium mb-2">
                            Attachments:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {attachments.map((att, i) => (
                              <Badge key={i} variant="secondary">
                                <Paperclip className="h-3 w-3 mr-1" />
                                {att.name}
                              </Badge>
                            ))}
                            {/* Show personalized attachment with fetched metadata */}
                            {pdfColumn &&
                              preview.data?.[pdfColumn] &&
                              isPdfUrl(String(preview.data[pdfColumn])) && (
                                <div className="w-full mt-2">
                                  {isLoadingAttachmentMetadata ? (
                                    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                      <span className="text-sm text-blue-700 dark:text-blue-300">
                                        Loading attachment details...
                                      </span>
                                    </div>
                                  ) : personalizedAttachmentMetadata[
                                      preview.email
                                    ] ? (
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                          <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                                            {personalizedAttachmentMetadata[
                                              preview.email
                                            ]?.fileType === "pdf" && (
                                              <FileText className="h-6 w-6 text-red-600 dark:text-red-400" />
                                            )}
                                            {personalizedAttachmentMetadata[
                                              preview.email
                                            ]?.fileType === "image" && (
                                              <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                                            )}
                                            {personalizedAttachmentMetadata[
                                              preview.email
                                            ]?.fileType === "document" && (
                                              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                            )}
                                            {personalizedAttachmentMetadata[
                                              preview.email
                                            ]?.fileType === "spreadsheet" && (
                                              <FileSpreadsheet className="h-6 w-6 text-green-600 dark:text-green-400" />
                                            )}
                                            {personalizedAttachmentMetadata[
                                              preview.email
                                            ]?.fileType === "presentation" && (
                                              <FileText className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                                            )}
                                            {personalizedAttachmentMetadata[
                                              preview.email
                                            ]?.fileType === "other" && (
                                              <Paperclip className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                                            )}
                                          </div>
                                          <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                              {
                                                personalizedAttachmentMetadata[
                                                  preview.email
                                                ]?.fileName
                                              }
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                              <Badge
                                                variant="outline"
                                                className="text-xs"
                                              >
                                                {personalizedAttachmentMetadata[
                                                  preview.email
                                                ]?.source === "google-drive" &&
                                                  "Google Drive"}
                                                {personalizedAttachmentMetadata[
                                                  preview.email
                                                ]?.source === "onedrive" &&
                                                  "OneDrive"}
                                                {personalizedAttachmentMetadata[
                                                  preview.email
                                                ]?.source === "dropbox" &&
                                                  "Dropbox"}
                                                {personalizedAttachmentMetadata[
                                                  preview.email
                                                ]?.source === "direct" &&
                                                  "Direct Link"}
                                              </Badge>
                                              {personalizedAttachmentMetadata[
                                                preview.email
                                              ]?.fileSize && (
                                                <span className="text-xs text-muted-foreground">
                                                  {formatFileSize(
                                                    personalizedAttachmentMetadata[
                                                      preview.email
                                                    ]?.fileSize || 0,
                                                  )}
                                                </span>
                                              )}
                                              {personalizedAttachmentMetadata[
                                                preview.email
                                              ]?.accessible && (
                                                <Badge
                                                  variant="secondary"
                                                  className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                                >
                                                  <CheckCircle className="h-3 w-3 mr-1" />
                                                  Accessible
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setPreviewAttachmentUrl(
                                              String(preview.data?.[pdfColumn]),
                                            );
                                            setShowAttachmentPreview(true);
                                          }}
                                          className="flex-shrink-0"
                                        >
                                          <Eye className="h-3 w-3 mr-1" />
                                          Preview
                                        </Button>
                                      </div>
                                      <p
                                        className="text-xs text-muted-foreground mt-2 truncate"
                                        title={String(preview.data[pdfColumn])}
                                      >
                                        {String(preview.data[pdfColumn])
                                          .length > 60
                                          ? String(
                                              preview.data[pdfColumn],
                                            ).substring(0, 60) + "..."
                                          : String(preview.data[pdfColumn])}
                                      </p>
                                    </div>
                                  ) : (
                                    <Badge
                                      variant="default"
                                      className="bg-blue-600 cursor-pointer"
                                      title={String(preview.data[pdfColumn])}
                                      onClick={() => {
                                        setPreviewAttachmentUrl(
                                          String(preview.data?.[pdfColumn]),
                                        );
                                        setShowAttachmentPreview(true);
                                      }}
                                    >
                                      <FileText className="h-3 w-3 mr-1" />
                                      {getFilenameFromUrl(
                                        String(preview.data[pdfColumn]),
                                      )}
                                    </Badge>
                                  )}
                                </div>
                              )}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}

              {recipients.length === 0 && (
                <div
                  className={`border rounded-lg bg-white dark:bg-zinc-900 overflow-hidden ${
                    previewMode === "mobile" ? "max-w-[375px] mx-auto" : ""
                  }`}
                >
                  <div className="border-b p-4 bg-gray-50 dark:bg-zinc-800">
                    <p className="text-sm">
                      <span className="font-medium text-muted-foreground">
                        To:
                      </span>{" "}
                      <span className="text-foreground">
                        recipient@example.com
                      </span>
                    </p>
                    <p className="text-sm mt-1">
                      <span className="font-medium text-muted-foreground">
                        Subject:
                      </span>{" "}
                      <span className="text-foreground font-semibold">
                        {subject || "(No subject)"}
                      </span>
                    </p>
                  </div>
                  <div className="relative">
                    {isLoadingPreview ? (
                      <div className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Formatting preview...
                        </p>
                      </div>
                    ) : (
                      <iframe
                        srcDoc={
                          formattedPreviewHtml ||
                          createGmailPreviewWrapper(
                            content ||
                              "<p>Your email content will appear here...</p>",
                          )
                        }
                        className={`w-full border-0 bg-white ${
                          previewMode === "mobile" ? "h-[500px]" : "h-[400px]"
                        }`}
                        title="Email preview"
                        sandbox="allow-same-origin"
                      />
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Send Button */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-muted-foreground space-y-1">
          {quotaInfo.estimatedRemaining < 100 && (
            <div className="text-warning">
              <AlertCircle className="h-4 w-4 inline mr-1" />~
              {quotaInfo.estimatedRemaining} emails remaining today
            </div>
          )}
          {/* Keyboard shortcuts hint */}
          <div className="hidden sm:flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                Ctrl+S
              </kbd>
              Save draft
            </span>
            {!saveAsDraft && (
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                  Ctrl+Enter
                </kbd>
                Send
              </span>
            )}
          </div>
        </div>

        <Button
          onClick={handleSend}
          disabled={
            isSending ||
            isPreparingSend ||
            isSavingDraft ||
            isUploading ||
            attachments.some((a) => a.isProcessing) ||
            !subject ||
            !content ||
            recipients.length === 0
          }
          size="lg"
        >
          {saveAsDraft ? (
            isSavingDraft ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving Draft...
              </>
            ) : isUploading || attachments.some((a) => a.isProcessing) ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Processing Files...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save as Draft ({recipients.length}{" "}
                {recipients.length === 1 ? "recipient" : "recipients"})
              </>
            )
          ) : isPreparingSend || isSending ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              {isPreparingSend ? "Preparing..." : "Sending..."}
            </>
          ) : isUploading || attachments.some((a) => a.isProcessing) ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Processing Files...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send to {recipients.length}{" "}
              {recipients.length === 1 ? "recipient" : "recipients"}
            </>
          )}
        </Button>
      </div>

      {/* Sending Dialog */}
      <Dialog
        open={showSendingDialog}
        onOpenChange={(open) => {
          // Prevent closing while sending unless stopped
          if (!open && isSending && !isStopping) {
            return;
          }
          setShowSendingDialog(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isStopping ? (
                <StopCircle className="h-5 w-5 text-warning animate-pulse" />
              ) : isSending ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : progress.percentage === 100 && !sendError ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : sendError || hasPendingRetries ? (
                <AlertCircle className="h-5 w-5 text-warning" />
              ) : null}
              {isStopping
                ? "Stopping..."
                : isSending
                  ? "Sending Emails..."
                  : "Campaign Status"}
            </DialogTitle>
            <DialogDescription>{progress.status}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Progress value={progress.percentage} className="h-3" />

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-success/10 rounded-lg">
                <div className="text-xl font-bold text-success">
                  {sendStatus.filter((s) => s.status === "success").length}
                </div>
                <div className="text-xs text-muted-foreground">Sent</div>
              </div>
              <div className="text-center p-3 bg-destructive/10 rounded-lg">
                <div className="text-xl font-bold text-destructive">
                  {sendStatus.filter((s) => s.status === "error").length}
                </div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
              <div className="text-center p-3 bg-warning/10 rounded-lg">
                <div className="text-xl font-bold text-warning">
                  {
                    sendStatus.filter(
                      (s) =>
                        s.status === "skipped" ||
                        s.status === "cancelled" ||
                        s.status === "pending",
                    ).length
                  }
                </div>
                <div className="text-xs text-muted-foreground">Remaining</div>
              </div>
            </div>

            {sendError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{sendError}</p>
              </div>
            )}

            {/* Stop Button - visible while sending */}
            {isSending && !isStopping && (
              <Button
                onClick={stopSending}
                variant="destructive"
                className="w-full"
              >
                <StopCircle className="h-4 w-4 mr-2" />
                Stop Sending
              </Button>
            )}

            {/* Network status indicator */}
            {isOffline && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
                <WifiOff className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">
                  Network disconnected. Waiting for connection...
                </p>
              </div>
            )}

            {/* Paused indicator (rate limit or network) */}
            {isPaused && !isOffline && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning animate-pulse" />
                <p className="text-sm text-warning">
                  Paused - waiting to resume...
                </p>
              </div>
            )}

            {/* Stopping indicator */}
            {isStopping && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg text-center">
                <p className="text-sm text-warning">
                  Stopping after current email completes...
                </p>
              </div>
            )}

            {/* Retry/Resume buttons - visible when not sending */}
            {hasPendingRetries && !isSending && (
              <Button
                onClick={retryFailedEmails}
                variant="outline"
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                Resume Sending ({failedEmails.length} remaining)
              </Button>
            )}

            {!isSending && (
              <Button
                onClick={() => setShowSendingDialog(false)}
                className="w-full"
              >
                {progress.percentage === 100 && !sendError ? "Done" : "Close"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Draft Recovery Dialog */}
      <Dialog
        open={showDraftRecoveryDialog}
        onOpenChange={setShowDraftRecoveryDialog}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Recover Draft
            </DialogTitle>
            <DialogDescription>
              You have an unsaved draft from{" "}
              {pendingDraft ? getTimeAgo(new Date(pendingDraft.savedAt)) : ""}.
              Would you like to restore it?
            </DialogDescription>
          </DialogHeader>

          {pendingDraft && (
            <div className="space-y-4 py-4">
              {/* Draft Preview */}
              <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Subject
                  </p>
                  <p className="font-medium truncate">
                    {pendingDraft.subject || "(No subject)"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Recipients
                  </p>
                  <p className="text-sm">
                    {pendingDraft.recipients.length > 0
                      ? `${pendingDraft.recipients.length} recipient${pendingDraft.recipients.length > 1 ? "s" : ""}`
                      : "No recipients"}
                  </p>
                </div>
                {pendingDraft.content && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Preview
                    </p>
                    <div
                      className="text-sm text-muted-foreground line-clamp-3 prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{
                        __html:
                          pendingDraft.content.substring(0, 200) +
                          (pendingDraft.content.length > 200 ? "..." : ""),
                      }}
                    />
                  </div>
                )}
                {(pendingDraft.attachments?.length || 0) > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Attachments
                    </p>
                    <p className="text-sm">
                      {pendingDraft.attachments?.length} file(s)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={discardPendingDraft}>
              <Trash2 className="h-4 w-4 mr-2" />
              Discard
            </Button>
            <Button onClick={() => pendingDraft && restoreDraft(pendingDraft)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Restore Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Personalized Attachment Preview Modal */}
      <Dialog
        open={showAttachmentPreview}
        onOpenChange={setShowAttachmentPreview}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Attachment Preview
            </DialogTitle>
            <DialogDescription>
              Preview of the personalized attachment for this recipient
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {previewAttachmentUrl && (
              <>
                {/* Show metadata if available */}
                {(() => {
                  const preview = getPersonalizedContent(previewRecipientIndex);
                  const metadata =
                    personalizedAttachmentMetadata[preview.email];
                  return metadata ? (
                    <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {metadata.fileType === "pdf" && (
                          <FileText className="h-8 w-8 text-red-500" />
                        )}
                        {metadata.fileType === "image" && (
                          <FileText className="h-8 w-8 text-green-500" />
                        )}
                        {metadata.fileType === "document" && (
                          <FileText className="h-8 w-8 text-blue-500" />
                        )}
                        {metadata.fileType === "spreadsheet" && (
                          <FileSpreadsheet className="h-8 w-8 text-green-600" />
                        )}
                        {metadata.fileType === "presentation" && (
                          <FileText className="h-8 w-8 text-orange-500" />
                        )}
                        {metadata.fileType === "other" && (
                          <Paperclip className="h-8 w-8 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{metadata.fileName}</p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <span>
                            {metadata.source === "google-drive" &&
                              "Google Drive"}
                            {metadata.source === "onedrive" && "OneDrive"}
                            {metadata.source === "dropbox" && "Dropbox"}
                            {metadata.source === "direct" && "Direct Link"}
                          </span>
                          {metadata.fileSize && (
                            <>
                              <span>•</span>
                              <span>{formatFileSize(metadata.fileSize)}</span>
                            </>
                          )}
                          {metadata.accessible && (
                            <>
                              <span>•</span>
                              <span className="text-green-600 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Accessible
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(previewAttachmentUrl, "_blank")
                        }
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Open in New Tab
                      </Button>
                    </div>
                  ) : null;
                })()}

                {/* Embedded preview */}
                <div className="border rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
                  {previewAttachmentUrl.includes("drive.google.com") ||
                  previewAttachmentUrl.includes("docs.google.com") ? (
                    <div className="w-full h-[60vh]">
                      <iframe
                        src={getGooglePreviewUrl(previewAttachmentUrl)}
                        className="w-full h-full border-0"
                        title="Attachment Preview"
                        sandbox="allow-scripts allow-same-origin"
                      />
                    </div>
                  ) : previewAttachmentUrl.match(
                      /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i,
                    ) ? (
                    <div className="flex items-center justify-center p-8 max-h-[60vh] overflow-auto">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewAttachmentUrl}
                        alt="Attachment preview"
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextElementSibling?.classList.remove(
                            "hidden",
                          );
                        }}
                      />
                      <div className="hidden text-center text-muted-foreground">
                        <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                        <p>Could not load image preview</p>
                      </div>
                    </div>
                  ) : previewAttachmentUrl.match(/\.pdf(\?|$)/i) ? (
                    <div className="w-full h-[60vh]">
                      <iframe
                        src={previewAttachmentUrl}
                        className="w-full h-full border-0"
                        title="PDF Preview"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="p-4 bg-muted rounded-full mb-4">
                        <Paperclip className="h-12 w-12 text-muted-foreground" />
                      </div>
                      <p className="text-lg font-medium mb-2">
                        Preview Not Available
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        This file type cannot be previewed directly in the
                        browser.
                      </p>
                      <Button
                        variant="default"
                        onClick={() =>
                          window.open(previewAttachmentUrl, "_blank")
                        }
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Open in New Tab to View
                      </Button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground break-all">
                  <strong>URL:</strong> {previewAttachmentUrl}
                </p>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAttachmentPreview(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Client Preview Modal */}
      <LazyEmailClientPreview
        isOpen={showClientPreview}
        onClose={() => setShowClientPreview(false)}
        subject={subject}
        htmlContent={formattedPreviewHtml || content || ""}
        senderName={session?.user?.name || "Your Name"}
        senderEmail={session?.user?.email || "your@email.com"}
      />
    </div>
  );
}

/**
 * Creates a Gmail-like preview wrapper that exactly matches how Gmail displays emails.
 * This ensures the preview looks identical to the sent email.
 */
function createGmailPreviewWrapper(htmlContent: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Gmail-like rendering environment */
    body {
      margin: 0;
      padding: 16px;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #222222;
      background: #ffffff;
      -webkit-font-smoothing: antialiased;
      word-wrap: break-word;
      overflow-wrap: break-word;
      word-break: break-word;
    }
    
    /* Prevent horizontal overflow */
    * {
      max-width: 100%;
      box-sizing: border-box;
    }
    
    /* Headings */
    h1 { font-size: 2em; font-weight: bold; margin: 0.67em 0; }
    h2 { font-size: 1.5em; font-weight: bold; margin: 0.75em 0; }
    h3 { font-size: 1.17em; font-weight: bold; margin: 0.83em 0; }
    h4 { font-size: 1em; font-weight: bold; margin: 1em 0; }
    
    /* Paragraphs and divs */
    p, div { margin: 0.5em 0; word-wrap: break-word; overflow-wrap: break-word; }
    
    /* Lists */
    ul, ol { padding-left: 1.5em; margin: 0.5em 0; }
    ul { list-style-type: disc; }
    ol { list-style-type: decimal; }
    li { margin: 0.25em 0; }
    
    /* Links */
    a { color: #2563eb; text-decoration: underline; }
    
    /* Blockquotes */
    blockquote {
      border-left: 3px solid #ccc;
      margin: 1em 0;
      padding-left: 1em;
      color: #666;
      font-style: italic;
    }
    
    /* Code */
    pre {
      background: #f5f5f5;
      color: #333;
      font-family: 'Courier New', Courier, monospace;
      padding: 12px 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 1em 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    code {
      background: #f1f5f9;
      color: #e11d48;
      padding: 0.2em 0.4em;
      border-radius: 0.25em;
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.9em;
    }
    pre code {
      background: none;
      color: inherit;
      padding: 0;
    }
    
    /* Horizontal rule */
    hr {
      border: none;
      border-top: 2px solid #e5e7eb;
      margin: 1.5em 0;
    }
    
    /* Tables */
    table {
      border-collapse: collapse;
      margin: 1em 0;
      width: 100%;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 8px;
      text-align: left;
    }
    th {
      background: #f3f4f6;
      font-weight: bold;
    }
    
    /* Images */
    img {
      max-width: 100%;
      height: auto;
    }
    
    /* Marks/Highlights */
    mark {
      background-color: #fef08a;
      border-radius: 0.25em;
      padding: 0.1em 0.2em;
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;
}

/**
 * Extract filename from a URL for personalized attachments
 * Tries to get the filename from the URL path, falls back to a shortened URL display
 */
function getFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const lastPart = pathParts[pathParts.length - 1];

    // If the last part looks like a filename with extension
    if (lastPart && /\.[a-zA-Z0-9]{2,5}$/.test(lastPart)) {
      const decoded = decodeURIComponent(lastPart);
      // Truncate if too long
      if (decoded.length > 30) {
        const ext = decoded.substring(decoded.lastIndexOf("."));
        return decoded.substring(0, 25) + "..." + ext;
      }
      return decoded;
    }

    // For Google Drive/Docs links, show service name
    if (url.includes("drive.google.com") || url.includes("docs.google.com")) {
      return "Google Drive File";
    }
    if (url.includes("dropbox.com") || url.includes("dropboxusercontent.com")) {
      return "Dropbox File";
    }
    if (
      url.includes("onedrive.live.com") ||
      url.includes("sharepoint.com") ||
      url.includes("1drv.ms")
    ) {
      return "OneDrive File";
    }

    // Fallback: show truncated domain + path
    const host = urlObj.hostname.replace("www.", "");
    const truncatedPath =
      urlObj.pathname.length > 15
        ? urlObj.pathname.substring(0, 12) + "..."
        : urlObj.pathname;
    return `${host}${truncatedPath}`;
  } catch {
    // If URL parsing fails, show truncated URL
    if (url.length > 30) {
      return url.substring(0, 27) + "...";
    }
    return url;
  }
}

/**
 * Format file size in a human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Convert a Google Drive/Docs URL to a preview-able embed URL
 */
function getGooglePreviewUrl(url: string): string {
  // Google Drive file URLs
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }

  // Google Docs
  const docMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) {
    return `https://docs.google.com/document/d/${docMatch[1]}/preview`;
  }

  // Google Sheets
  const sheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch) {
    return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/preview`;
  }

  // Google Slides
  const slideMatch = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (slideMatch) {
    return `https://docs.google.com/presentation/d/${slideMatch[1]}/preview`;
  }

  // Already a preview URL or fallback
  if (url.includes("/preview")) {
    return url;
  }

  // Use Google's document viewer for other URLs
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
}
