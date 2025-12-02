"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useState,
  useCallback,
  createContext,
  useContext,
  ReactNode,
} from "react";

/**
 * Confirmation dialog options
 */
interface ConfirmOptions {
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

/**
 * Confirmation dialog context type
 */
interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

/**
 * Hook to access the confirmation dialog
 */
export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context.confirm;
}

/**
 * Provider component for the confirmation dialog
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    description: "",
  });
  const [resolvePromise, setResolvePromise] = useState<
    ((value: boolean) => void) | null
  >(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);

    return new Promise((resolve) => {
      setResolvePromise(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    resolvePromise?.(true);
    setResolvePromise(null);
  }, [resolvePromise]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resolvePromise?.(false);
    setResolvePromise(null);
  }, [resolvePromise]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AlertDialog
        open={isOpen}
        onOpenChange={(open) => !open && handleCancel()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {options.title || "Are you sure?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {options.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>
              {options.cancelText || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={
                options.variant === "destructive"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {options.confirmText || "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

/**
 * Pre-configured confirmation dialogs for common actions
 */
export const confirmDialogs = {
  /**
   * Confirm deleting a resource
   */
  delete: (resourceName: string): ConfirmOptions => ({
    title: `Delete ${resourceName}?`,
    description: `This action cannot be undone. This will permanently delete the ${resourceName.toLowerCase()}.`,
    confirmText: "Delete",
    cancelText: "Cancel",
    variant: "destructive",
  }),

  /**
   * Confirm discarding unsaved changes
   */
  discardChanges: (): ConfirmOptions => ({
    title: "Discard changes?",
    description:
      "You have unsaved changes. Are you sure you want to leave? Your changes will be lost.",
    confirmText: "Discard",
    cancelText: "Keep editing",
    variant: "destructive",
  }),

  /**
   * Confirm sending emails
   */
  sendEmails: (count: number): ConfirmOptions => ({
    title: `Send ${count} email${count > 1 ? "s" : ""}?`,
    description: `You are about to send ${count} email${count > 1 ? "s" : ""}. This action cannot be undone.`,
    confirmText: `Send ${count} email${count > 1 ? "s" : ""}`,
    cancelText: "Cancel",
  }),

  /**
   * Confirm canceling a campaign
   */
  cancelCampaign: (): ConfirmOptions => ({
    title: "Cancel campaign?",
    description:
      "This will stop sending any remaining emails. Emails already sent cannot be recalled.",
    confirmText: "Stop campaign",
    cancelText: "Continue sending",
    variant: "destructive",
  }),

  /**
   * Confirm clearing data
   */
  clearData: (dataType: string): ConfirmOptions => ({
    title: `Clear ${dataType}?`,
    description: `This will remove all ${dataType.toLowerCase()}. This action cannot be undone.`,
    confirmText: "Clear",
    cancelText: "Cancel",
    variant: "destructive",
  }),

  /**
   * Confirm logout
   */
  logout: (): ConfirmOptions => ({
    title: "Sign out?",
    description: "You will need to sign in again to access your account.",
    confirmText: "Sign out",
    cancelText: "Cancel",
  }),
};
