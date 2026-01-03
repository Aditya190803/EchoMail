"use client";

/**
 * Undo Functionality Hook
 *
 * Provides undo/redo functionality for destructive actions
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";

import { toast } from "sonner";

/**
 * Undoable action definition
 */
export interface UndoableAction<T = unknown> {
  id: string;
  type: string;
  description: string;
  data: T;
  execute: () => Promise<void>;
  undo: () => Promise<void>;
  timestamp: number;
  expiresAt: number;
}

/**
 * Undo manager state
 */
interface UndoState {
  actions: UndoableAction[];
  redoStack: UndoableAction[];
}

/**
 * Undo manager options
 */
interface UseUndoOptions {
  /** Maximum actions to keep in history */
  maxHistory?: number;
  /** Time in ms before action expires and can't be undone */
  expirationTime?: number;
  /** Show toast notifications */
  showToasts?: boolean;
}

const DEFAULT_OPTIONS: Required<UseUndoOptions> = {
  maxHistory: 10,
  expirationTime: 30000, // 30 seconds
  showToasts: true,
};

/**
 * Hook for managing undoable actions
 */
export function useUndo(options: UseUndoOptions = {}) {
  const opts = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);
  const [state, setState] = useState<UndoState>({
    actions: [],
    redoStack: [],
  });
  const toastIdRef = useRef<string | number | null>(null);
  const undoRef = useRef<(() => Promise<boolean>) | undefined>(undefined);
  const redoRef = useRef<(() => Promise<boolean>) | undefined>(undefined);

  // Clean up expired actions
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setState((prev) => ({
        ...prev,
        actions: prev.actions.filter((a) => a.expiresAt > now),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Execute an action with undo capability
   */
  const execute = useCallback(
    async <T>(
      action: Omit<UndoableAction<T>, "id" | "timestamp" | "expiresAt">,
    ): Promise<void> => {
      const fullAction: UndoableAction<T> = {
        ...action,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        expiresAt: Date.now() + opts.expirationTime,
      };

      try {
        await action.execute();

        setState((prev) => ({
          actions: [fullAction as UndoableAction, ...prev.actions].slice(
            0,
            opts.maxHistory,
          ),
          redoStack: [], // Clear redo stack on new action
        }));

        if (opts.showToasts) {
          // Dismiss previous toast if exists
          if (toastIdRef.current) {
            toast.dismiss(toastIdRef.current);
          }

          toastIdRef.current = toast(action.description, {
            action: {
              label: "Undo",
              onClick: () => undoRef.current?.(),
            },
            duration: opts.expirationTime,
          });
        }
      } catch (error) {
        if (opts.showToasts) {
          toast.error(`Failed: ${action.description}`);
        }
        throw error;
      }
    },
    [opts],
  );

  /**
   * Undo the last action
   */
  const undo = useCallback(async (): Promise<boolean> => {
    const lastAction = state.actions[0];

    if (!lastAction || lastAction.expiresAt < Date.now()) {
      if (opts.showToasts) {
        toast.error("Nothing to undo");
      }
      return false;
    }

    try {
      await lastAction.undo();

      setState((prev) => ({
        actions: prev.actions.slice(1),
        redoStack: [lastAction, ...prev.redoStack].slice(0, opts.maxHistory),
      }));

      if (opts.showToasts) {
        toast.success(`Undone: ${lastAction.description}`, {
          action: {
            label: "Redo",
            onClick: () => redoRef.current?.(),
          },
        });
      }

      return true;
    } catch (_error) {
      if (opts.showToasts) {
        toast.error(`Failed to undo: ${lastAction.description}`);
      }
      return false;
    }
  }, [state.actions, opts]);

  /**
   * Redo the last undone action
   */
  const redo = useCallback(async (): Promise<boolean> => {
    const lastUndo = state.redoStack[0];

    if (!lastUndo) {
      if (opts.showToasts) {
        toast.error("Nothing to redo");
      }
      return false;
    }

    try {
      await lastUndo.execute();

      setState((prev) => ({
        actions: [
          { ...lastUndo, expiresAt: Date.now() + opts.expirationTime },
          ...prev.actions,
        ].slice(0, opts.maxHistory),
        redoStack: prev.redoStack.slice(1),
      }));

      if (opts.showToasts) {
        toast.success(`Redone: ${lastUndo.description}`);
      }

      return true;
    } catch (_error) {
      if (opts.showToasts) {
        toast.error(`Failed to redo: ${lastUndo.description}`);
      }
      return false;
    }
  }, [state.redoStack, opts]);

  // Keep refs in sync with callbacks
  useEffect(() => {
    undoRef.current = undo;
    redoRef.current = redo;
  }, [undo, redo]);

  /**
   * Clear all undo history
   */
  const clearHistory = useCallback(() => {
    setState({ actions: [], redoStack: [] });
  }, []);

  return {
    execute,
    undo,
    redo,
    clearHistory,
    canUndo:
      state.actions.length > 0 && state.actions[0].expiresAt > Date.now(),
    canRedo: state.redoStack.length > 0,
    undoCount: state.actions.length,
    redoCount: state.redoStack.length,
    lastAction: state.actions[0],
  };
}

/**
 * Create undoable delete action for contacts
 */
export function createDeleteContactAction(
  contact: { id: string; email: string; name?: string },
  deleteFunction: (id: string) => Promise<void>,
  restoreFunction: (contact: {
    id: string;
    email: string;
    name?: string;
  }) => Promise<void>,
): Omit<UndoableAction<typeof contact>, "id" | "timestamp" | "expiresAt"> {
  return {
    type: "delete_contact",
    description: `Deleted contact: ${contact.name || contact.email}`,
    data: contact,
    execute: async () => {
      await deleteFunction(contact.id);
    },
    undo: async () => {
      await restoreFunction(contact);
    },
  };
}

/**
 * Create undoable bulk delete action
 */
export function createBulkDeleteAction<T extends { id: string }>(
  items: T[],
  itemType: string,
  deleteFunction: (ids: string[]) => Promise<void>,
  restoreFunction: (items: T[]) => Promise<void>,
): Omit<UndoableAction<T[]>, "id" | "timestamp" | "expiresAt"> {
  return {
    type: `bulk_delete_${itemType}`,
    description: `Deleted ${items.length} ${itemType}${items.length > 1 ? "s" : ""}`,
    data: items,
    execute: async () => {
      await deleteFunction(items.map((i) => i.id));
    },
    undo: async () => {
      await restoreFunction(items);
    },
  };
}

/**
 * Keyboard shortcut handler for undo/redo
 */
export function useUndoKeyboard(
  undo: () => Promise<boolean>,
  redo: () => Promise<boolean>,
  enabled: boolean = true,
) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd/Ctrl + Z (undo) or Cmd/Ctrl + Shift + Z (redo)
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      // Also support Cmd/Ctrl + Y for redo
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, enabled]);
}
