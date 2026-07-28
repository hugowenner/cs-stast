import { LayoutDashboard, Users, RefreshCw, Database, FileText, Wrench, Settings } from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const ADMIN_NAVIGATION: readonly AdminNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/players", label: "Jogadores", icon: Users },
  { href: "/admin/sync", label: "Sincronizações", icon: RefreshCw },
  { href: "/admin/database", label: "Banco de Dados", icon: Database },
  { href: "/admin/logs", label: "Logs", icon: FileText },
  { href: "/admin/tools", label: "Ferramentas", icon: Wrench },
  { href: "/admin/settings", label: "Configurações", icon: Settings },
] as const;
