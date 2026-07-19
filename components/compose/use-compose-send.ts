"use client";

import { useState } from "react";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { toast } from "sonner";

import type { useEmailSend } from "@/hooks/useEmailSend";
import { generateCampaignId } from "@/lib/analytics";
import {
  campaignsService,
  draftEmailsService,
  unsubscribesService,
  type EmailSignature,
} from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";
import { parseEmailList } from "@/lib/email/parse-list";
import { isValidEmail } from "@/lib/validation";
import type { CSVRow } from "@/types/email";

import { ensureAppwriteAttachment } from "./attachment-upload";
import {
  buildPersonalizedEmails,
  buildRecipientFields,
} from "./recipient-data";

import type { ComposeAttachment, Contact } from "./compose-types";

interface UseComposeSendArgs {
  router: AppRouterInstance;
  session: { user?: { email?: string | null } | null } | null | undefined;
  subject: string;
  content: string;
  cc: string;
  bcc: string;
  recipients: string[];
  attachments: ComposeAttachment[];
  csvData: CSVRow[];
  manualEntries: { email: string; name: string }[];
  contacts: Contact[];
  isMarketing: boolean;
  trackingEnabled: boolean;
  selectedSignature: string | null;
  signatures: EmailSignature[];
  saveAsDraft: boolean;
  editingDraftId: string | null;
  pdfColumn: string | null;
  showPersonalizedAttachments: boolean;
  sendEmails: ReturnType<typeof useEmailSend>["sendEmails"];
  clearDraft: () => void;
  setIsSavingDraft: (value: boolean) => void;
}

/**
 * Orchestrates the final "send" (or "save as draft") action: validation,
 * unsubscribe filtering, signature appending, draft persistence to
 * Appwrite, and dispatching personalized emails via `useEmailSend`.
 */
export function useComposeSend({
  router,
  session,
  subject,
  content,
  cc,
  bcc,
  recipients,
  attachments,
  csvData,
  manualEntries,
  contacts,
  isMarketing,
  trackingEnabled,
  selectedSignature,
  signatures,
  saveAsDraft,
  editingDraftId,
  pdfColumn,
  showPersonalizedAttachments,
  sendEmails,
  clearDraft,
  setIsSavingDraft,
}: UseComposeSendArgs) {
  const [isPreparingSend, setIsPreparingSend] = useState(false);
  const [showSendingDialog, setShowSendingDialog] = useState(false);

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

  return {
    handleSend,
    isPreparingSend,
    showSendingDialog,
    setShowSendingDialog,
  };
}
