/**
 * UI Store
 *
 * Zustand store for managing global UI state across the application.
 * Handles modals, sidebars, notifications, and other UI elements.
 *
 * @module lib/stores/ui-store
 *
 * @example
 * ```tsx
 * import { useUIStore } from '@/lib/stores'
 *
 * function Header() {
 *   const { isSidebarOpen, toggleSidebar } = useUIStore()
 *
 *   return (
 *     <button onClick={toggleSidebar}>
 *       {isSidebarOpen ? 'Close' : 'Open'} Menu
 *     </button>
 *   )
 * }
 * ```
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

/**
 * Notification type for toast messages
 */
export interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
}

/**
 * Modal configuration
 */
export interface ModalConfig {
  type: "confirm" | "alert" | "custom";
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  customContent?: React.ReactNode;
}

/**
 * State shape for the UI store
 */
export interface UIState {
  // Sidebar
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;

  // Modals
  isModalOpen: boolean;
  modalConfig: ModalConfig | null;

  // Notifications
  notifications: Notification[];

  // Keyboard shortcuts
  isKeyboardShortcutsOpen: boolean;

  // Loading states
  globalLoading: boolean;
  loadingMessage: string | null;

  // Actions - Sidebar
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;

  // Actions - Modal
  openModal: (config: ModalConfig) => void;
  closeModal: () => void;

  // Actions - Notifications
  addNotification: (notification: Omit<Notification, "id">) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Actions - Keyboard shortcuts
  openKeyboardShortcuts: () => void;
  closeKeyboardShortcuts: () => void;
  toggleKeyboardShortcuts: () => void;

  // Actions - Loading
  setGlobalLoading: (loading: boolean, message?: string) => void;
}

/**
 * Generate unique ID for notifications
 */
const generateId = () => Math.random().toString(36).substring(2, 9);

/**
 * UI store using Zustand
 *
 * Features:
 * - Persisted sidebar state
 * - DevTools integration
 * - Automatic notification timeout
 */
export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        isSidebarOpen: true,
        isSidebarCollapsed: false,
        isModalOpen: false,
        modalConfig: null,
        notifications: [],
        isKeyboardShortcutsOpen: false,
        globalLoading: false,
        loadingMessage: null,

        // Sidebar actions
        openSidebar: () => set({ isSidebarOpen: true }),
        closeSidebar: () => set({ isSidebarOpen: false }),
        toggleSidebar: () =>
          set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
        collapseSidebar: () => set({ isSidebarCollapsed: true }),
        expandSidebar: () => set({ isSidebarCollapsed: false }),

        // Modal actions
        openModal: (config: ModalConfig) =>
          set({
            isModalOpen: true,
            modalConfig: config,
          }),

        closeModal: () => {
          const { modalConfig } = get();
          if (modalConfig?.onCancel) {
            modalConfig.onCancel();
          }
          set({ isModalOpen: false, modalConfig: null });
        },

        // Notification actions
        addNotification: (notification: Omit<Notification, "id">) => {
          const id = generateId();
          const newNotification: Notification = { ...notification, id };

          set((state) => ({
            notifications: [...state.notifications, newNotification],
          }));

          // Auto-remove after duration (default 5 seconds)
          const duration = notification.duration ?? 5000;
          if (duration > 0) {
            setTimeout(() => {
              get().removeNotification(id);
            }, duration);
          }
        },

        removeNotification: (id: string) => {
          set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          }));
        },

        clearNotifications: () => set({ notifications: [] }),

        // Keyboard shortcuts actions
        openKeyboardShortcuts: () => set({ isKeyboardShortcutsOpen: true }),
        closeKeyboardShortcuts: () => set({ isKeyboardShortcutsOpen: false }),
        toggleKeyboardShortcuts: () =>
          set((state) => ({
            isKeyboardShortcutsOpen: !state.isKeyboardShortcutsOpen,
          })),

        // Loading actions
        setGlobalLoading: (loading: boolean, message?: string) =>
          set({
            globalLoading: loading,
            loadingMessage: message || null,
          }),
      }),
      {
        name: "ui-store",
        // Only persist UI preferences
        partialize: (state) => ({
          isSidebarOpen: state.isSidebarOpen,
          isSidebarCollapsed: state.isSidebarCollapsed,
        }),
      },
    ),
    { name: "UIStore" },
  ),
);

// Selector hooks for specific UI state
export const useSidebar = () =>
  useUIStore((state) => ({
    isOpen: state.isSidebarOpen,
    isCollapsed: state.isSidebarCollapsed,
    open: state.openSidebar,
    close: state.closeSidebar,
    toggle: state.toggleSidebar,
  }));

export const useNotifications = () =>
  useUIStore((state) => ({
    notifications: state.notifications,
    add: state.addNotification,
    remove: state.removeNotification,
    clear: state.clearNotifications,
  }));

export const useGlobalLoading = () =>
  useUIStore((state) => ({
    isLoading: state.globalLoading,
    message: state.loadingMessage,
    setLoading: state.setGlobalLoading,
  }));
