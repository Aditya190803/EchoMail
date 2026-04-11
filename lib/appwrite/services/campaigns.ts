import type {
  EmailCampaign,
  EmailCampaignInput,
} from "@/types/appwrite-client";

import { createCrudService } from "../service-factory";

// ============================================
// Campaigns Service (via API)
// ============================================

const campaignsCrudService = createCrudService<
  EmailCampaign,
  Omit<EmailCampaignInput, "user_email">,
  Partial<EmailCampaignInput>
>("campaigns");

export const campaignsService = {
  ...campaignsCrudService,

  subscribeToUserCampaigns(
    _userEmail: string,
    _callback: (response: any) => void,
  ) {
    // TODO: Wire this up to a real-time campaign updates channel.
    return () => {};
  },
};
