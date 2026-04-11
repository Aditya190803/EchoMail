import type { DraftEmail } from "@/types/appwrite-client";

import { apiRequest } from "../api-request";
import { createCrudService } from "../service-factory";

// ============================================
// Draft Emails Service (via API)
// ============================================

const draftEmailsCrudService = createCrudService<
  DraftEmail,
  Omit<DraftEmail, "$id" | "created_at" | "sent_at" | "user_email" | "status">,
  Partial<Omit<DraftEmail, "$id" | "user_email" | "created_at" | "status">>
>("draft-emails");

export const draftEmailsService = {
  ...draftEmailsCrudService,

  async updateStatus(
    emailId: string,
    status: DraftEmail["status"],
    error?: string,
  ) {
    return apiRequest<DraftEmail>("/api/appwrite/draft-emails", {
      method: "PUT",
      body: JSON.stringify({ id: emailId, status, error }),
    });
  },

  async cancel(emailId: string) {
    return this.updateStatus(emailId, "cancelled");
  },

  subscribeToUserDraftEmails(
    _userEmail: string,
    _callback: (response: any) => void,
  ) {
    return () => {};
  },
};
