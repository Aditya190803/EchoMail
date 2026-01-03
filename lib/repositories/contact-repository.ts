/**
 * Contact Repository
 *
 * Implements the Repository pattern for Contact entities.
 * Provides clean data access interface for contact management operations.
 *
 * This repository wraps the existing contactsService which uses API routes
 * to communicate with the Appwrite backend, providing a consistent interface
 * for data access operations.
 *
 * @module lib/repositories/contact-repository
 */

import { contactsService, type Contact } from "@/lib/appwrite";

import {
  type QueryOptions,
  type PaginatedResponse,
  type FilterOptions,
} from "./base-repository";

// Re-export Contact type with BaseEntity extension
export type { Contact };

/**
 * DTO for creating a new contact
 */
export interface CreateContactDTO {
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  tags?: string[];
}

/**
 * DTO for updating an existing contact
 */
export interface UpdateContactDTO {
  email?: string;
  name?: string;
  company?: string;
  phone?: string;
  tags?: string[];
}

/**
 * ContactRepository
 *
 * Handles all data access operations for Contact entities.
 * Uses the contactsService which communicates with Appwrite via API routes.
 *
 * @example
 * ```typescript
 * const contactRepo = new ContactRepository('user@example.com');
 *
 * // Create a contact
 * const contact = await contactRepo.create({
 *   email: 'john@example.com',
 *   name: 'John Doe'
 * });
 *
 * // Find all user's contacts
 * const contacts = await contactRepo.findAll();
 *
 * // Search contacts
 * const results = await contactRepo.search('john');
 * ```
 */
export class ContactRepository {
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
   * Find a contact by ID
   */
  async findById(id: string): Promise<Contact | null> {
    try {
      const response = await contactsService.listByUser(this.userEmail);
      const contact = response.documents.find((c) => c.$id === id);
      return contact || null;
    } catch (error) {
      console.error("ContactRepository.findById error:", error);
      return null;
    }
  }

