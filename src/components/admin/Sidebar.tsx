"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ADMIN_NAVIGATION } from "@/lib/admin/navigation";
import { LogoutButton } from "./LogoutButton";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-white/5 bg-black/[0.6] backdrop-blur-xl px-4 py-6">
      {/* Brand / Logo */}
      <div className="mb-8 px-2 flex items-center justify-between">
        <Link href="/admin/dashboard" className="flex flex-col gap-0.5 group">
          <span className="text-gradient text-lg font-black tracking-tight group-hover:text-primary transition-colors">
            CS2 Stats Hub
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
              Painel Admin
            </span>
            <span className="bg-primary/20 border border-primary/30 text-primary text-[8px] font-bold px-1 rounded-sm uppercase tracking-wider">
              v1.0
            </span>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5">
        {ADMIN_NAVIGATION.map((item) => {
          const Icon = item.icon;
          // Exact match for dashboard, startswith for other subpaths
          const isActive =
            item.href === "/admin/dashboard"
              ? pathname === "/admin/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all duration-200 group relative overflow-hidden",
                isActive
                  ? "bg-primary/10 text-primary border-l-2 border-primary pl-2.5"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground border-l-2 border-transparent"
              )}
            >
              <Icon className={cn(
                "size-4 shrink-0 transition-transform group-hover:scale-105",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )} />
              <span>{item.label}</span>
              
              {isActive && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="border-t border-white/5 pt-4 mt-auto">
        <div className="mb-4 px-3 flex items-center gap-2.5">
          <div className="size-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary select-none uppercase">
            AD
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-foreground truncate">Administrador</span>
            <span className="text-[10px] text-muted-foreground truncate">Sessão Protegida</span>
          </div>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
