"use client"

import { usePermissions } from "@/hooks/use-permissions"
import type { ReactNode } from "react"

interface PermissionGateProps {
  permission: "view_dashboard" | "send_emails" | "manage_users" | "view_analytics" | "export_data"
  children: ReactNode
  fallback?: ReactNode
}

export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const { hasPermission } = usePermissions()

  if (!hasPermission(permission)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
