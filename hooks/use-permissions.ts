import { useSession } from "next-auth/react"

type Permission = "view_dashboard" | "send_emails" | "manage_users" | "view_analytics" | "export_data"

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: ["view_dashboard", "send_emails", "manage_users", "view_analytics", "export_data"],
  user: ["view_dashboard", "send_emails", "view_analytics", "export_data"],
}

export function usePermissions() {
  const { data: session } = useSession()
  const userRole = session?.user?.role || "user"

  const hasPermission = (permission: Permission): boolean => {
    return ROLE_PERMISSIONS[userRole]?.includes(permission) || false
  }

  const isAdmin = userRole === "admin"

  return {
    hasPermission,
    isAdmin,
    userRole,
  }
}
