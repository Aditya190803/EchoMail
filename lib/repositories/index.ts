/**
 * Legacy repository helpers.
 *
 * The app now uses service modules under `lib/appwrite/services/` as the
 * primary data-access abstraction. These repository exports remain for the
 * smaller set of call sites that still expect repository-style helpers.
 *
 * @module lib/repositories
 */

// Base repository types
export type {
  BaseEntity,
  PaginationOptions,
  SortOptions,
  FilterOptions,
  QueryOptions,
  PaginatedResponse,
} from "./base-repository";

// Contact repository helpers
export {
  ContactRepository,
  createContactRepository,
  type Contact,
  type CreateContactDTO,
  type UpdateContactDTO,
} from "./contact-repository";

// Template repository helpers
export {
  TemplateRepository,
  getTemplateRepository,
  type EmailTemplate,
  type CreateTemplateDTO,
  type UpdateTemplateDTO,
} from "./template-repository";

// Campaign repository helpers
export {
  CampaignRepository,
  getCampaignRepository,
  type EmailCampaign,
  type CampaignStats,
} from "./campaign-repository";
