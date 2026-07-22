"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Footer } from "./footer";
import { Menu } from "lucide-react";
import Link from "next/link";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Fecha o drawer automaticamente ao navegar
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4 p-4 min-h-screen">
      {/* Header Global — visível em todas as telas */}
      <header className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-3 rounded-2xl glass-panel border border-white/10 bg-white/[0.02]">
        <div className="flex flex-col min-w-0">
          <Link href="/" className="flex items-center gap-2 px-1 w-fit group">
            <span className="text-gradient text-xl font-black tracking-tight group-hover:text-primary transition-colors">CS2 Stats Hub</span>
            <span className="text-muted-foreground rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
              Platform
            </span>
          </Link>
          <span className="text-[11px] sm:text-xs text-muted-foreground mt-1 px-1 font-medium leading-relaxed">
            Análise competitiva, estatísticas e evolução do seu lobby de CS2
          </span>
        </div>
        <div className="flex items-center justify-between md:justify-end gap-3 self-stretch md:self-auto border-t border-white/5 pt-3 md:border-t-0 md:pt-0">
          {/* GC Companion Status */}
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground rounded-lg border border-white/10 bg-white/5 px-2.5 py-1">
            <span className="bg-status-critical size-1.5 rounded-full" />
            GC Companion
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-white transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-4 flex-1">
        {/* Overlay de fundo em Mobile */}
        {isOpen && (
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          />
        )}

        {/* Container Sidebar - Drawer em Mobile / Fixo em Desktop */}
        <div
          className={`
            fixed inset-y-0 left-0 z-50 transform lg:transform-none transition-transform duration-300 ease-in-out
            lg:static lg:block lg:translate-x-0
            ${isOpen ? "translate-x-0" : "-translate-x-full"}
            w-64 shrink-0
          `}
        >
          <Sidebar onClose={() => setIsOpen(false)} />
        </div>

        {/* Conteúdo Principal */}
        <main className="min-w-0 flex-1 pb-4 w-full">
          {children}
        </main>
      </div>

      <Footer />
    </div>
  );
}
