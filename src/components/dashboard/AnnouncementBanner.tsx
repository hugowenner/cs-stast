"use client";

import { useState, useEffect } from "react";
import { X, TrendingUp } from "lucide-react";

const STORAGE_KEY = "announcement-banner-lord-level12-dismissed";
const EXPIRATION_DATE = new Date("2026-08-07T09:02:00");

export function AnnouncementBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (new Date() > EXPIRATION_DATE) return;
    if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) return;
    setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="w-full rounded-xl border border-blue-500/20 bg-blue-950/40 backdrop-blur-sm px-4 py-2.5 flex items-center gap-3 shadow-sm">
      <TrendingUp className="shrink-0 text-blue-400" size={16} />
      <p className="flex-1 text-xs sm:text-sm text-blue-100 leading-snug">
        <span className="font-bold text-white">🏆 Level Up!</span>
        {" "}O jogador{" "}
        <span className="font-semibold text-blue-300">Lord</span>{" "}
        acaba de alcançar o{" "}
        <span className="font-semibold text-white">Level 12</span>{" "}
        na Gamers Club. Obrigado a todos que acompanham a evolução do CS2 Stats Hub.{" "}
        <span className="text-blue-300 font-medium">Rumo ao Level 21! 🚀</span>
      </p>
      <button
        onClick={dismiss}
        aria-label="Fechar aviso"
        className="shrink-0 text-blue-400 hover:text-white transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
