import type { EmailSignature } from "@/types/appwrite-client";

import { apiRequest } from "../api-request";
import { createCrudService } from "../service-factory";

// ============================================
// Signatures Service (via API)
// ============================================

const signaturesCrudService = createCrudService<
  EmailSignature,
  Omit<EmailSignature, "$id" | "created_at" | "updated_at" | "user_email">,
  Partial<Omit<EmailSignature, "$id" | "user_email" | "created_at">>
>("signatures");

export const signaturesService = {
  ...signaturesCrudService,

  async getDefault(_userEmail: string): Promise<EmailSignature | null> {
    const response = await apiRequest<{
      total: number;
      documents: EmailSignature[];
    }>("/api/appwrite/signatures?default=true");
    return response.documents[0] || null;
  },

  async setAsDefault(_userEmail: string, signatureId: string) {
    return apiRequest<EmailSignature>("/api/appwrite/signatures", {
      method: "PUT",
      body: JSON.stringify({ id: signatureId, setAsDefault: true }),
    });
  },
};
