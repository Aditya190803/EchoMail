/**
 * Contact Store
 *
 * Zustand store for managing contact-related state across the application.
 * Provides centralized state management for contacts list, selected contacts,
 * and contact operations.
 *
 * @module lib/stores/contact-store
 *
 * @example
 * ```tsx
 * import { useContactStore } from '@/lib/stores'
 *
 * function ContactList() {
 *   const { contacts, isLoading, fetchContacts } = useContactStore()
 *
 *   useEffect(() => {
 *     fetchContacts()
 *   }, [fetchContacts])
 *
 *   if (isLoading) return <Spinner />
 *
 *   return (
 *     <ul>
 *       {contacts.map(contact => (
 *         <li key={contact.$id}>{contact.email}</li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

import { type Contact, contactsService } from "@/lib/appwrite";

/**
 * State shape for the contact store
 */
export interface ContactState {
  // State
  contacts: Contact[];
  selectedContacts: Set<string>;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;

  // Computed (derived state via selectors)
  filteredContacts: () => Contact[];
  selectedCount: () => number;

  // Actions
  fetchContacts: () => Promise<void>;
  addContact: (contact: Contact) => void;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  removeContact: (id: string) => void;

  // Selection
  selectContact: (id: string) => void;
  deselectContact: (id: string) => void;
  toggleContactSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // Search
  setSearchQuery: (query: string) => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
}

/**
 * Contact store using Zustand
 *
 * Features:
 * - Persisted selection state
 * - DevTools integration for debugging
 * - Optimistic updates
 */
export const useContactStore = create<ContactState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        contacts: [],
        selectedContacts: new Set<string>(),
        isLoading: false,
        error: null,
        searchQuery: "",

        // Computed
        filteredContacts: () => {
          const { contacts, searchQuery } = get();
          if (!searchQuery.trim()) {
            return contacts;
          }

          const query = searchQuery.toLowerCase();
          return contacts.filter(
            (contact) =>
              contact.email.toLowerCase().includes(query) ||
              contact.name?.toLowerCase().includes(query) ||
              contact.company?.toLowerCase().includes(query),
          );
        },

        selectedCount: () => get().selectedContacts.size,

        // Actions
        fetchContacts: async () => {
          set({ isLoading: true, error: null });
          try {
            const response = await contactsService.listByUser("");
            set({ contacts: response.documents, isLoading: false });
          } catch (error) {
            set({
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to fetch contacts",
              isLoading: false,
            });
          }
        },

        addContact: (contact: Contact) => {
          set((state) => ({
            contacts: [contact, ...state.contacts],
          }));
        },

        updateContact: (id: string, updates: Partial<Contact>) => {
          set((state) => ({
            contacts: state.contacts.map((c) =>
              c.$id === id ? { ...c, ...updates } : c,
            ),
          }));
        },

        removeContact: (id: string) => {
          set((state) => ({
            contacts: state.contacts.filter((c) => c.$id !== id),
            selectedContacts: new Set(
              [...state.selectedContacts].filter((cid) => cid !== id),
            ),
          }));
        },

        // Selection actions
        selectContact: (id: string) => {
          set((state) => ({
            selectedContacts: new Set([...state.selectedContacts, id]),
          }));
        },

        deselectContact: (id: string) => {
          set((state) => {
            const newSelection = new Set(state.selectedContacts);
            newSelection.delete(id);
            return { selectedContacts: newSelection };
          });
        },

        toggleContactSelection: (id: string) => {
          const { selectedContacts } = get();
          if (selectedContacts.has(id)) {
            get().deselectContact(id);
          } else {
            get().selectContact(id);
          }
        },

        selectAll: () => {
          const contacts = get().filteredContacts();
          set({
            selectedContacts: new Set(
              contacts.map((c) => c.$id).filter((id): id is string => !!id),
            ),
          });
        },

        clearSelection: () => {
          set({ selectedContacts: new Set() });
        },

        // Search
        setSearchQuery: (query: string) => {
          set({ searchQuery: query });
        },

        // Error handling
        setError: (error: string | null) => {
          set({ error });
        },

        clearError: () => {
          set({ error: null });
        },
      }),
      {
        name: "contact-store",
        // Only persist non-sensitive data
        partialize: (state) => ({
          searchQuery: state.searchQuery,
          // Don't persist contacts - fetch fresh on load
        }),
      },
    ),
    { name: "ContactStore" },
  ),
);

// Selector hooks for better performance
export const useContacts = () => useContactStore((state) => state.contacts);
export const useContactsLoading = () =>
  useContactStore((state) => state.isLoading);
export const useContactsError = () => useContactStore((state) => state.error);
export const useSelectedContacts = () =>
  useContactStore((state) => state.selectedContacts);
