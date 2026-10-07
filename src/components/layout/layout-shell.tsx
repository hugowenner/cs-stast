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
    <nav className="hidden md:flex items-center gap-1" aria-label="Navegação Principal">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href, pathname, searchParams);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs font-mono border transition-colors duration-150 select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
              active
                ? "bg-primary/10 text-primary border-primary/30 font-semibold shadow-none"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-deck border-transparent",
            )}
            aria-current={active ? "page" : undefined}
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
    <nav className="md:hidden border-t border-border-subtle p-2 sm:p-2.5 grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-surface-deck/90" aria-label="Navegação Mobile">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href, pathname, searchParams);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-2 rounded-sm px-2.5 py-2 text-xs font-mono border transition-colors duration-150 select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
              active
                ? "bg-primary/10 text-primary border-primary/30 font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-panel border-border-subtle/40",
            )}
            aria-current={active ? "page" : undefined}
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
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6 p-4 sm:p-6 lg:px-8 lg:py-6 min-h-screen">
      {/* Header + Nav — Tactical Command Bar */}
      <header className="relative border border-border-subtle bg-surface-panel rounded-sm shadow-sm overflow-hidden">
        {/* Linha superior: logo + nav desktop + controle mobile */}
        <div className="relative z-10 flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 gap-3">
          <div className="flex items-center gap-3 lg:gap-5 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-2.5 group shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              aria-label="CS2 Stats Início"
            >
              <div className="size-7 rounded-sm bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0 group-hover:border-primary/60 transition-colors">
                <span className="font-mono text-[11px] font-black text-primary tracking-tight">CS2</span>
              </div>
              <div className="flex flex-col min-w-0 leading-none">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs sm:text-sm tracking-tight text-foreground group-hover:text-primary transition-colors uppercase whitespace-nowrap">
                    CS2 STATS
                  </span>
                  <span className="font-mono text-[9px] font-bold text-primary/60 tracking-widest uppercase hidden sm:inline">
                    //
                  </span>
                </div>
                <span className="font-mono text-[8px] sm:text-[9px] font-medium text-muted-foreground tracking-wider uppercase truncate mt-0.5">
                  PERFORMANCE INTELLIGENCE
                </span>
              </div>
            </Link>

            <div className="hidden md:block h-5 w-px bg-border-subtle shrink-0" />

            <Suspense fallback={<div className="hidden md:block w-96 h-8 bg-surface-deck animate-pulse rounded-sm" />}>
              <DesktopNav pathname={pathname} />
            </Suspense>
          </div>

          {/* Direita: toggle mobile */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-border-subtle hover:border-border-strong bg-surface-deck text-foreground transition-colors font-mono text-xs"
              aria-label={mobileOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
              <span className="font-bold uppercase text-[10px] hidden min-[360px]:inline">
                {mobileOpen ? "Fechar" : "Menu"}
              </span>
            </button>
          </div>
        </div>

        {/* Nav mobile */}
        {mobileOpen && (
          <div className="relative z-10">
            <Suspense fallback={<div className="h-16 bg-surface-deck animate-pulse" />}>
              <MobileNav pathname={pathname} onClose={() => setMobileOpen(false)} />
            </Suspense>
          </div>
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
