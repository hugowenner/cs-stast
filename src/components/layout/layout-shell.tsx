"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Footer } from "./footer";
import { Menu, X, BarChart3, CalendarDays, LayoutDashboard, Trophy, Users, HeartHandshake, Target, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/players", label: "Jogadores", icon: Users },
  { href: "/compare", label: "Scout H2H", icon: HeartHandshake },
  { href: "/sessions", label: "Sessões", icon: CalendarDays },
  { href: "/rankings", label: "Rankings", icon: BarChart3 },
  { href: "/achievements", label: "Conquistas", icon: Trophy },
] as const;

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6 p-4 sm:p-6 lg:px-10 lg:py-6 min-h-screen">

      {/* Header + Nav */}
      <header className="glass-panel border border-white/10 bg-white/[0.02] rounded-2xl overflow-hidden">
        {/* Linha superior: logo + status + hamburger */}
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <span className="text-gradient text-xl font-black tracking-tight group-hover:text-primary transition-colors">
              CS2 Stats Hub
            </span>
            <span className="text-muted-foreground rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
              Platform
            </span>
          </Link>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                  )}
                >
                  <Icon className="size-3.5" />
                  {item.label}
                </Link>
              );
            })}
            <a
              href="https://cs2-team-balance.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            >
              <Target className="size-3.5" />
              Times
              <ExternalLink className="size-2.5" />
            </a>
          </nav>

          {/* Direita: GC status + hamburger mobile */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground rounded-lg border border-white/10 bg-white/5 px-2.5 py-1">
              <span className="bg-status-critical size-1.5 rounded-full" />
              GC Companion
            </div>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-white transition-colors"
              aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Nav mobile */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-white/5 px-3 pb-3 pt-2 grid grid-cols-3 gap-1">
            {NAV_ITEMS.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors",
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                  )}
                >
                  <Icon className="size-3.5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
            <a
              href="https://cs2-team-balance.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            >
              <Target className="size-3.5 shrink-0" />
              Times
              <ExternalLink className="size-2.5" />
            </a>
          </nav>
        )}
      </header>

      {/* Conteúdo principal — full width */}
      <main className="min-w-0 flex-1 pb-4 w-full">
        {children}
      </main>

      <Footer />
    </div>
  );
}