  /**
   * Find all contacts with optional pagination and filtering
   */
  async findAll(options?: QueryOptions): Promise<PaginatedResponse<Contact>> {
    try {
      const response = await contactsService.listByUser(this.userEmail);
      let documents = response.documents;

      // Apply filters in memory (since API doesn't support server-side filtering)
      if (options?.filters) {
        documents = this.applyFilters(documents, options.filters);
      }

      // Apply sorting in memory
      if (options?.sort && options.sort.length > 0) {
        documents = this.applySorting(documents, options.sort);
      } else {
        // Default sort by created_at descending
        documents = [...documents].sort((a, b) => {
          const aDate = a.created_at || "";
          const bDate = b.created_at || "";
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
      console.error("ContactRepository.findAll error:", error);
      return { documents: [], total: 0, hasMore: false };
    }
  }

  /**
   * Find all contacts for a specific user (alias for findAll with different userEmail)
   */
  async findByUser(
    userEmail: string,
    options?: QueryOptions,
  ): Promise<PaginatedResponse<Contact>> {
    const previousEmail = this.userEmail;
    this.userEmail = userEmail;
    try {
      return await this.findAll(options);
    } finally {
      this.userEmail = previousEmail;
    }
  }

  /**
   * Create a new contact
   */
  async create(data: CreateContactDTO, userEmail?: string): Promise<Contact> {
    const email = userEmail || this.userEmail;
    if (!email) {
      throw new Error("User email is required to create a contact");
    }

    const contactData = {
      ...data,
      user_email: email,
    };

    return contactsService.create(contactData);
  }

  /**
   * Update an existing contact
   */
  async update(id: string, data: UpdateContactDTO): Promise<Contact> {
    return contactsService.update(id, data);
  }

  /**
   * Delete a contact
   */
  async delete(id: string): Promise<boolean> {
    try {
      await contactsService.delete(id);
      return true;
    } catch (error) {
      console.error("ContactRepository.delete error:", error);
      return false;
    }
  }

  /**
   * Check if a contact exists
   */
  async exists(id: string): Promise<boolean> {
    const contact = await this.findById(id);
    return contact !== null;
  }

  /**
   * Count contacts matching optional filters
   */
  async count(filters?: FilterOptions[]): Promise<number> {
    try {
      const response = await contactsService.listByUser(this.userEmail);
      if (!filters || filters.length === 0) {
        return response.total;
      }
      const filtered = this.applyFilters(response.documents, filters);
      return filtered.length;
    } catch (error) {
      console.error("ContactRepository.count error:", error);
      return 0;
    }
  }

  /**
   * Find contact by email for the current user
   */
  async findByEmail(email: string): Promise<Contact | null> {
    try {
      const response = await contactsService.listByUser(this.userEmail);
      const contact = response.documents.find(
        (c) => c.email.toLowerCase() === email.toLowerCase(),
      );
      return contact || null;
    } catch (error) {
      console.error("ContactRepository.findByEmail error:", error);
      return null;
    }
  }

  /**
   * Search contacts by name, email, or company
   */
  async search(query: string, limit: number = 20): Promise<Contact[]> {
    try {
      const response = await contactsService.listByUser(this.userEmail);
      const lowerQuery = query.toLowerCase();

      const matches = response.documents.filter(
        (contact) =>
          contact.email.toLowerCase().includes(lowerQuery) ||
          contact.name?.toLowerCase().includes(lowerQuery) ||
          contact.company?.toLowerCase().includes(lowerQuery),
      );

      return matches.slice(0, limit);
    } catch (error) {
      console.error("ContactRepository.search error:", error);
      return [];
    }
  }

  /**
   * Find contacts by tag
   */
  async findByTag(tag: string): Promise<Contact[]> {
    try {
      const response = await contactsService.listByUser(this.userEmail);
      return response.documents.filter((contact) =>
        contact.tags?.includes(tag),
      );
    } catch (error) {
      console.error("ContactRepository.findByTag error:", error);
      return [];
    }
  }

  /**
   * Bulk create contacts
   */
  async createMany(
    contacts: CreateContactDTO[],
    userEmail?: string,
  ): Promise<Contact[]> {
    const email = userEmail || this.userEmail;
    const created: Contact[] = [];

    for (const contact of contacts) {
      try {
        const createdContact = await this.create(contact, email);
        created.push(createdContact);
      } catch (error) {
        console.error(`Failed to create contact ${contact.email}:`, error);
      }
    }

    return created;
  }

  /**
   * Delete multiple contacts
   */
  async deleteMany(
    ids: string[],
  ): Promise<{ deleted: number; failed: number }> {
    let deleted = 0;
    let failed = 0;

    for (const id of ids) {
      const success = await this.delete(id);
      if (success) {
        deleted++;
      } else {
        failed++;
      }
    }

    return { deleted, failed };
  }

  /**
   * Check if email already exists for user
   */
  async emailExists(email: string): Promise<boolean> {
    const contact = await this.findByEmail(email);
    return contact !== null;
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Apply filters to contact list
   */
  private applyFilters(
    documents: Contact[],
    filters: FilterOptions[],
  ): Contact[] {
    return documents.filter((doc) => {
      for (const filter of filters) {
        const value = (doc as unknown as Record<string, unknown>)[filter.field];

        switch (filter.operator) {
          case "eq":
            if (value !== filter.value) {
              return false;
            }
            break;
          case "neq":
            if (value === filter.value) {
              return false;
            }
            break;
          case "gt":
            if (
              typeof value !== "number" ||
              value <= (filter.value as number)
            ) {
              return false;
            }
            break;
          case "gte":
            if (typeof value !== "number" || value < (filter.value as number)) {
              return false;
            }
            break;
          case "lt":
            if (
              typeof value !== "number" ||
              value >= (filter.value as number)
            ) {
              return false;
            }
            break;
          case "lte":
            if (typeof value !== "number" || value > (filter.value as number)) {
              return false;
            }
            break;
          case "contains":
            if (
              typeof value !== "string" ||
              !value.includes(filter.value as string)
            ) {
              return false;
            }
            break;
          case "startsWith":
            if (
              typeof value !== "string" ||
              !value.startsWith(filter.value as string)
            ) {
              return false;
            }
            break;
        }
      }
      return true;
    });
  }

  /**
   * Apply sorting to contact list
   */
  private applySorting(
    documents: Contact[],
    sorts: Array<{ field: string; direction: "asc" | "desc" }>,
  ): Contact[] {
    return [...documents].sort((a, b) => {
      for (const sort of sorts) {
        const aVal = (a as unknown as Record<string, unknown>)[sort.field];
        const bVal = (b as unknown as Record<string, unknown>)[sort.field];

        if (aVal === undefined || aVal === null) {
          return sort.direction === "asc" ? 1 : -1;
        }
        if (bVal === undefined || bVal === null) {
          return sort.direction === "asc" ? -1 : 1;
        }

        const comparison = String(aVal).localeCompare(String(bVal));
        if (comparison !== 0) {
          return sort.direction === "desc" ? -comparison : comparison;
        }
      }
      return 0;
    });
  }
}

// Factory function for creating repository instances
export function createContactRepository(userEmail?: string): ContactRepository {
  return new ContactRepository(userEmail);
}

// Export singleton instance (requires setting userEmail before use)
export const contactRepository = new ContactRepository();

export default ContactRepository;
