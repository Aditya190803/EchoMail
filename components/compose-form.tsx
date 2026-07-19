"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import {
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Save,
  Trash2,
  RefreshCw,
  Pen,
  Play,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { AttachmentPreviewDialog } from "@/components/compose/attachment-preview-dialog";
import {
  createProcessingAttachments,
  ensureAppwriteAttachment,
  processAttachmentFile,
} from "@/components/compose/attachment-upload";
import { ComposeStep } from "@/components/compose/compose-step";
import type {
  ComposeAttachment,
  Contact,
  EmailDraft,
} from "@/components/compose/compose-types";
import { DraftRecoveryDialog } from "@/components/compose/draft-recovery-dialog";
import {
  AUTO_SAVE_DELAY_MS,
  clearLocalDraft,
  contentHash,
  getTimeAgo,
  loadLocalDraft,
  saveLocalDraft,
  buildLocalDraft,
  type DraftSyncStatus,
} from "@/components/compose/draft-storage";
import { PreviewStep } from "@/components/compose/preview-step";
import {
  buildPersonalizedEmails,
  buildRecipientFields,
} from "@/components/compose/recipient-data";
import { RecipientsStep } from "@/components/compose/recipients-step";
import { SendingStatusDialog } from "@/components/compose/sending-status-dialog";
import {
  StickyActionBar,
  type ComposeSectionId,
} from "@/components/compose/sticky-action-bar";
import { LazyEmailClientPreview } from "@/components/lazy-components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-shell";
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
import { parseEmailList, serializeEmailList } from "@/lib/email/parse-list";
import {
  createGmailPreviewWrapper as buildGmailPreviewWrapper,
  replacePlaceholders,
} from "@/lib/email/preview-utils";
import { getEmailPreview } from "@/lib/email-formatting/client";
import { getCookie } from "@/lib/utils";
import { isValidEmail } from "@/lib/validation";
import type { CSVRow } from "@/types/email";

