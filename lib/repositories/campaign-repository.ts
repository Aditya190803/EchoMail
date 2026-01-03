/**
 * Campaign Repository
 *
 * Implements the Repository pattern for EmailCampaign entities.
 * Provides clean data access interface for campaign management operations.
 *
 * @module lib/repositories/campaign-repository
 */

import { campaignsService, type EmailCampaign } from "@/lib/appwrite";

import {
  type QueryOptions,
  type PaginatedResponse,
  type FilterOptions,
  type SortOptions,
} from "./base-repository";

// Re-export EmailCampaign type
export type { EmailCampaign };

/**
 * Campaign statistics summary
 */
export interface CampaignStats {
  totalCampaigns: number;
  totalSent: number;
  totalFailed: number;
  successRate: number;
  campaignsByStatus: Record<string, number>;
}

/**
 * CampaignRepository
 *
 * Handles all data access operations for EmailCampaign entities.
 * Uses the campaignsService which communicates with Appwrite via API routes.
 *
 * @example
 * ```typescript
 * const campaignRepo = new CampaignRepository('user@example.com');
 *
 * // Find all user's campaigns
 * const campaigns = await campaignRepo.findAll();
 *
 * // Get campaign statistics
 * const stats = await campaignRepo.getStats();
 *
 * // Find recent campaigns
 * const recent = await campaignRepo.findRecent(5);
 * ```
 */
export class CampaignRepository {
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
   * Find a campaign by ID
   */
  async findById(id: string): Promise<EmailCampaign | null> {
    try {
      const response = await campaignsService.listByUser(this.userEmail);
      const campaign = response.documents.find((c) => c.$id === id);
      return campaign || null;
    } catch (error) {
      console.error("CampaignRepository.findById error:", error);
      return null;
    }
  }

  /**
   * Find all campaigns with optional pagination and filtering
   */
  async findAll(
    options?: QueryOptions,
  ): Promise<PaginatedResponse<EmailCampaign>> {
    try {
      const response = await campaignsService.listByUser(this.userEmail);
      let documents = response.documents;

      // Apply filters in memory
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
      console.error("CampaignRepository.findAll error:", error);
      return { documents: [], total: 0, hasMore: false };
    }
  }

  /**
   * Find campaigns by status
   */
  async findByStatus(
    status: "completed" | "sending" | "failed",
    options?: QueryOptions,
  ): Promise<PaginatedResponse<EmailCampaign>> {
    const filters: FilterOptions[] = [
      { field: "status", operator: "eq", value: status },
      ...(options?.filters || []),
    ];

    return this.findAll({ ...options, filters });
  }

  /**
   * Find recent campaigns
   */
  async findRecent(limit: number = 10): Promise<EmailCampaign[]> {
    const response = await this.findAll({
      pagination: { limit },
      sort: [{ field: "created_at", direction: "desc" }],
    });
    return response.documents;
  }

  /**
   * Search campaigns by subject
   */
  async search(
    query: string,
    options?: QueryOptions,
  ): Promise<PaginatedResponse<EmailCampaign>> {
    try {
      const response = await campaignsService.listByUser(this.userEmail);
      const searchLower = query.toLowerCase();

      let documents = response.documents.filter(
        (campaign) =>
          campaign.subject?.toLowerCase().includes(searchLower) ||
          campaign.campaign_type?.toLowerCase().includes(searchLower),
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
      console.error("CampaignRepository.search error:", error);
      return { documents: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get campaign statistics
   */
  async getStats(): Promise<CampaignStats> {
    try {
      const response = await campaignsService.listByUser(this.userEmail);
      const documents = response.documents;

      const totalSent = documents.reduce((sum, c) => sum + (c.sent || 0), 0);
      const totalFailed = documents.reduce(
        (sum, c) => sum + (c.failed || 0),
        0,
      );
      const totalAttempted = totalSent + totalFailed;

      const campaignsByStatus: Record<string, number> = {};
      documents.forEach((campaign) => {
        const status = campaign.status || "unknown";
        campaignsByStatus[status] = (campaignsByStatus[status] || 0) + 1;
      });

      return {
        totalCampaigns: documents.length,
        totalSent,
        totalFailed,
        successRate:
          totalAttempted > 0 ? (totalSent / totalAttempted) * 100 : 0,
        campaignsByStatus,
      };
    } catch (error) {
      console.error("CampaignRepository.getStats error:", error);
      return {
        totalCampaigns: 0,
        totalSent: 0,
        totalFailed: 0,
        successRate: 0,
        campaignsByStatus: {},
      };
    }
  }

  /**
   * Get the count of all campaigns
   */
  async count(filters?: FilterOptions[]): Promise<number> {
    const response = await this.findAll({ filters });
    return response.total;
  }

  /**
   * Delete a campaign
   */
  async delete(id: string): Promise<void> {
    await campaignsService.delete(id);
  }

  /**
   * Apply filters to documents in memory
   */
  private applyFilters(
    documents: EmailCampaign[],
    filters: FilterOptions[],
  ): EmailCampaign[] {
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
    documents: EmailCampaign[],
    sortOptions: SortOptions[],
  ): EmailCampaign[] {
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
let campaignRepositoryInstance: CampaignRepository | null = null;

export function getCampaignRepository(userEmail?: string): CampaignRepository {
  if (!campaignRepositoryInstance) {
    campaignRepositoryInstance = new CampaignRepository(userEmail);
  } else if (
    userEmail &&
    campaignRepositoryInstance.getUserEmail() !== userEmail
  ) {
    campaignRepositoryInstance.setUserEmail(userEmail);
  }
  return campaignRepositoryInstance;
}
