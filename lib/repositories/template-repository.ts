/**
 * Template Repository
 *
 * Implements the Repository pattern for EmailTemplate entities.
 * Provides clean data access interface for template management operations.
 *
 * @module lib/repositories/template-repository
 */

import { templatesService, type EmailTemplate } from "@/lib/appwrite";

import {
  type QueryOptions,
  type PaginatedResponse,
  type FilterOptions,
  type SortOptions,
} from "./base-repository";

// Re-export EmailTemplate type
export type { EmailTemplate };

/**
 * DTO for creating a new template
 */
export interface CreateTemplateDTO {
  name: string;
  subject: string;
  content: string;
  category?: string;
}

/**
 * DTO for updating an existing template
 */
export interface UpdateTemplateDTO {
  name?: string;
  subject?: string;
  content?: string;
  category?: string;
}

/**
 * TemplateRepository
 *
 * Handles all data access operations for EmailTemplate entities.
 * Uses the templatesService which communicates with Appwrite via API routes.
 *
 * @example
 * ```typescript
 * const templateRepo = new TemplateRepository('user@example.com');
 *
 * // Create a template
 * const template = await templateRepo.create({
 *   name: 'Welcome Email',
 *   subject: 'Welcome to {{company}}',
 *   content: '<p>Hello {{name}}!</p>'
 * });
 *
 * // Find all user's templates
 * const templates = await templateRepo.findAll();
 *
 * // Search templates
 * const results = await templateRepo.search('welcome');
 * ```
 */
export class TemplateRepository {
  private userEmail: string;

  constructor(userEmail: string = "") {
    this.userEmail = userEmail;
  }

  /**
   * Set the user email for subsequent operations
   */
  setUserEmail(email: string): void {
    this.userEmail = email;
  }

  /**
   * Get the current user email
   */
  getUserEmail(): string {
    return this.userEmail;
  }

  /**
   * Find a template by ID
   */
  async findById(id: string): Promise<EmailTemplate | null> {
    try {
      const response = await templatesService.listByUser(this.userEmail);
      const template = response.documents.find((t) => t.$id === id);
      return template || null;
    } catch (error) {
      console.error("TemplateRepository.findById error:", error);
      return null;
    }
  }

  /**
   * Find all templates with optional pagination and filtering
   */
  async findAll(
    options?: QueryOptions,
  ): Promise<PaginatedResponse<EmailTemplate>> {
    try {
      const response = await templatesService.listByUser(this.userEmail);
      let documents = response.documents;

      // Apply filters in memory
      if (options?.filters) {
        documents = this.applyFilters(documents, options.filters);
      }

      // Apply sorting in memory
      if (options?.sort && options.sort.length > 0) {
        documents = this.applySorting(documents, options.sort);
      } else {
        // Default sort by updated_at descending
        documents = [...documents].sort((a, b) => {
          const aDate = a.updated_at || a.created_at || "";
          const bDate = b.updated_at || b.created_at || "";
          return bDate.localeCompare(aDate);
        });
      }

      // Apply pagination in memory
      const limit = options?.pagination?.limit ?? 25;
      const offset = options?.pagination?.offset ?? 0;
      const paginatedDocs = documents.slice(offset, offset + limit);

      return {
        documents: paginatedDocs,
        total: documents.length,
        hasMore: offset + limit < documents.length,
      };
    } catch (error) {
      console.error("TemplateRepository.findAll error:", error);
      return { documents: [], total: 0, hasMore: false };
    }
  }

  /**
   * Find templates by category
   */
  async findByCategory(
    category: string,
    options?: QueryOptions,
  ): Promise<PaginatedResponse<EmailTemplate>> {
    const filters: FilterOptions[] = [
      { field: "category", operator: "eq", value: category },
      ...(options?.filters || []),
    ];

    return this.findAll({ ...options, filters });
  }

