"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Swords,
  Target,
  BarChart3,
  Award,
  Search,
  Users,
  Trophy,
  X,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Hub", icon: Home },
  { href: "/sessions", label: "Partidas", icon: Swords },
  { href: "/players", label: "Players", icon: Target },
  { href: "/sessions?view=performance", label: "Performance", icon: BarChart3 },
  { href: "/rankings", label: "Rankings", icon: Award },
  { href: "/compare", label: "Scout H2H", icon: Search },
  { href: "/team-balance", label: "Times", icon: Users },
  { href: "/achievements", label: "Conquistas", icon: Trophy },
] as const;

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="glass-panel lg:sticky lg:top-4 flex h-full lg:h-[calc(100vh-2rem)] w-full lg:w-64 flex-col gap-1 p-4 bg-[#0a0b0d] lg:bg-transparent shadow-2xl">
      <div className="mb-6 flex items-center justify-between px-2">
        <Link href="/" className="flex flex-col gap-0.5 group">
          <span className="text-gradient text-lg font-black tracking-tight group-hover:text-primary transition-colors uppercase">
            CS2 Stats Hub
          </span>
          <span className="text-[8px] text-muted-foreground/50 font-bold tracking-wider uppercase leading-none">
            Performance Intelligence
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
          // simple check for sidebar (query params check not fully needed but good to align)
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href.split("?")[0]);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold border transition-all duration-200 select-none",
                active
                  ? "bg-primary/10 text-primary border-primary/20 shadow-[0_0_12px_-3px_rgba(132,108,240,0.15)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5 border-transparent",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="text-muted-foreground rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs select-none">
        <span className="font-bold text-[9px] uppercase tracking-wider text-muted-foreground/60 block mb-1">
          Integração
        </span>
        <div className="flex items-center gap-1.5 font-medium text-[10px]">
          <span className="bg-status-critical size-1.5 rounded-full shrink-0 animate-pulse" />
          <Link2 className="size-3 text-muted-foreground/60 shrink-0" />
          <span>GC Companion</span>
        </div>
      </div>
    </aside>
  );
}
