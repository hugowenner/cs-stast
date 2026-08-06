"use client";

import { useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Menu,
  X,
  Home,
  Swords,
  Target,
  BarChart3,
  Award,
  Search,
  Users,
  Trophy,
  Link2,
} from "lucide-react";
import Link from "next/link";
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

function isActive(href: string, pathname: string, searchParams: URLSearchParams) {
  if (href === "/") {
    return pathname === "/";
  }

  const [basePath, queryStr] = href.split("?");
  const matchPath = pathname.startsWith(basePath);

  if (!matchPath) return false;

  if (queryStr) {
    const params = new URLSearchParams(queryStr);
    for (const [key, val] of params.entries()) {
      if (searchParams.get(key) !== val) return false;
    }
    return true;
  }

  if (basePath === "/sessions" && searchParams.has("view")) {
    return false;
  }

  return true;
}

function DesktopNav({ pathname }: { pathname: string }) {
  const searchParams = useSearchParams();

  return (
    <nav className="hidden md:flex items-center gap-1">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href, pathname, searchParams);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all duration-200 select-none",
              active
                ? "bg-primary/10 text-primary border-primary/20 shadow-[0_0_12px_-3px_rgba(132,108,240,0.15)]"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5 border-transparent",
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function MobileNav({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  const searchParams = useSearchParams();

  return (
    <nav className="md:hidden border-t border-white/5 px-3 pb-3 pt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href, pathname, searchParams);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold border transition-all duration-200 select-none",
              active
                ? "bg-primary/10 text-primary border-primary/20 shadow-[0_0_12px_-3px_rgba(132,108,240,0.15)]"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5 border-transparent",
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const prefersReduced = useReducedMotion();

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6 p-4 sm:p-6 lg:px-10 lg:py-6 min-h-screen">
      {/* Header + Nav */}
      <header className="glass-panel border border-white/10 bg-white/[0.02] rounded-2xl overflow-hidden shadow-2xl">
        {/* Linha superior: logo + status + hamburger */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex flex-col gap-0.5 group shrink-0">
              <span className="text-gradient text-lg font-black tracking-tight group-hover:text-primary transition-colors uppercase">
                CS2 Stats Hub
              </span>
              <span className="text-[8px] text-muted-foreground/50 font-bold tracking-wider uppercase leading-none">
                Counter-Strike Performance Intelligence
              </span>
            </Link>

            <div className="hidden lg:block h-6 w-px bg-white/10 shrink-0" />

            <Suspense fallback={<div className="hidden md:block w-96 h-8 bg-white/5 animate-pulse rounded-lg" />}>
              <DesktopNav pathname={pathname} />
            </Suspense>
          </div>

          {/* Direita: GC status + hamburger mobile */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 select-none">
              <span className="bg-status-critical size-1.5 rounded-full shrink-0 animate-pulse" />
              <Link2 className="size-3 text-muted-foreground/60 shrink-0" />
              <span>GC Companion</span>
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
          <Suspense fallback={<div className="h-16 bg-white/5 animate-pulse" />}>
            <MobileNav pathname={pathname} onClose={() => setMobileOpen(false)} />
          </Suspense>
        )}
      </header>

      {/* Conteúdo principal — full width */}
      <main className="min-w-0 flex-1 pb-4 w-full">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: prefersReduced ? 0 : 7 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: prefersReduced ? 0 : -5 }}
            transition={{ duration: prefersReduced ? 0.01 : 0.18, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