  /**
   * Search templates by name or subject
   */
  async search(
    query: string,
    options?: QueryOptions,
  ): Promise<PaginatedResponse<EmailTemplate>> {
    try {
      const response = await templatesService.listByUser(this.userEmail);
      const searchLower = query.toLowerCase();

      let documents = response.documents.filter(
        (template) =>
          template.name?.toLowerCase().includes(searchLower) ||
          template.subject?.toLowerCase().includes(searchLower) ||
          template.category?.toLowerCase().includes(searchLower),
      );

      // Apply additional filters
      if (options?.filters) {
        documents = this.applyFilters(documents, options.filters);
      }

      // Apply sorting
      if (options?.sort && options.sort.length > 0) {
        documents = this.applySorting(documents, options.sort);
      }

      // Apply pagination
      const limit = options?.pagination?.limit ?? 25;
      const offset = options?.pagination?.offset ?? 0;
      const paginatedDocs = documents.slice(offset, offset + limit);

      return {
        documents: paginatedDocs,
        total: documents.length,
        hasMore: offset + limit < documents.length,
      };
    } catch (error) {
      console.error("TemplateRepository.search error:", error);
      return { documents: [], total: 0, hasMore: false };
    }
  }

  /**
   * Create a new template
   */
  async create(data: CreateTemplateDTO): Promise<EmailTemplate> {
    return templatesService.create({
      ...data,
      user_email: this.userEmail,
    });
  }

  /**
   * Update an existing template
   */
  async update(id: string, data: UpdateTemplateDTO): Promise<EmailTemplate> {
    return templatesService.update(id, data);
  }

  /**
   * Delete a template
   */
  async delete(id: string): Promise<void> {
    await templatesService.delete(id);
  }

  /**
   * Get the count of all templates
   */
  async count(filters?: FilterOptions[]): Promise<number> {
    const response = await this.findAll({ filters });
    return response.total;
  }

  /**
   * Get all unique categories
   */
  async getCategories(): Promise<string[]> {
    try {
      const response = await templatesService.listByUser(this.userEmail);
      const categories = new Set<string>();

      response.documents.forEach((template) => {
        if (template.category) {
          categories.add(template.category);
        }
      });

      return Array.from(categories).sort();
    } catch (error) {
      console.error("TemplateRepository.getCategories error:", error);
      return [];
    }
  }

  /**
   * Apply filters to documents in memory
   */
  private applyFilters(
    documents: EmailTemplate[],
    filters: FilterOptions[],
  ): EmailTemplate[] {
    return documents.filter((doc) => {
      return filters.every((filter) => {
        const value = (doc as unknown as Record<string, unknown>)[filter.field];
        const filterValue = filter.value;

        switch (filter.operator) {
          case "eq":
            return value === filterValue;
          case "neq":
            return value !== filterValue;
          case "contains":
            return String(value)
              .toLowerCase()
              .includes(String(filterValue).toLowerCase());
          case "startsWith":
            return String(value)
              .toLowerCase()
              .startsWith(String(filterValue).toLowerCase());
          case "gt":
            return Number(value) > Number(filterValue);
          case "gte":
            return Number(value) >= Number(filterValue);
          case "lt":
            return Number(value) < Number(filterValue);
          case "lte":
            return Number(value) <= Number(filterValue);
          default:
            return true;
        }
      });
    });
  }

  /**
   * Apply sorting to documents in memory
   */
  private applySorting(
    documents: EmailTemplate[],
    sortOptions: SortOptions[],
  ): EmailTemplate[] {
    return [...documents].sort((a, b) => {
      for (const sort of sortOptions) {
        const aVal = (a as unknown as Record<string, unknown>)[sort.field];
        const bVal = (b as unknown as Record<string, unknown>)[sort.field];

        let comparison = 0;
        if (typeof aVal === "string" && typeof bVal === "string") {
          comparison = aVal.localeCompare(bVal);
        } else if (typeof aVal === "number" && typeof bVal === "number") {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        if (comparison !== 0) {
          return sort.direction === "desc" ? -comparison : comparison;
        }
      }
      return 0;
    });
  }
}

/**
 * Singleton instance factory
 */
let templateRepositoryInstance: TemplateRepository | null = null;

export function getTemplateRepository(userEmail?: string): TemplateRepository {
  if (!templateRepositoryInstance) {
    templateRepositoryInstance = new TemplateRepository(userEmail);
  } else if (
    userEmail &&
    templateRepositoryInstance.getUserEmail() !== userEmail
  ) {
    templateRepositoryInstance.setUserEmail(userEmail);
  }
  return templateRepositoryInstance;
}
