/**
 * Compose Store
 *
 * Zustand store for managing email composition state.
 * Handles the compose form data, attachments, recipients, and sending state.
 *
 * @module lib/stores/compose-store
 *
 * @example
 * ```tsx
 * import { useComposeStore } from '@/lib/stores'
 *
 * function ComposeForm() {
 *   const { formData, setSubject, setContent, addRecipient } = useComposeStore()
 *
 *   return (
 *     <form>
 *       <input
 *         value={formData.subject}
 *         onChange={(e) => setSubject(e.target.value)}
 *       />
 *       <RichTextEditor
 *         content={formData.content}
 *         onChange={setContent}
 *       />
 *     </form>
 *   )
 * }
 * ```
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

/**
 * Attachment data structure
 */
export interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url?: string;
  appwriteFileId?: string;
  uploadProgress?: number;
  error?: string;
}

/**
 * Recipient with optional personalization data
 */
export interface Recipient {
  email: string;
  name?: string;
  csvData?: Record<string, string>;
}

/**
 * Form data for composing emails
 */
export interface ComposeFormData {
  subject: string;
  content: string;
  recipients: Recipient[];
  attachments: Attachment[];
  templateId?: string;
  signatureId?: string;
  scheduledAt?: Date;
}

/**
 * Sending status for tracking email delivery
 */
export interface SendingStatus {
  isSending: boolean;
  progress: number;
  currentRecipient: number;
  totalRecipients: number;
  errors: Array<{ email: string; error: string }>;
  completedAt?: Date;
}

/**
 * State shape for the compose store
 */
export interface ComposeState {
  // Form data
  formData: ComposeFormData;

  // Draft state
  isDraft: boolean;
  draftId: string | null;
  lastSavedAt: Date | null;
  hasUnsavedChanges: boolean;

  // Sending state
  sendingStatus: SendingStatus;

  // Validation
  errors: Record<string, string>;

  // Actions - Form
  setSubject: (subject: string) => void;
  setContent: (content: string) => void;
  setTemplate: (templateId: string | undefined) => void;
  setSignature: (signatureId: string | undefined) => void;
  setScheduledAt: (date: Date | undefined) => void;

  // Actions - Recipients
  addRecipient: (recipient: Recipient) => void;
  addRecipients: (recipients: Recipient[]) => void;
  removeRecipient: (email: string) => void;
  clearRecipients: () => void;
  updateRecipientData: (email: string, data: Record<string, string>) => void;

  // Actions - Attachments
  addAttachment: (attachment: Attachment) => void;
  removeAttachment: (id: string) => void;
  updateAttachmentProgress: (id: string, progress: number) => void;
  setAttachmentError: (id: string, error: string) => void;
  clearAttachments: () => void;

  // Actions - Draft
  saveDraft: () => Promise<void>;
  loadDraft: (draftId: string) => Promise<void>;
  markAsSaved: (draftId?: string) => void;

  // Actions - Sending
  startSending: () => void;
  updateSendingProgress: (current: number, total: number) => void;
  addSendingError: (email: string, error: string) => void;
  completeSending: () => void;
  cancelSending: () => void;

  // Actions - Validation
  validate: () => boolean;
  setError: (field: string, error: string) => void;
  clearError: (field: string) => void;
  clearAllErrors: () => void;

  // Actions - Reset
  reset: () => void;
}

/**
 * Initial form data
 */
const initialFormData: ComposeFormData = {
  subject: "",
  content: "",
  recipients: [],
  attachments: [],
  templateId: undefined,
  signatureId: undefined,
  scheduledAt: undefined,
};

/**
 * Initial sending status
 */
const initialSendingStatus: SendingStatus = {
  isSending: false,
  progress: 0,
  currentRecipient: 0,
  totalRecipients: 0,
  errors: [],
};

/**
 * Compose store using Zustand
 *
 * Features:
 * - Draft auto-save
 * - Sending progress tracking
 * - Form validation
 * - Persisted draft state
 */
