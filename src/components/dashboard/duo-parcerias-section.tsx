"use client";

import { useState } from "react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { Handshake, Target, ChevronLeft, ChevronRight, Trophy, Flame, BarChart3 } from "lucide-react";
import type { DuoSummary, TrioSummary } from "@/server/services/competitive.service";
import type { DashboardHighlight } from "@/server/services/highlights/highlight.types";

interface DuoParceriasSectionProps {
  duos: DuoSummary[];
  dominantTrio: TrioSummary | null;
  highlightsPool?: DashboardHighlight[];
}

export function DuoParceriasSection({ duos, dominantTrio, highlightsPool = [] }: DuoParceriasSectionProps) {
  const [slideIndex, setSlideIndex] = useState(0);

  // Filtrar os destaques de duplas gerados pela Highlights Engine
  const engineSlides = highlightsPool.filter((h) => h.type === "DUO_SYNERGY");

  // Se não houver destaques computados pela engine, criamos slides de fallback baseados na lista padrão
  const slides = engineSlides.length > 0
    ? engineSlides
    : duos.slice(0, 3).map((duo, idx) => {
        const subtitle = idx === 0 ? "Melhor parceria da temporada" : idx === 1 ? "Sinergia recente em alta" : "Dupla mais assídua da temporada";
        const title = idx === 0 ? "Química Perfeita" : idx === 1 ? "Dupla Quente" : "Linha de Frente";
        return {
          id: `fallback-duo-${idx}`,
          type: "DUO_SYNERGY" as const,
          priority: 80 - idx * 5,
          confidence: Math.round(duo.winrate * 0.9), // estimativa
          title,
          subtitle,
          text: `${duo.playerA.nickname} e ${duo.playerB.nickname} apresentam grande entrosamento com ${duo.winrate}% de winrate em ${duo.total} partidas.`,
          players: [
            { id: duo.playerA.id || "a", nickname: duo.playerA.nickname, avatarUrl: duo.playerA.avatarUrl },
            { id: duo.playerB.id || "b", nickname: duo.playerB.nickname, avatarUrl: duo.playerB.avatarUrl },
          ],
          metrics: [
            { label: "Partidas", value: duo.total },
            { label: "Winrate", value: `${duo.winrate}%` },
            { label: "Rating", value: duo.avgRating?.toFixed(2) ?? "—" }
          ],
          period: "season" as const
        };
      });

  if (slides.length === 0 && !dominantTrio) return null;

  const currentSlide = slides[slideIndex];

  const getSlideIcon = (subtitle?: string) => {
    const text = (subtitle || "").toLowerCase();
    if (text.includes("quente") || text.includes("recente")) {
      return <Flame className="size-3 text-status-danger shrink-0" />;
    }
    if (text.includes("assídua") || text.includes("volume")) {
      return <BarChart3 className="size-3 text-accent-cyan shrink-0" />;
    }
    return <Trophy className="size-3 text-accent-gold shrink-0" />;
  };

  const handlePrev = () => {
    setSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setSlideIndex((prev) => (prev + 1) % slides.length);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Card 1: Carrossel de Duplas Dinâmico (Química de Equipe) */}
      {slides.length > 0 && (
        <div className="md:col-span-2 glass-panel rounded-2xl border border-white/[0.06] overflow-hidden flex flex-col justify-between min-h-[260px]">
          {/* Header */}
          <div className="px-4 pt-3.5 pb-2.5 border-b border-white/[0.05] flex items-center gap-2 relative">
            {getSlideIcon(currentSlide.subtitle)}
            <span className="text-[9px] uppercase tracking-widest font-extrabold text-white/80">
              {currentSlide.subtitle}
            </span>
            <span className="text-[9px] text-muted-foreground/60 font-semibold ml-2">
              [{slideIndex + 1}/{slides.length}]
            </span>

            {/* Navigation buttons */}
            {slides.length > 1 && (
              <div className="ml-auto flex gap-1">
                <button
                  onClick={handlePrev}
                  className="w-5 h-5 rounded bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.06] flex items-center justify-center text-white/60 hover:text-white transition-all cursor-pointer"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="size-3" />
                </button>
                <button
                  onClick={handleNext}
                  className="w-5 h-5 rounded bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.06] flex items-center justify-center text-white/60 hover:text-white transition-all cursor-pointer"
                  aria-label="Próximo"
                >
                  <ChevronRight className="size-3" />
                </button>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="px-5 py-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Players side-by-side */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="flex flex-col items-center gap-1">
                <PlayerAvatar nickname={currentSlide.players[0].nickname} avatarUrl={currentSlide.players[0].avatarUrl} size="md" />
                <p className="text-xs font-bold text-white text-center truncate max-w-[90px]">
                  {currentSlide.players[0].nickname}
                </p>
              </div>
              <span className="text-muted-foreground/30 text-lg font-light shrink-0">+</span>
              <div className="flex flex-col items-center gap-1">
                <PlayerAvatar nickname={currentSlide.players[1].nickname} avatarUrl={currentSlide.players[1].avatarUrl} size="md" />
                <p className="text-xs font-bold text-white text-center truncate max-w-[90px]">
                  {currentSlide.players[1].nickname}
                </p>
              </div>
            </div>

            {/* Narrative text description */}
            <div className="flex-1 text-center sm:text-left sm:pl-4">
              <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                {currentSlide.text}
              </p>
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-3 gap-2 px-4 pb-4 mt-auto">
            {currentSlide.metrics.map((m, idx) => (
              <div key={idx} className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-2.5 text-center">
                <p className="text-[8px] uppercase tracking-widest font-extrabold text-muted-foreground/60">{m.label}</p>
                <p className="text-base font-black text-white mt-0.5">{m.value}</p>
              </div>
            ))}
            {/* Se houver confiança calculada de forma explícita */}
            {currentSlide.metrics.length < 3 && currentSlide.confidence !== undefined && (
              <div className="bg-white/[0.015] border border-white/[0.04] rounded-xl p-2.5 text-center">
                <p className="text-[8px] uppercase tracking-widest font-extrabold text-muted-foreground/60">Confiança</p>
                <p className="text-base font-black text-status-good mt-0.5">{currentSlide.confidence}%</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Card 2: Trio Dominante (Fixo) */}
      {dominantTrio ? (
        <div className="glass-panel rounded-2xl border border-accent-cyan/15 bg-accent-cyan/[0.02] overflow-hidden flex flex-col justify-between min-h-[260px]">
          <div className="px-4 pt-3.5 pb-2.5 border-b border-white/[0.05] flex items-center gap-2">
            <Target className="size-3 text-accent-cyan shrink-0" />
            <span className="text-[9px] uppercase tracking-widest font-extrabold text-accent-cyan/80">Trio dominante</span>
            <span className="ml-auto text-[9px] text-muted-foreground/60 font-semibold">{dominantTrio.total} partidas</span>
          </div>
          <div className="px-4 py-4 flex items-center justify-center gap-3">
            {dominantTrio.players.map((p) => (
              <div key={p.id} className="flex flex-col items-center gap-1.5">
                <PlayerAvatar nickname={p.nickname} avatarUrl={p.avatarUrl} size="sm" />
                <p className="text-[10px] font-bold text-white text-center truncate max-w-[72px]">{p.nickname}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5 px-4 pb-4">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2 text-center">
              <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/60">Vitórias</p>
              <p className="text-base font-black text-status-good mt-0.5">{dominantTrio.wins}</p>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2 text-center">
              <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/60">Winrate</p>
              <p className="text-base font-black text-accent-cyan mt-0.5">{dominantTrio.winrate}%</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-white/[0.06] overflow-hidden flex items-center justify-center p-6 text-center text-muted-foreground text-xs font-semibold">
          Nenhum trio com volume mínimo de partidas juntos nesta temporada.
        </div>
      )}

      {/* Outras duplas do hub */}
      {duos.length > 2 && (
        <div className="md:col-span-3 glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/[0.05]">
            <p className="text-[9px] uppercase tracking-widest font-extrabold text-muted-foreground/60">Outras duplas monitoradas</p>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {duos.slice(2).map((duo, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <div className="flex -space-x-2 shrink-0">
                  <PlayerAvatar nickname={duo.playerA.nickname} avatarUrl={duo.playerA.avatarUrl} size="sm" />
                  <PlayerAvatar nickname={duo.playerB.nickname} avatarUrl={duo.playerB.avatarUrl} size="sm" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white/90 truncate">{duo.playerA.nickname} + {duo.playerB.nickname}</p>
                  <p className="text-[10px] text-muted-foreground/65">{duo.total} partidas juntos</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-[8px] text-muted-foreground/60 uppercase tracking-widest font-bold">WR</p>
                    <p className="text-sm font-black text-status-good">{duo.winrate}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-muted-foreground/60 uppercase tracking-widest font-bold">Rating da dupla</p>
                    <p className="text-sm font-black text-white/90">{duo.avgRating?.toFixed(2) ?? "—"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
