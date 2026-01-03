"use client";

/**
 * Bulk Actions Component
 *
 * Provides UI for performing bulk operations on selected items
 */

import { useState, useCallback } from "react";

import { Trash2, Download, Tag, Mail, MoreHorizontal } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface BulkAction<T = unknown> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: "default" | "destructive";
  requiresConfirmation?: boolean;
  confirmTitle?: string;
  confirmDescription?: string;
  handler: (items: T[]) => Promise<void> | void;
}

interface BulkActionsProps<T> {
  items: T[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  idField?: keyof T;
  actions: BulkAction<T>[];
  isLoading?: boolean;
}

export function BulkActions<T extends { id?: string; $id?: string }>({
  items,
  selectedIds,
  onSelectionChange,
  idField,
  actions,
  isLoading = false,
}: BulkActionsProps<T>) {
  const [confirmAction, setConfirmAction] = useState<BulkAction<T> | null>(
    null,
  );
  const [isExecuting, setIsExecuting] = useState(false);

  const getId = useCallback(
    (item: T): string => {
      if (idField) {
        return String(item[idField]);
      }
      return (item.id || item.$id || "") as string;
    },
    [idField],
  );

  const selectedItems = items.filter((item) => selectedIds.has(getId(item)));
  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < items.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(items.map(getId)));
    }
  };

  const handleAction = async (action: BulkAction<T>) => {
    if (action.requiresConfirmation) {
      setConfirmAction(action);
      return;
    }

    await executeAction(action);
  };

  const executeAction = async (action: BulkAction<T>) => {
    setIsExecuting(true);
    try {
      await action.handler(selectedItems);
      onSelectionChange(new Set());
    } finally {
      setIsExecuting(false);
      setConfirmAction(null);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4 p-4 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Checkbox
            id="select-all"
            checked={allSelected || (someSelected ? "indeterminate" : false)}
            onCheckedChange={handleSelectAll}
            aria-label={allSelected ? "Deselect all" : "Select all"}
          />
          <label
            htmlFor="select-all"
            className="text-sm font-medium cursor-pointer"
          >
            Select all
          </label>
        </div>

        {selectedIds.size > 0 && (
          <>
            <Badge variant="secondary">{selectedIds.size} selected</Badge>

            <div className="flex items-center gap-2 ml-auto">
              {actions.slice(0, 3).map((action) => (
                <Button
                  key={action.id}
                  variant={
                    action.variant === "destructive" ? "destructive" : "outline"
                  }
                  size="sm"
                  onClick={() => handleAction(action)}
                  disabled={isLoading || isExecuting}
                >
                  {action.icon}
                  <span className="ml-2">{action.label}</span>
                </Button>
              ))}

              {actions.length > 3 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {actions.slice(3).map((action, _index) => (
                      <DropdownMenuItem
                        key={action.id}
                        onClick={() => handleAction(action)}
                        className={
                          action.variant === "destructive"
                            ? "text-destructive"
                            : ""
                        }
                      >
                        {action.icon}
                        <span className="ml-2">{action.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectionChange(new Set())}
              >
                Clear selection
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.confirmTitle || "Confirm action"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.confirmDescription ||
                `This action will affect ${selectedIds.size} items. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmAction && executeAction(confirmAction)}
              className={
                confirmAction?.variant === "destructive"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {isExecuting ? "Processing..." : "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Default bulk actions for contacts
 */
export function getContactBulkActions(handlers: {
  onDelete: (items: unknown[]) => Promise<void>;
  onExport: (items: unknown[]) => Promise<void>;
  onTag: (items: unknown[]) => Promise<void>;
  onEmail: (items: unknown[]) => Promise<void>;
}): BulkAction[] {
  return [
    {
      id: "email",
      label: "Send email",
      icon: <Mail className="h-4 w-4" />,
      handler: handlers.onEmail,
    },
    {
      id: "export",
      label: "Export",
      icon: <Download className="h-4 w-4" />,
      handler: handlers.onExport,
    },
    {
      id: "tag",
      label: "Add tag",
      icon: <Tag className="h-4 w-4" />,
      handler: handlers.onTag,
    },
    {
      id: "delete",
      label: "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      variant: "destructive",
      requiresConfirmation: true,
      confirmTitle: "Delete contacts",
      confirmDescription:
        "Are you sure you want to delete these contacts? This action cannot be undone.",
      handler: handlers.onDelete,
    },
  ];
}