export const useComposeStore = create<ComposeState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        formData: initialFormData,
        isDraft: false,
        draftId: null,
        lastSavedAt: null,
        hasUnsavedChanges: false,
        sendingStatus: initialSendingStatus,
        errors: {},

        // Form actions
        setSubject: (subject: string) => {
          set((state) => ({
            formData: { ...state.formData, subject },
            hasUnsavedChanges: true,
          }));
        },

        setContent: (content: string) => {
          set((state) => ({
            formData: { ...state.formData, content },
            hasUnsavedChanges: true,
          }));
        },

        setTemplate: (templateId: string | undefined) => {
          set((state) => ({
            formData: { ...state.formData, templateId },
            hasUnsavedChanges: true,
          }));
        },

        setSignature: (signatureId: string | undefined) => {
          set((state) => ({
            formData: { ...state.formData, signatureId },
            hasUnsavedChanges: true,
          }));
        },

        setScheduledAt: (date: Date | undefined) => {
          set((state) => ({
            formData: { ...state.formData, scheduledAt: date },
            hasUnsavedChanges: true,
          }));
        },

        // Recipient actions
        addRecipient: (recipient: Recipient) => {
          set((state) => {
            // Prevent duplicates
            if (
              state.formData.recipients.some((r) => r.email === recipient.email)
            ) {
              return state;
            }
            return {
              formData: {
                ...state.formData,
                recipients: [...state.formData.recipients, recipient],
              },
              hasUnsavedChanges: true,
            };
          });
        },

        addRecipients: (recipients: Recipient[]) => {
          set((state) => {
            const existingEmails = new Set(
              state.formData.recipients.map((r) => r.email),
            );
            const newRecipients = recipients.filter(
              (r) => !existingEmails.has(r.email),
            );
            return {
              formData: {
                ...state.formData,
                recipients: [...state.formData.recipients, ...newRecipients],
              },
              hasUnsavedChanges: true,
            };
          });
        },

        removeRecipient: (email: string) => {
          set((state) => ({
            formData: {
              ...state.formData,
              recipients: state.formData.recipients.filter(
                (r) => r.email !== email,
              ),
            },
            hasUnsavedChanges: true,
          }));
        },

        clearRecipients: () => {
          set((state) => ({
            formData: { ...state.formData, recipients: [] },
            hasUnsavedChanges: true,
          }));
        },

        updateRecipientData: (email: string, data: Record<string, string>) => {
          set((state) => ({
            formData: {
              ...state.formData,
              recipients: state.formData.recipients.map((r) =>
                r.email === email
                  ? { ...r, csvData: { ...r.csvData, ...data } }
                  : r,
              ),
            },
            hasUnsavedChanges: true,
          }));
        },

        // Attachment actions
        addAttachment: (attachment: Attachment) => {
          set((state) => ({
            formData: {
              ...state.formData,
              attachments: [...state.formData.attachments, attachment],
            },
            hasUnsavedChanges: true,
          }));
        },

        removeAttachment: (id: string) => {
          set((state) => ({
            formData: {
              ...state.formData,
              attachments: state.formData.attachments.filter(
                (a) => a.id !== id,
              ),
            },
            hasUnsavedChanges: true,
          }));
        },

        updateAttachmentProgress: (id: string, progress: number) => {
          set((state) => ({
            formData: {
              ...state.formData,
              attachments: state.formData.attachments.map((a) =>
                a.id === id ? { ...a, uploadProgress: progress } : a,
              ),
            },
          }));
        },

        setAttachmentError: (id: string, error: string) => {
          set((state) => ({
            formData: {
              ...state.formData,
              attachments: state.formData.attachments.map((a) =>
                a.id === id ? { ...a, error } : a,
              ),
            },
          }));
        },

        clearAttachments: () => {
          set((state) => ({
            formData: { ...state.formData, attachments: [] },
            hasUnsavedChanges: true,
          }));
        },

        // Draft actions
        saveDraft: async () => {
          const { formData, draftId } = get();
          try {
            const payload = {
              subject: formData.subject,
              content: formData.content,
              recipients: formData.recipients,
              attachments: formData.attachments,
              saved_at: new Date().toISOString(),
              id: draftId, // Only used for PUT
            };

            const method = draftId ? "PUT" : "POST";
            const response = await fetch("/api/appwrite/draft-emails", {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || "Failed to save draft");
            }

            const result = await response.json();
            const newDraftId = result.$id;

            set({
              isDraft: true,
              draftId: newDraftId,
              lastSavedAt: new Date(),
              hasUnsavedChanges: false,
            });
          } catch (error) {
            console.error("Failed to save draft:", error);
          }
        },

        loadDraft: async (draftId: string) => {
          try {
            const response = await fetch(
              `/api/appwrite/draft-emails?id=${draftId}`,
            );
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || "Failed to load draft");
            }

            const draft = await response.json();

            set({
              formData: {
                subject: draft.subject || "",
                content: draft.content || "",
                recipients: draft.recipients || [],
                attachments: draft.attachments || [],
                templateId: draft.templateId,
                signatureId: draft.signatureId,
                scheduledAt: draft.scheduledAt
                  ? new Date(draft.scheduledAt)
                  : undefined,
              },
              draftId: draft.$id,
              isDraft: true,
              lastSavedAt: draft.saved_at ? new Date(draft.saved_at) : null,
              hasUnsavedChanges: false,
            });
          } catch (error) {
            console.error("Failed to load draft:", error);
          }
        },

        markAsSaved: (draftId?: string) => {
          set({
            isDraft: true,
            draftId: draftId || get().draftId,
            lastSavedAt: new Date(),
            hasUnsavedChanges: false,
          });
        },

        // Sending actions
        startSending: () => {
          set({
            sendingStatus: {
              isSending: true,
              progress: 0,
              currentRecipient: 0,
              totalRecipients: get().formData.recipients.length,
              errors: [],
            },
          });
        },

        updateSendingProgress: (current: number, total: number) => {
          set((state) => ({
            sendingStatus: {
              ...state.sendingStatus,
              currentRecipient: current,
              totalRecipients: total,
              progress: Math.round((current / total) * 100),
            },
          }));
        },

        addSendingError: (email: string, error: string) => {
          set((state) => ({
            sendingStatus: {
              ...state.sendingStatus,
              errors: [...state.sendingStatus.errors, { email, error }],
            },
          }));
        },

        completeSending: () => {
          set((state) => ({
            sendingStatus: {
              ...state.sendingStatus,
              isSending: false,
              progress: 100,
              completedAt: new Date(),
            },
          }));
        },

        cancelSending: () => {
          set({
            sendingStatus: {
              ...get().sendingStatus,
              isSending: false,
            },
          });
        },

        // Validation actions
        validate: () => {
          const { formData } = get();
          const errors: Record<string, string> = {};

          if (!formData.subject.trim()) {
            errors.subject = "Subject is required";
          }

          if (!formData.content.trim()) {
            errors.content = "Email content is required";
          }

          if (formData.recipients.length === 0) {
            errors.recipients = "At least one recipient is required";
          }

          set({ errors });
          return Object.keys(errors).length === 0;
        },

        setError: (field: string, error: string) => {
          set((state) => ({
            errors: { ...state.errors, [field]: error },
          }));
        },

        clearError: (field: string) => {
          set((state) => {
            const { [field]: _, ...rest } = state.errors;
            return { errors: rest };
          });
        },

        clearAllErrors: () => {
          set({ errors: {} });
        },

        // Reset
        reset: () => {
          set({
            formData: initialFormData,
            isDraft: false,
            draftId: null,
            lastSavedAt: null,
            hasUnsavedChanges: false,
            sendingStatus: initialSendingStatus,
            errors: {},
          });
        },
      }),
      {
        name: "compose-store",
        // Persist draft data for recovery
        partialize: (state) => ({
          formData: state.formData,
          isDraft: state.isDraft,
          draftId: state.draftId,
          lastSavedAt: state.lastSavedAt,
        }),
      },
    ),
    { name: "ComposeStore" },
  ),
);

// Selector hooks
export const useComposeFormData = () =>
  useComposeStore((state) => state.formData);
export const useSendingStatus = () =>
  useComposeStore((state) => state.sendingStatus);
export const useComposeErrors = () => useComposeStore((state) => state.errors);
export const useHasUnsavedChanges = () =>
  useComposeStore((state) => state.hasUnsavedChanges);
