"use client";

import { useState, useEffect } from "react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import {
  Flame,
  TrendingUp,
  Trophy,
  Handshake,
  Crown,
  Zap,
  Map as MapIcon,
  ChevronLeft,
  ChevronRight,
  Target,
  Swords,
  Star,
  HeartHandshake,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { DashboardHighlight, NarrativeType, HighlightRarity } from "@/server/services/highlights/highlight.types";

interface NarratorSectionProps {
  highlights: DashboardHighlight[];
}

export function NarratorSection({ highlights }: NarratorSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Auto rotate every 10 seconds if there are multiple stories
  useEffect(() => {
    if (highlights.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % highlights.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [highlights.length]);

  if (!highlights || highlights.length === 0) return null;

  const activeHighlight = highlights[activeIndex];

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + highlights.length) % highlights.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % highlights.length);
  };

  const getIcon = (type: NarrativeType, size = "size-5") => {
    switch (type) {
      case "HOT_STREAK":
        return <Flame className={`${size} text-status-danger`} />;
      case "EVOLUTION":
      case "BREAKOUT":
        return <TrendingUp className={`${size} text-status-good`} />;
      case "MAP_MASTER":
        return <MapIcon className={`${size} text-accent-cyan`} />;
      case "DUO_SYNERGY":
        return <Handshake className={`${size} text-status-good`} />;
      case "RECORD":
        return <Trophy className={`${size} text-accent-gold`} />;
      case "IMPACT":
      case "ADR_MONSTER":
        return <Zap className={`${size} text-accent-purple`} />;
      case "DOMINANCE":
        return <Crown className={`${size} text-accent-gold`} />;
      case "CLUTCH_KING":
        return <Swords className={`${size} text-status-danger`} />;
      case "HEADSHOT_MACHINE":
        return <Target className={`${size} text-accent-cyan`} />;
      case "MULTIKILL_SPECIALIST":
        return <Star className={`${size} text-accent-gold`} />;
      case "SUPPORT_HERO":
        return <HeartHandshake className={`${size} text-status-good`} />;
      case "CURIOSITY":
        return <Sparkles className={`${size} text-accent-purple`} />;
      case "COLD_STREAK":
        return <Flame className={`${size} text-muted-foreground`} />;
      case "WEEKLY_STAR":
      case "CONSISTENCY":
      case "ENTRY_FRAGGER":
        return <Star className={`${size} text-accent-cyan`} />;
      default:
        return <Trophy className={`${size} text-muted-foreground`} />;
    }
  };

  const getRarityConfig = (rarity: HighlightRarity) => {
    switch (rarity) {
      case "legendary":
        return { label: "👑 Lendária", color: "border-accent-gold/30 text-accent-gold bg-accent-gold/[0.04]" };
      case "epic":
        return { label: "⚡ Épica", color: "border-accent-purple/30 text-accent-purple bg-accent-purple/[0.04]" };
      case "rare":
        return { label: "💎 Rara", color: "border-accent-cyan/25 text-accent-cyan bg-accent-cyan/[0.03]" };
      default:
        return { label: "📊 Comum", color: "border-white/10 text-muted-foreground bg-white/[0.02]" };
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "competitive":
        return "border-status-danger/20 text-status-danger bg-status-danger/[0.03]";
      case "achievement":
        return "border-accent-gold/20 text-accent-gold bg-accent-gold/[0.03]";
      case "social":
        return "border-accent-cyan/20 text-accent-cyan bg-accent-cyan/[0.03]";
      default:
        return "border-white/10 text-muted-foreground bg-white/[0.02]";
    }
  };

  const getConfidenceLevel = (score: number) => {
    if (score >= 80) return { label: "Alta", color: "text-status-good" };
    if (score >= 50) return { label: "Moderada", color: "text-accent-cyan" };
    return { label: "Amostra Pequena", color: "text-muted-foreground/60" };
  };

  const confidence = getConfidenceLevel(activeHighlight.confidence);
  const rarityConfig = getRarityConfig(activeHighlight.rarity ?? "common");

  return (
    <div className="glass-panel rounded-3xl border border-white/[0.06] overflow-hidden grid grid-cols-1 lg:grid-cols-4 min-h-[300px]">
      
      {/* Coluna da Esquerda: Broadcast Slide Principal (75%) */}
      <div className="lg:col-span-3 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/[0.05] relative">
        
        {/* Story indicators (dots/lines) on top */}
        {highlights.length > 1 && (
          <div className="absolute top-4 left-6 right-6 flex gap-1.5 z-10">
            {highlights.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  idx === activeIndex ? "bg-white/80" : "bg-white/10 hover:bg-white/20"
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Content Section with Animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="space-y-5 pt-3"
          >
            {/* Header: raridade + categoria */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full border text-[9px] uppercase tracking-wider font-extrabold ${rarityConfig.color}`}>
                {rarityConfig.label}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full border text-[9px] uppercase tracking-wider font-extrabold ${getCategoryColor(activeHighlight.category)}`}>
                {activeHighlight.category === "competitive" ? "Competitivo" : activeHighlight.category === "achievement" ? "Conquista" : activeHighlight.category === "curiosity" ? "Curiosidade" : "Social"}
              </span>
              {activeHighlight.subtitle && (
                <span className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-wider">
                  {activeHighlight.subtitle}
                </span>
              )}
            </div>

            {/* Main stage with avatars and details */}
            <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
              {/* Connected Avatars */}
              <div className="flex -space-x-4 shrink-0">
                {activeHighlight.players.map((p) => (
                  <div key={p.id} className="size-16 rounded-2xl border-2 border-slate-950 ring-4 ring-white/5 overflow-hidden bg-slate-900 flex items-center justify-center">
                    <PlayerAvatar nickname={p.nickname} avatarUrl={p.avatarUrl} size="md" />
                  </div>
                ))}
              </div>

              {/* Title & Nicknames */}
              <div className="space-y-1">
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight uppercase font-sans">
                  {activeHighlight.players.map((p) => p.nickname).join(" + ")}
                </h3>
                <p className="text-sm font-semibold text-accent-cyan uppercase tracking-wider">
                  {activeHighlight.title}
                </p>
              </div>
            </div>

            {/* Impact Text */}
            <p className="text-sm sm:text-base font-medium text-muted-foreground leading-relaxed max-w-2xl">
              "{activeHighlight.text}"
            </p>

            {/* Evidence timeline (Last match results) */}
            {activeHighlight.evidenceMatches && activeHighlight.evidenceMatches.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <span className="text-[9px] uppercase tracking-widest font-extrabold text-muted-foreground/55">Últimos Resultados:</span>
                <div className="flex flex-wrap gap-2">
                  {activeHighlight.evidenceMatches.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 bg-white/[0.015] border border-white/[0.05] rounded-xl px-2.5 py-1 text-[10px] font-bold">
                      <span className={m.won ? "text-status-good font-extrabold" : "text-status-danger font-extrabold"}>
                        {m.won ? "✓" : "✗"}
                      </span>
                      <span className="text-white/80 uppercase">{m.mapName}</span>
                      <span className="text-muted-foreground/60">{m.scoreSelf}x{m.scoreOpp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Metrics & Context Board */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-6 border-t border-white/[0.04] mt-6 justify-between">
          <div className="grid grid-cols-3 gap-2.5 w-full sm:w-auto">
            {activeHighlight.metrics.map((m, idx) => (
              <div key={idx} className="bg-white/[0.01] border border-white/[0.03] rounded-xl px-4 py-2.5 text-center min-w-[90px]">
                <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/50">{m.label}</p>
                <p className="text-sm font-black text-white mt-0.5">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Context details */}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground/65 border-l border-white/5 pl-4 shrink-0">
            <div>
              <span className="font-semibold block uppercase tracking-widest text-[8px] text-muted-foreground/40">Amostra</span>
              <span className="text-white/80 font-bold">{activeHighlight.period === "week" ? "Janela Recente" : "Temporada Cheia"}</span>
            </div>
            <div className="border-l border-white/5 pl-3">
              <span className="font-semibold block uppercase tracking-widest text-[8px] text-muted-foreground/40">Confiança</span>
              <span className={`font-black ${confidence.color}`}>{confidence.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Coluna da Direita: Fila de Próximos Highlights (25%) */}
      <div className="p-4 bg-white/[0.015] flex flex-col justify-between">
        <div className="space-y-3">
          <div className="px-2 py-1 flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-widest font-extrabold text-muted-foreground/60">Destaques</span>
            <span className="text-[9px] text-muted-foreground/40 font-bold">{highlights.length} Histórias</span>
          </div>

          <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
            {highlights.map((h, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={h.id}
                  onClick={() => setActiveIndex(idx)}
                  className={`w-full text-left p-2.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                    isActive
                      ? "bg-white/[0.05] border-white/10 shadow-sm"
                      : "bg-transparent border-transparent hover:bg-white/[0.02]"
                  }`}
                >
                  <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? "bg-white/[0.04]" : "bg-white/[0.01]"
                  }`}>
                    {getIcon(h.type, "size-4")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-black truncate uppercase ${
                      isActive ? "text-white" : "text-white/70"
                    }`}>
                      {h.players.map((p) => p.nickname).join(" + ")}
                    </p>
                    <p className="text-[9px] text-muted-foreground/50 truncate font-semibold">
                      {h.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Carousel buttons fallback */}
        {highlights.length > 1 && (
          <div className="flex gap-1.5 mt-4 pt-3 border-t border-white/[0.04]">
            <button
              onClick={handlePrev}
              className="flex-1 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.06] flex items-center justify-center text-white/60 hover:text-white transition-all cursor-pointer"
              aria-label="Anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={handleNext}
              className="flex-1 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.06] flex items-center justify-center text-white/60 hover:text-white transition-all cursor-pointer"
              aria-label="Próximo"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
