"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SeasonOption {
  id: string;
  name: string;
  status: "ACTIVE" | "CLOSED";
}

export function SeasonSelect({
  seasons,
  currentSeasonId,
}: {
  seasons: SeasonOption[];
  currentSeasonId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Garante que createPortal só roda no cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  const activeSeason = seasons.find((s) => s.id === currentSeasonId) ?? seasons[0];

  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuStyle({
      position: "fixed",
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
      zIndex: 9999,
    });
  }, []);

  const handleOpen = () => {
    updateMenuPosition();
    setOpen(true);
  };

  // Reposiciona se a janela for redimensionada com o menu aberto
  useEffect(() => {
    if (!open) return;
    const handleResize = () => updateMenuPosition();
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, [open, updateMenuPosition]);

  // Fecha o menu ao fazer scroll (o menu fixo ficaria desalinhado)
  useEffect(() => {
    if (!open) return;
    const handleScroll = () => setOpen(false);
    window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", handleScroll, { capture: true });
  }, [open]);

  const handleSelect = (seasonId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("season", seasonId);
    router.push(`?${params.toString()}`);
    setOpen(false);
  };

  const menu = (
    <>
      {/* Backdrop para fechar ao clicar fora — renderizado no body, sem z-index relativo */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 9998 }}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div
        className="w-56 rounded-xl border border-white/10 bg-black/90 p-1.5 shadow-2xl backdrop-blur-md focus:outline-none"
        style={menuStyle}
        role="menu"
      >
        <div className="py-1">
          {seasons.map((season) => {
            const isSelected = season.id === currentSeasonId;
            return (
              <button
                key={season.id}
                role="menuitem"
                onClick={() => handleSelect(season.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors duration-150",
                  isSelected
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                <span>{season.name}</span>
                {season.status === "ACTIVE" ? (
                  <span className="text-[8px] uppercase tracking-wider font-extrabold text-status-warning bg-status-warning/10 px-1.5 py-0.5 rounded border border-status-warning/15">
                    Atual
                  </span>
                ) : (
                  <span className="text-[8px] uppercase tracking-wider font-extrabold text-muted-foreground/60 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                    Fechada
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );

  return (
    <div className="relative inline-block text-left">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white px-4 py-2.5 text-xs font-bold transition-all duration-200 focus:outline-none"
      >
        <span>{activeSeason?.name}</span>
        <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </button>

      {/* Menu renderizado em document.body via Portal — escapa overflow e stacking contexts */}
      {open && mounted && createPortal(menu, document.body)}
    </div>
  );
}
