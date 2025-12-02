/**
 * Base Repository Interface
 *
 * Defines the contract for data access operations following the Repository pattern.
 * This abstraction allows for easy swapping of data storage implementations
 * (e.g., Appwrite, Firebase, PostgreSQL) without changing business logic.
 *
 * @module lib/repositories/base-repository
 * @see {@link /docs/ADR/003-repository-pattern.md} for architecture decision
 */

/**
 * Base entity interface that all domain entities must implement
 */
export interface BaseEntity {
  /** Unique identifier from the data store */
  $id?: string;
  /** Timestamp when entity was created */
  $createdAt?: string;
  /** Timestamp when entity was last updated */
  $updatedAt?: string;
}

/**
 * Pagination options for list queries
 */
export interface PaginationOptions {
  /** Number of items per page (default: 25) */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Cursor for cursor-based pagination */
  cursor?: string;
}

/**
 * Sort options for list queries
 */
export interface SortOptions {
  /** Field to sort by */
  field: string;
  /** Sort direction */
  direction: "asc" | "desc";
}

/**
 * Filter options for list queries
 */
export interface FilterOptions {
  /** Field to filter on */
  field: string;
  /** Filter operator */
  operator:
    | "eq"
    | "neq"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "contains"
    | "startsWith";
  /** Value to compare against */
  value: string | number | boolean;
}

/**
 * Query options combining pagination, sorting, and filtering
 */
export interface QueryOptions {
  pagination?: PaginationOptions;
  sort?: SortOptions[];
  filters?: FilterOptions[];
}

/**
 * Response wrapper for paginated list queries
 */
export interface PaginatedResponse<T> {
  /** Array of entities */
  documents: T[];
  /** Total count of all matching entities */
  total: number;
  /** Whether there are more items */
  hasMore?: boolean;
  /** Cursor for next page (if using cursor pagination) */
  nextCursor?: string;
}

/**
 * Generic Repository Interface
 *
 * Provides a standard contract for CRUD operations on any entity type.
 * Implementations should handle the specific data store logic.
 *
 * @typeParam T - The entity type this repository manages
 * @typeParam CreateDTO - Data transfer object for creating entities
 * @typeParam UpdateDTO - Data transfer object for updating entities
 *
 * @example
 * ```typescript
 * class ContactRepository implements IRepository<Contact, CreateContactDTO, UpdateContactDTO> {
 *   async findById(id: string): Promise<Contact | null> {
 *     // Implementation
 *   }
 *   // ... other methods
 * }
 * ```
 */
export interface IRepository<T extends BaseEntity, CreateDTO, UpdateDTO> {
  /**
   * Find a single entity by its unique identifier
   * @param id - The entity's unique identifier
   * @returns The entity if found, null otherwise
   */
  findById(id: string): Promise<T | null>;

  /**
   * Find all entities matching the given options
   * @param options - Query options for pagination, sorting, and filtering
   * @returns Paginated response with matching entities
   */
  findAll(options?: QueryOptions): Promise<PaginatedResponse<T>>;

  /**
   * Find all entities belonging to a specific user
   * @param userEmail - The user's email address
   * @param options - Query options
   * @returns Paginated response with user's entities
   */
  findByUser(
    userEmail: string,
    options?: QueryOptions,
  ): Promise<PaginatedResponse<T>>;

  /**
   * Create a new entity
   * @param data - The data for the new entity
   * @param userEmail - The email of the user creating the entity
   * @returns The created entity with generated fields
   */
  create(data: CreateDTO, userEmail: string): Promise<T>;

  /**
   * Update an existing entity
   * @param id - The entity's unique identifier
   * @param data - The fields to update
   * @returns The updated entity
   */
  update(id: string, data: UpdateDTO): Promise<T>;

  /**
   * Delete an entity by its identifier
   * @param id - The entity's unique identifier
   * @returns True if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;

  /**
   * Check if an entity exists
   * @param id - The entity's unique identifier
   * @returns True if exists, false otherwise
   */
  exists(id: string): Promise<boolean>;

  /**
   * Count entities matching optional filters
   * @param filters - Optional filters to apply
   * @returns The count of matching entities
   */
  count(filters?: FilterOptions[]): Promise<number>;
}

/**
 * Abstract Base Repository
 *
 * Provides common functionality for repository implementations.
 * Extend this class to create specific repositories.
 */
export abstract class BaseRepository<
  T extends BaseEntity,
  CreateDTO,
  UpdateDTO,
> implements IRepository<T, CreateDTO, UpdateDTO> {
  protected collectionId: string;

  constructor(collectionId: string) {
    this.collectionId = collectionId;
  }

  abstract findById(id: string): Promise<T | null>;
  abstract findAll(options?: QueryOptions): Promise<PaginatedResponse<T>>;
  abstract findByUser(
    userEmail: string,
    options?: QueryOptions,
  ): Promise<PaginatedResponse<T>>;
  abstract create(data: CreateDTO, userEmail: string): Promise<T>;
  abstract update(id: string, data: UpdateDTO): Promise<T>;
  abstract delete(id: string): Promise<boolean>;

  /**
   * Default implementation - check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    const entity = await this.findById(id);
    return entity !== null;
  }

  /**
   * Default implementation - count entities
   * Should be overridden for efficiency in specific implementations
   */
  async count(filters?: FilterOptions[]): Promise<number> {
    const result = await this.findAll({ filters });
    return result.total;
  }

  /**
   * Helper: Apply pagination defaults
   */
  protected applyPaginationDefaults(
    options?: PaginationOptions,
  ): Required<PaginationOptions> {
    return {
      limit: options?.limit ?? 25,
      offset: options?.offset ?? 0,
      cursor: options?.cursor ?? "",
    };
  }
}

export default IRepository;
