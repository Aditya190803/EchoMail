# ADR-007: Repository Pattern for Data Access

## Status

Accepted

## Date

2024-01

## Context

EchoMail's data access code was spread across:

- API routes directly calling Appwrite SDK
- Client-side services calling API routes
- Components making direct API calls

This led to:

- Duplicated query logic
- Inconsistent error handling
- Difficult testing
- Tight coupling to Appwrite's API

We needed a cleaner abstraction layer for data operations.

## Decision

We will implement the **Repository Pattern** to abstract data access:

### Architecture

```
[Components/Hooks] --> [Repository] --> [Service Layer] --> [API Routes] --> [Appwrite]

lib/repositories/
├── base-repository.ts    - Interfaces and base class
├── contact-repository.ts - Contact-specific repository
├── campaign-repository.ts - Campaign repository (future)
└── template-repository.ts - Template repository (future)
```

### Base Repository Interface

```typescript
// lib/repositories/base-repository.ts
export interface IRepository<T, CreateDTO, UpdateDTO> {
  findById(id: string): Promise<T | null>;
  findAll(options?: QueryOptions): Promise<PaginatedResponse<T>>;
  findByUser(
    userEmail: string,
    options?: QueryOptions,
  ): Promise<PaginatedResponse<T>>;
  create(data: CreateDTO, userEmail: string): Promise<T>;
  update(id: string, data: UpdateDTO): Promise<T>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
  count(filters?: FilterOptions[]): Promise<number>;
}
```

### Query Options

```typescript
interface QueryOptions {
  pagination?: {
    limit?: number;
    offset?: number;
    cursor?: string;
  };
  sort?: Array<{
    field: string;
    direction: "asc" | "desc";
  }>;
  filters?: Array<{
    field: string;
    operator: "eq" | "neq" | "gt" | "lt" | "contains" | "startsWith";
    value: string | number | boolean;
  }>;
}
```

### Implementation Example

```typescript
// lib/repositories/contact-repository.ts
export class ContactRepository {
  private userEmail: string;

  constructor(userEmail: string = "") {
    this.userEmail = userEmail;
  }

  async findById(id: string): Promise<Contact | null> {
    const response = await contactsService.listByUser(this.userEmail);
    return response.documents.find((c) => c.$id === id) || null;
  }

  async search(query: string, limit = 20): Promise<Contact[]> {
    const response = await contactsService.listByUser(this.userEmail);
    const lowerQuery = query.toLowerCase();

    return response.documents
      .filter(
        (c) =>
          c.email.toLowerCase().includes(lowerQuery) ||
          c.name?.toLowerCase().includes(lowerQuery),
      )
      .slice(0, limit);
  }

  async create(data: CreateContactDTO): Promise<Contact> {
    return contactsService.create({ ...data, user_email: this.userEmail });
  }
}

// Factory function
export function createContactRepository(userEmail?: string) {
  return new ContactRepository(userEmail);
}
```

### Usage in Components

```typescript
function ContactList({ userEmail }) {
  const [contacts, setContacts] = useState([])

  useEffect(() => {
    const repo = createContactRepository(userEmail)
    repo.findAll({ pagination: { limit: 50 } })
      .then(result => setContacts(result.documents))
  }, [userEmail])

  return <ul>{contacts.map(c => <li key={c.$id}>{c.email}</li>)}</ul>
}
```

## Consequences

### Positive

- **Abstraction**: Components don't know about Appwrite
- **Testability**: Can mock repositories in tests
- **Consistency**: Standardized query patterns
- **Flexibility**: Can swap data source without changing components
- **Type Safety**: DTOs enforce correct data shapes
- **Domain Logic**: Repository can encapsulate business rules

### Negative

- **Indirection**: Another layer between UI and data
- **Learning Curve**: Team must understand pattern
- **Boilerplate**: Need repository per entity type
- **In-Memory Filtering**: Client-side filtering less efficient than server-side

### Neutral

- Pattern is well-known in enterprise development
- Compatible with existing service layer

## Migration Strategy

1. Create base repository interface
2. Implement repositories wrapping existing services
3. Gradually update components to use repositories
4. Keep services as fallback during transition
5. Add repository tests

## Integration with Existing Services

```
Components/Hooks
      |
      v
Repositories (new abstraction layer)
      |
      v
Services (contactsService, etc.) <-- Already exists
      |
      v
API Routes <-- Already exists
      |
      v
Appwrite <-- Already exists
```

Repositories wrap services, not replace them.

## Future Enhancements

### Caching Layer

```typescript
class CachedContactRepository extends ContactRepository {
  private cache = new Map<string, Contact>();

  async findById(id: string): Promise<Contact | null> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }
    const contact = await super.findById(id);
    if (contact) this.cache.set(id, contact);
    return contact;
  }
}
```

### Server-Side Repository

For API routes, implement server-side repositories using Appwrite SDK directly:

```typescript
// lib/repositories/server/contact-repository.ts
export class ServerContactRepository {
  async findById(id: string): Promise<Contact | null> {
    const doc = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.CONTACTS,
      id,
    );
    return doc as Contact;
  }
}
```

## Alternatives Considered

### Alternative 1: Direct Service Calls

Keep calling services directly from components.

**Rejected because**:

- No abstraction layer
- Hard to add cross-cutting concerns
- Inconsistent patterns across codebase

### Alternative 2: GraphQL

Use GraphQL for data layer.

**Rejected because**:

- Significant infrastructure change
- Overkill for current needs
- Team not experienced with GraphQL

### Alternative 3: ORM (Prisma-like)

Build a full ORM on top of Appwrite.

**Rejected because**:

- Too much abstraction
- Would fight Appwrite's document model
- Complex to implement properly

## Testing Strategy

```typescript
// __tests__/repositories/contact-repository.test.ts
import { ContactRepository } from "@/lib/repositories/contact-repository";

// Mock the service
jest.mock("@/lib/appwrite", () => ({
  contactsService: {
    listByUser: jest.fn().mockResolvedValue({
      documents: [{ $id: "1", email: "test@example.com" }],
    }),
  },
}));

describe("ContactRepository", () => {
  it("should find contact by id", async () => {
    const repo = new ContactRepository("user@example.com");
    const contact = await repo.findById("1");
    expect(contact?.email).toBe("test@example.com");
  });
});
```

## References

- [Repository Pattern (Martin Fowler)](https://martinfowler.com/eaaCatalog/repository.html)
- [Domain-Driven Design (Eric Evans)](https://domainlanguage.com/ddd/)
- [Clean Architecture (Robert Martin)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
