"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, LayoutDashboard, Trophy, Users, HeartHandshake, X, Target, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/players", label: "Jogadores", icon: Users },
  { href: "/compare", label: "Scout H2H", icon: HeartHandshake },
  { href: "/sessions", label: "Sessões", icon: CalendarDays },
  { href: "/rankings", label: "Rankings", icon: BarChart3 },
  { href: "/achievements", label: "Conquistas", icon: Trophy },
] as const;

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="glass-panel lg:sticky lg:top-4 flex h-full lg:h-[calc(100vh-2rem)] w-full lg:w-64 flex-col gap-1 p-4 bg-[#0a0b0d] lg:bg-transparent">
      <div className="mb-6 flex items-center justify-between px-2">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-gradient text-xl font-bold tracking-tight">CS2 Stats</span>
          <span className="text-muted-foreground rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold">
            HUB
          </span>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-white transition-colors"
            aria-label="Fechar menu"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary glow-ring"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}

        {/* Ferramentas externas */}
        <p className="text-muted-foreground mt-4 mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider">
          🛠️ Ferramentas
        </p>
        <a
          href="https://cs2-team-balance.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
        >
          <Target className="size-4" />
          <span className="flex-1">🎯 Gerador de Times</span>
          <ExternalLink className="size-3.5 shrink-0" />
        </a>
      </nav>

      <div className="text-muted-foreground rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
        GC Companion
        <div className="mt-1 flex items-center gap-1.5">
          <span className="bg-status-critical size-1.5 rounded-full" />
          Desconectado
        </div>
      </div>
    </aside>
  );
}