export function ComposeForm() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Form state
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<ComposeAttachment[]>([]);
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
  const [_isLoadingAttachmentMetadata, setIsLoadingAttachmentMetadata] =
    useState(false);
  const [showAttachmentPreview, setShowAttachmentPreview] = useState(false);
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<
    string | null
  >(null);

  // Draft state
  const [_hasDraft, setHasDraft] = useState(false);
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
    quotaInfo: _quotaInfo,
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
            if (Array.isArray(draft.cc) && draft.cc.length) {
              setCc(serializeEmailList(draft.cc));
              setShowCc(true);
            }
            if (Array.isArray(draft.bcc) && draft.bcc.length) {
              setBcc(serializeEmailList(draft.bcc));
              setShowBcc(true);
            }
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
          return; // Skip draft loading: template takes precedence
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

        const draft = loadLocalDraft();
        if (draft) {
          setHasDraft(true);
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
    lastSavedContentRef.current = contentHash({
      subject: draft.subject,
      content: draft.content,
      recipients: draft.recipients,
      attachments: draft.attachments || [],
    });
    setShowDraftRecoveryDialog(false);
    setPendingDraft(null);
    toast.success("Draft restored!");
  }, []);

  const clearDraft = useCallback(() => {
    try {
      clearLocalDraft();
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

  const currentContentHash = useMemo(
    () => contentHash({ subject, content, recipients, attachments }),
    [subject, content, recipients, attachments],
  );

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
      }, AUTO_SAVE_DELAY_MS);
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

  const saveDraft = useCallback(() => {
    try {
      if (!subject && !content && recipients.length === 0) {
        return;
      }

      setIsSavingDraft(true);
      setDraftSyncStatus("saving");

      const draft = buildLocalDraft({
        subject,
        content,
        recipients,
        attachments,
      });
      saveLocalDraft(draft);

      lastSavedContentRef.current = contentHash({
        subject,
        content,
        recipients,
        attachments,
      });
      setLastSaved(new Date());
      setHasDraft(true);
      setHasUnsavedChanges(false);
      setDraftSyncStatus("saved");
      setIsSavingDraft(false);

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

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) {
      return;
    }

    const processingAttachments = createProcessingAttachments(files);
    setAttachments((prev) => [...prev, ...processingAttachments]);
    setIsUploading(true);

    const fileArray = Array.from(files);
    const results = await Promise.all(
      fileArray.map(async (file, index) => {
        const tempId = processingAttachments[index].tempId!;
        const result = await processAttachmentFile(file, tempId);
        if (result.success && result.update) {
          setAttachments((prev) =>
            prev.map((a) =>
              a.tempId === tempId ? { ...a, ...result.update } : a,
            ),
          );
        } else if (!result.success) {
          setAttachments((prev) => prev.filter((a) => a.tempId !== tempId));
        }
        return result;
      }),
    );

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

  const clearAllRecipients = () => {
    setRecipients([]);
    setSelectedContacts(new Set());
    setSelectedGroups(new Set());
    setManualEntries([]);
    setCsvData([]);
    setCsvHeaders([]);
    setPdfColumn(null);
    setShowPersonalizedAttachments(false);
    toast.success("All recipients cleared");
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
    const contact = contacts.find((c) => c.email === recipientEmail);

    // Merge data sources (CSV takes precedence, then manual entry, then contact)
    const recipientData: Record<string, string> & { email: string } = {
      email: recipientEmail,
      ...(contact?.name ? { name: contact.name } : {}),
      ...(contact?.company ? { company: contact.company } : {}),
      ...(contact?.phone ? { phone: contact.phone } : {}),
      ...(contact?.tags?.length ? { tags: contact.tags.join(", ") } : {}),
      ...(contact?.customFields || {}),
      ...(manualEntry?.name ? { name: manualEntry.name } : {}),
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
        const wrappedHtml = buildGmailPreviewWrapper(formattedHtml);
        setFormattedPreviewHtml(wrappedHtml);
      } catch (error) {
        componentLogger.error(
          "Failed to load formatted preview",
          error instanceof Error ? error : undefined,
        );
        // Fallback to basic preview
        setFormattedPreviewHtml(buildGmailPreviewWrapper(preview.content));
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

    const ccList = parseEmailList(cc);
    const bccList = parseEmailList(bcc);
    if (ccList.length > 50 || bccList.length > 50) {
      toast.error("Cc and Bcc can each contain at most 50 addresses");
      return;
    }
    const bad = [...ccList, ...bccList].filter((e) => !isValidEmail(e));
    if (bad.length) {
      toast.error(`Invalid Cc/Bcc address: ${bad[0]}`);
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
        const processedAttachments = await Promise.all(
          attachments.map((a) => ensureAppwriteAttachment(a)),
        );

        const recipientCsvData = filteredRecipients.map((recipientEmail) =>
          buildRecipientFields({
            email: recipientEmail,
            csvData,
            manualEntries,
            contacts,
          }),
        );

        const draftEmailData = {
          subject,
          content: finalContent,
          recipients: filteredRecipients,
          saved_at: savedAt,
          attachments: processedAttachments.filter((a) => a.appwrite_file_id), // Only save attachments that were uploaded
          csv_data: recipientCsvData,
          cc: ccList,
          bcc: bccList,
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

    const personalizedEmails = buildPersonalizedEmails({
      recipients: filteredRecipients,
      subject,
      content: finalContent,
      csvData,
      manualEntries,
      contacts,
      attachments,
      pdfColumn,
    });

    try {
      const campaignId = generateCampaignId();

      const results = await sendEmails(personalizedEmails, {
        campaignId,
        isTransactional: !isMarketing,
        trackingEnabled,
        ...(ccList.length ? { cc: ccList } : {}),
        ...(bccList.length ? { bcc: bccList } : {}),
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
            status: r.status,
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

  const stepMeta = {
    recipients: {
      label: "Recipients",
      desc: "Choose who receives this campaign",
      icon: <Users className="h-4 w-4" />,
    },
    compose: {
      label: "Compose",
      desc: "Write your subject and message",
      icon: <Pen className="h-4 w-4" />,
    },
    preview: {
      label: "Preview",
      desc: "Check rendering and personalization",
      icon: <Eye className="h-4 w-4" />,
    },
  } as const;

  const activeStep =
    stepMeta[activeTab as keyof typeof stepMeta] ?? stepMeta.compose;
  const activeSection = activeTab as ComposeSectionId;

  return (
    <div className="relative space-y-8 pb-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-8 h-64 -z-10 bg-primary/5"
      />
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

      <PageHeader
        title="New Campaign"
        description={
          <div className="flex items-center gap-1.5 sm:gap-2 text-sm mt-1 sm:mt-0">
            {draftSyncStatus === "saving" || isSavingDraft ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                <span className="text-muted-foreground">Saving...</span>
              </>
            ) : draftSyncStatus === "saved" ? (
              <>
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-success">
                  Saved {lastSaved ? getTimeAgo(lastSaved) : ""}
                </span>
              </>
            ) : draftSyncStatus === "error" ? (
              <>
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-destructive">Failed to save</span>
              </>
            ) : hasUnsavedChanges ? (
              <>
                <AlertCircle className="h-4 w-4 text-warning" />
                <span className="text-warning">Unsaved changes</span>
              </>
            ) : lastSaved ? (
              <>
                <Save className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Draft saved {getTimeAgo(lastSaved)}
                </span>
              </>
            ) : null}
            {!isSavingDraft &&
              draftSyncStatus !== "saving" &&
              draftSyncStatus !== "saved" &&
              draftSyncStatus !== "error" &&
              !hasUnsavedChanges &&
              !lastSaved && (
                <>
                  <Save className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Draft</span>
                </>
              )}
            <span className="hidden sm:inline text-xs text-muted-foreground opacity-50">
              (Ctrl+S)
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                saveDraft();
                toast.success("Draft saved");
              }}
              disabled={isSavingDraft || !hasUnsavedChanges}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
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
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              Discard
            </Button>
          </div>
        }
      />

      <div className="flex flex-col md:flex-row gap-6 md:gap-8 min-h-[600px] w-full">
        {/* Step Indicator Sidebar */}
        <div className="w-full md:w-64 shrink-0">
          <div className="sticky top-8 space-y-4">
            <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-5">
              Steps
            </h3>
            <div className="relative">
              <div className="absolute left-4 top-4 bottom-4 w-0.5 border-l border-dashed border-border/70 hidden md:block" />
              <div className="flex justify-between md:block space-y-0 md:space-y-6 relative z-10 overflow-x-auto overflow-y-hidden md:overflow-visible pb-2 md:pb-0 px-1">
                {[
                  {
                    id: "recipients",
                    label: "Recipients",
                    desc: "Who gets this?",
                  },
                  { id: "compose", label: "Compose", desc: "Write your copy" },
                  {
                    id: "preview",
                    label: "Preview",
                    desc: "Check how it looks",
                  },
                ].map((s, i) => {
                  const isActive = s.id === activeTab;
                  const stepIndex = [
                    "recipients",
                    "compose",
                    "preview",
                  ].indexOf(s.id);
                  const currentIndex = [
                    "recipients",
                    "compose",
                    "preview",
                  ].indexOf(activeTab);
                  const isCompleted = stepIndex < currentIndex;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveTab(s.id)}
                      className="flex items-center md:items-start gap-3 md:gap-4 md:w-full min-w-max pr-4 md:pr-0 pl-1 md:pl-0 text-left transition-all group outline-none"
                    >
                      <div
                        className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors shrink-0 ${
                          isActive
                            ? "border-primary bg-primary text-primary-foreground shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]"
                            : isCompleted
                              ? "border-primary/50 bg-primary/10 text-primary"
                              : "border-muted-foreground/30 text-muted-foreground group-hover:border-muted-foreground/60"
                        }`}
                      >
                        {isCompleted && !isActive ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <span className="text-xs font-semibold">{i + 1}</span>
                        )}
                      </div>
                      <div className="hidden md:block">
                        <p
                          className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          {s.label}
                        </p>
                        <p
                          className={`text-xs ${isActive ? "text-muted-foreground" : "text-muted-foreground/60"}`}
                        >
                          {s.desc}
                        </p>
                      </div>
                      <span className="md:hidden text-sm font-medium ml-2">
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Main Panel Wrapper */}
        <div className="flex-1 min-w-0 flex flex-col w-full rounded-xl border bg-card shadow-sm overflow-hidden h-fit">
          {/* Panel chrome */}
          <div className="px-4 md:px-6 lg:px-8 py-3 border-b bg-muted/10">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center justify-center h-8 w-8 rounded-lg border bg-background/60 text-primary">
                    {activeStep.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {activeStep.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {activeStep.desc}
                    </p>
                  </div>
                </div>
              </div>
              <div className="shrink-0 hidden sm:flex items-center gap-2">
                <Badge variant="outline" className="bg-background/60">
                  Step{" "}
                  {["recipients", "compose", "preview"].indexOf(activeTab) + 1}
                  /3
                </Badge>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6 lg:p-8 pb-28 flex-1 min-h-0 overflow-y-auto space-y-6">
            {/* Recipients Tab */}
            <div className={activeTab === "recipients" ? "block" : "hidden"}>
              <RecipientsStep
                manualEmail={manualEmail}
                manualName={manualName}
                manualEntries={manualEntries}
                csvData={csvData}
                groups={groups}
                selectedGroups={selectedGroups}
                contacts={contacts}
                selectedContacts={selectedContacts}
                recipients={recipients}
                setManualEmail={setManualEmail}
                setManualName={setManualName}
                addManualEntry={addManualEntry}
                handleCsvData={handleCsvData}
                toggleGroup={toggleGroup}
                toggleContact={toggleContact}
                removeRecipient={removeRecipient}
                clearAllRecipients={clearAllRecipients}
              />
            </div>

            {/* Compose Tab */}
            <div
              className={activeTab === "compose" ? "block space-y-6" : "hidden"}
            >
              <ComposeStep
                showHtmlImport={showHtmlImport}
                htmlImportCode={htmlImportCode}
                showTemplateDialog={showTemplateDialog}
                templates={templates}
                templateSearch={templateSearch}
                isLoadingTemplates={isLoadingTemplates}
                subject={subject}
                content={content}
                cc={cc}
                bcc={bcc}
                showCc={showCc}
                showBcc={showBcc}
                attachments={attachments}
                isUploading={isUploading}
                csvData={csvData}
                csvHeaders={csvHeaders}
                pdfColumn={pdfColumn}
                showPersonalizedAttachments={showPersonalizedAttachments}
                signatures={signatures}
                selectedSignature={selectedSignature}
                isMarketing={isMarketing}
                saveAsDraft={saveAsDraft}
                hasAbTestId={Boolean(searchParams.get("abTestId"))}
                router={router}
                setShowHtmlImport={setShowHtmlImport}
                setHtmlImportCode={setHtmlImportCode}
                setShowTemplateDialog={setShowTemplateDialog}
                setTemplateSearch={setTemplateSearch}
                setSubject={setSubject}
                setContent={setContent}
                setCc={setCc}
                setBcc={setBcc}
                setShowCc={setShowCc}
                setShowBcc={setShowBcc}
                handleFileUpload={handleFileUpload}
                removeAttachment={removeAttachment}
                setPreviewAttachmentUrl={setPreviewAttachmentUrl}
                setShowAttachmentPreview={setShowAttachmentPreview}
                setShowPersonalizedAttachments={setShowPersonalizedAttachments}
                setPdfColumn={setPdfColumn}
                setSelectedSignature={setSelectedSignature}
                setIsMarketing={setIsMarketing}
                setSaveAsDraft={setSaveAsDraft}
                applyTemplate={applyTemplate}
                loadTemplates={loadTemplates}
              />
            </div>

            {/* Preview Tab */}
            <div className={activeTab === "preview" ? "block" : "hidden"}>
              <PreviewStep
                previewMode={previewMode}
                setPreviewMode={setPreviewMode}
                setShowClientPreview={setShowClientPreview}
                recipients={recipients}
                previewRecipientIndex={previewRecipientIndex}
                setPreviewRecipientIndex={setPreviewRecipientIndex}
                getPersonalizedContent={getPersonalizedContent}
                subject={subject}
                content={content}
                cc={cc}
                bcc={bcc}
                csvData={csvData}
                manualEntries={manualEntries}
                isLoadingPreview={isLoadingPreview}
                formattedPreviewHtml={formattedPreviewHtml}
                createGmailPreviewWrapper={buildGmailPreviewWrapper}
                attachments={attachments}
                pdfColumn={pdfColumn}
              />
            </div>

            {/* Send step removed — Dispatch happens in Preview */}

            {/* Main Form Next/Back Actions removed (replaced by StickyActionBar) */}
          </div>
        </div>
      </div>

      <StickyActionBar
        activeSection={activeSection}
        recipientsCount={recipients.length}
        canGoBack={activeTab !== "recipients"}
        canGoNext={activeTab !== "preview"}
        onBack={() => {
          const steps: ComposeSectionId[] = [
            "recipients",
            "compose",
            "preview",
          ];
          const idx = steps.indexOf(activeSection);
          if (idx > 0) {
            setActiveTab(steps[idx - 1]);
          }
        }}
        onNext={() => {
          const steps: ComposeSectionId[] = [
            "recipients",
            "compose",
            "preview",
          ];
          const idx = steps.indexOf(activeSection);
          if (idx < steps.length - 1) {
            setActiveTab(steps[idx + 1]);
          }
        }}
        onDispatch={handleSend}
        isDispatching={isPreparingSend || isSending}
        dispatchDisabled={
          isSending ||
          isPreparingSend ||
          isSavingDraft ||
          isUploading ||
          attachments.some((a) => a.isProcessing) ||
          !subject ||
          !content ||
          recipients.length === 0
        }
      />

      <SendingStatusDialog
        open={showSendingDialog}
        setOpen={setShowSendingDialog}
        isSending={isSending}
        isStopping={isStopping}
        progress={progress}
        sendError={sendError}
        sendStatus={sendStatus}
        hasPendingRetries={hasPendingRetries}
        failedEmails={failedEmails}
        stopSending={stopSending}
        retryFailedEmails={retryFailedEmails}
        isOffline={isOffline}
        isPaused={isPaused}
        router={router}
      />

      <DraftRecoveryDialog
        open={showDraftRecoveryDialog}
        draft={pendingDraft}
        onOpenChange={setShowDraftRecoveryDialog}
        onDiscard={discardPendingDraft}
        onRestore={restoreDraft}
      />

      <AttachmentPreviewDialog
        open={showAttachmentPreview}
        previewAttachmentUrl={previewAttachmentUrl}
        previewRecipientIndex={previewRecipientIndex}
        personalizedAttachmentMetadata={personalizedAttachmentMetadata}
        onOpenChange={(open) => {
          setShowAttachmentPreview(open);
          if (!open) {
            setPreviewAttachmentUrl(null);
          }
        }}
        getPersonalizedContent={getPersonalizedContent}
      />

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
