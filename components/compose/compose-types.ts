import type { AttachmentMetadata as SharedAttachmentMetadata } from "@/lib/attachments/metadata";

export interface ComposeAttachment {
  tempId?: string;
  name: string;
  type: string;
  data: string;
  fileSize: number;
  isProcessing?: boolean;
  appwriteFileId?: string;
  appwriteUrl?: string;
  path?: string;
}

export interface Contact {
  $id: string;
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  tags?: string[];
  customFields?: Record<string, string>;
}

export interface ContactGroup {
  $id?: string;
  name: string;
  color?: string;
  contact_ids: string[];
}

export interface EmailDraft {
  subject: string;
  content: string;
  recipients: string[];
  attachments: ComposeAttachment[];
  savedAt: string;
}

export type AttachmentMetadata = SharedAttachmentMetadata;
