import { LayoutDashboard, Users, RefreshCw } from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const ADMIN_NAVIGATION: readonly AdminNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/players", label: "Jogadores", icon: Users },
  { href: "/admin/sync", label: "Sincronizações", icon: RefreshCw },
] as const;
