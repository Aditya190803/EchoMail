/**
 * Repository Pattern Implementation
 *
 * This module exports all repository classes for data access operations.
 * Using the Repository pattern provides:
 * - Clean separation of data access logic from business logic
 * - Easy swapping of data storage implementations
 * - Testability through dependency injection
 * - Consistent API across all entity types
 *
 * @module lib/repositories
 *
 * @example
 * ```typescript
 * import { getContactRepository, getTemplateRepository } from '@/lib/repositories';
 *
 * // Get repository instances
 * const contactRepo = getContactRepository('user@example.com');
 * const templateRepo = getTemplateRepository('user@example.com');
 *
 * // Use repositories for data operations
 * const contacts = await contactRepo.findAll();
 * const template = await templateRepo.findById('template-id');
 * ```
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

// Contact repository
export {
  ContactRepository,
  createContactRepository,
  contactRepository,
  type Contact,
  type CreateContactDTO,
  type UpdateContactDTO,
} from "./contact-repository";

// Template repository
export {
  TemplateRepository,
  getTemplateRepository,
  type EmailTemplate,
  type CreateTemplateDTO,
  type UpdateTemplateDTO,
} from "./template-repository";

// Campaign repository
export {
  CampaignRepository,
  getCampaignRepository,
  type EmailCampaign,
  type CampaignStats,
} from "./campaign-repository";
