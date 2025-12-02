# ADR-004: Zustand for Client-Side State Management

## Status

Accepted

## Date

2024-01

## Context

EchoMail has several pieces of client-side state that need to be shared across components:

1. **Contact Management**: Selected contacts, search filters, contact list
2. **Compose Form**: Email content, recipients, attachments, sending progress
3. **UI State**: Sidebar visibility, modals, notifications, loading states
4. **User Preferences**: Theme, keyboard shortcuts, display settings

Initially, we used React's built-in useState and prop drilling, which became unwieldy as the application grew. We also use React Query for server state, but needed a solution for client-only state.

## Decision

We will use **Zustand** for client-side state management, with the following store structure:

```
lib/stores/
├── index.ts           - Central exports
├── contact-store.ts   - Contact selection and filtering
├── compose-store.ts   - Email composition state
└── ui-store.ts        - Global UI state
```

### Store Design Principles

1. **Flat State**: Keep state structure flat when possible
2. **Actions with State**: Colocate actions with state they modify
3. **Selective Persistence**: Only persist non-sensitive, preference data
4. **DevTools Integration**: Enable Redux DevTools for debugging

### Example Store Structure

```typescript
// lib/stores/contact-store.ts
export const useContactStore = create<ContactState>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        contacts: [],
        selectedContacts: new Set<string>(),
        searchQuery: "",

        // Derived (computed via selectors)
        filteredContacts: () => {
          const { contacts, searchQuery } = get();
          // ... filter logic
        },

        // Actions
        fetchContacts: async () => {
          /* ... */
        },
        selectContact: (id) =>
          set((state) => ({
            /* ... */
          })),
      }),
      {
        name: "contact-store",
        partialize: (state) => ({ searchQuery: state.searchQuery }),
      },
    ),
    { name: "ContactStore" },
  ),
);
```

### Usage Pattern

```tsx
// In components
function ContactList() {
  const contacts = useContactStore((state) => state.contacts);
  const selectContact = useContactStore((state) => state.selectContact);

  return contacts.map((c) => (
    <ContactItem key={c.$id} onClick={() => selectContact(c.$id!)} />
  ));
}
```

## Consequences

### Positive

- **Minimal Boilerplate**: Much simpler than Redux
- **Bundle Size**: Only ~1KB gzipped
- **No Providers**: No context wrapper needed
- **TypeScript**: Excellent type inference
- **Flexibility**: Supports middleware (persist, devtools)
- **Selective Subscription**: Components only re-render on used state changes

### Negative

- **No Middleware Ecosystem**: Fewer plugins than Redux
- **Learning Curve**: Different patterns than Redux for those familiar with it
- **State Duplication Risk**: Easy to create multiple stores with overlapping concerns

### Neutral

- Compatible with React Server Components (just use from client components)
- Works well alongside React Query for server state

## Store Responsibilities

### ContactStore

- Contact list cache (for optimistic updates)
- Selected contacts for bulk operations
- Contact search/filter state
- Contact group selection

### ComposeStore

- Email subject, content, recipients
- Attachment list and upload progress
- Draft state and auto-save
- Sending progress and status
- Form validation errors

### UIStore

- Sidebar open/collapsed state
- Modal visibility and configuration
- Toast notifications
- Global loading states
- Keyboard shortcuts modal

## Alternatives Considered

### Alternative 1: Redux Toolkit

Full Redux with RTK.

**Rejected because**:

- Overkill for our state needs
- More boilerplate code
- Larger bundle size
- Team not experienced with Redux

### Alternative 2: Jotai

Atomic state management.

**Rejected because**:

- More granular than needed
- Zustand's store model fits our mental model better
- Similar bundle size, less documentation

### Alternative 3: React Context Only

Using React Context for all shared state.

**Rejected because**:

- Poor performance with frequent updates
- Requires careful memoization
- Component hierarchy coupling

### Alternative 4: Recoil

Facebook's atomic state library.

**Rejected because**:

- Uncertain future (Facebook internal priority)
- Larger bundle size
- More complex API

## Integration with React Query

Zustand handles client-only state, while React Query handles server state:

| State Type      | Tool        | Example                    |
| --------------- | ----------- | -------------------------- |
| Server Data     | React Query | Fetching contacts from API |
| UI State        | Zustand     | Sidebar visibility         |
| Form State      | Zustand     | Compose email form         |
| Selection State | Zustand     | Selected contacts          |
| Cache           | React Query | Cached API responses       |

## References

- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Zustand GitHub](https://github.com/pmndrs/zustand)
- [Zustand vs Redux](https://docs.pmnd.rs/zustand/getting-started/comparison)
