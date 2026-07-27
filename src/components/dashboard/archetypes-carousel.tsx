"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AnimatedNumber } from "@/components/motion/animated-number";
import type { PlayerArchetype } from "@/server/services/competitive.service";

interface Props {
  archetypes: PlayerArchetype[];
}

/**
 * Emoji + descrição curta por tipo de archetype — só apresentação (o cálculo de qual
 * archetype cada jogador recebe já vem pronto de getPlayerArchetypesFromDataset).
 * Emoji em vez de ícone lucide por pedido explícito: o protagonista visual do card
 * continua sendo o PlayerAvatar, não um ícone.
 */
const ARCHETYPE_META: Record<
  PlayerArchetype["archetype"],
  { emoji: string; description: string; color: string; bg: string; border: string }
> = {
  entry: {
    emoji: "🔥",
    description: "Abre espaço para o time e inicia os confrontos com frequência.",
    color: "text-status-warning",
    bg: "bg-status-warning/10",
    border: "border-status-warning/20",
  },
  clutch: {
    emoji: "🧠",
    description: "Mantém a calma e vira rounds mesmo em desvantagem numérica.",
    color: "text-accent-violet",
    bg: "bg-accent-violet/10",
    border: "border-accent-violet/20",
  },
  headshot: {
    emoji: "🎯",
    description: "Precisão acima da média — a maioria dos abates vem na cabeça.",
    color: "text-accent-cyan",
    bg: "bg-accent-cyan/10",
    border: "border-accent-cyan/20",
  },
  consistent: {
    emoji: "🛡️",
    description: "Raramente joga abaixo da média — o pilar estável do time.",
    color: "text-status-good",
    bg: "bg-status-good/10",
    border: "border-status-good/20",
  },
  impact: {
    emoji: "⚡",
    description: "Combina rating e dano acima da média — decide partidas sozinho.",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
  },
  support: {
    emoji: "🤝",
    description: "Facilita a vida dos companheiros com assistências e utilitárias.",
    color: "text-accent-violet",
    bg: "bg-accent-violet/10",
    border: "border-accent-violet/20",
  },
  tactician: {
    emoji: "🧩",
    description: "Jogador versátil, sem um ponto fraco único — presença constante no lobby.",
    color: "text-muted-foreground/80",
    bg: "bg-white/[0.05]",
    border: "border-white/[0.1]",
  },
};

/** Classificação simples de "quão alto" o rating está — mesmo número já usado no card, só em faixas. */
function impactTier(rating: number): string {
  if (rating >= 1.15) return "Alto";
  if (rating >= 0.95) return "Médio";
  return "Baixo";
}

export function ArchetypesCarousel({ archetypes }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const getVisibleCount = () => {
    if (typeof window === "undefined") return 2;
    if (window.innerWidth >= 1280) return 4;
    if (window.innerWidth >= 1024) return 3;
    if (window.innerWidth >= 640) return 2;
    return 1;
  };

  const scrollToIndex = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector("[data-archetype-card]") as HTMLElement | null;
    if (!card) return;
    const cardWidth = card.offsetWidth + 12; // gap-3
    el.scrollTo({ left: index * cardWidth, behavior: "smooth" });
  }, []);

  const handlePrev = useCallback(() => {
    const next = Math.max(0, currentIndex - 1);
    setCurrentIndex(next);
    scrollToIndex(next);
  }, [currentIndex, scrollToIndex]);

  const handleNext = useCallback(() => {
    const next = Math.min(archetypes.length - 1, currentIndex + 1);
    setCurrentIndex(next);
    scrollToIndex(next);
  }, [currentIndex, archetypes.length, scrollToIndex]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let timeout: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const card = el.querySelector("[data-archetype-card]") as HTMLElement | null;
        if (!card) return;
        const cardWidth = card.offsetWidth + 12;
        const idx = Math.round(el.scrollLeft / cardWidth);
        setCurrentIndex(Math.min(idx, archetypes.length - 1));
      }, 80);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); clearTimeout(timeout); };
  }, [archetypes.length]);

  const visibleCount = getVisibleCount();
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < archetypes.length - visibleCount;

  if (archetypes.length === 0) {
    return (
      <div className="glass-panel rounded-2xl border border-white/[0.06] p-8 text-center">
        <Sparkles className="size-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground/50">Nenhum perfil de jogo identificado ainda.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Controles */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/55 font-semibold tabular-nums">
          {currentIndex + 1} de {archetypes.length}
        </span>
        <div className="flex items-center gap-1.5">
          <button onClick={handlePrev} disabled={!canPrev} aria-label="Jogador anterior"
            className="flex items-center justify-center size-7 rounded-lg border border-white/[0.07] bg-white/[0.03] text-muted-foreground/60 hover:text-white hover:border-white/[0.12] hover:bg-white/[0.06] disabled:opacity-25 disabled:cursor-not-allowed transition-all">
            <ChevronLeft className="size-3.5" />
          </button>
          <button onClick={handleNext} disabled={!canNext} aria-label="Próximo jogador"
            className="flex items-center justify-center size-7 rounded-lg border border-white/[0.07] bg-white/[0.03] text-muted-foreground/60 hover:text-white hover:border-white/[0.12] hover:bg-white/[0.06] disabled:opacity-25 disabled:cursor-not-allowed transition-all">
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Trilho */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scroll-smooth no-scrollbar"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {archetypes.map((entry) => {
          const meta = ARCHETYPE_META[entry.archetype] ?? ARCHETYPE_META.tactician;

          return (
            <Link
              key={entry.player.id}
              href={`/players/${entry.player.id}`}
              data-archetype-card
              className={`glass-panel card-hover rounded-2xl border overflow-hidden flex-shrink-0 w-full sm:w-[calc(50%-6px)] lg:w-[calc(33.333%-8px)] xl:w-[calc(25%-9px)] flex flex-col ${meta.border}`}
              style={{ scrollSnapAlign: "start" }}
            >
              {/* Header — o avatar continua sendo o protagonista, emoji é só complemento */}
              <div className="px-4 pt-3.5 pb-3 border-b border-white/[0.05] flex items-center gap-3">
                <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-white truncate">{entry.player.nickname}</p>
                  <span className={`inline-flex items-center gap-1 mt-0.5 text-[10px] font-bold ${meta.color}`}>
                    <span aria-hidden>{meta.emoji}</span>
                    {entry.label}
                  </span>
                </div>
              </div>

              {/* Descrição do estilo de jogo */}
              <div className={`px-4 py-2.5 border-b border-white/[0.04] ${meta.bg}`}>
                <p className="text-[10px] text-white/70 leading-relaxed italic">"{meta.description}"</p>
              </div>

              {/* Métricas que justificam o archetype */}
              <div className="px-4 py-3 grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[7px] uppercase tracking-widest font-bold text-muted-foreground/50">
                    {entry.metricLabel}
                  </p>
                  <p className={`text-xs font-black mt-0.5 ${meta.color}`}>{entry.metricValue}</p>
                </div>
                <div>
                  <p className="text-[7px] uppercase tracking-widest font-bold text-muted-foreground/50">Rating</p>
                  <p className="text-xs font-black text-white/85 tabular-nums mt-0.5">
                    <AnimatedNumber value={entry.rating} decimals={2} duration={0.7} />
                  </p>
                </div>
                <div>
                  <p className="text-[7px] uppercase tracking-widest font-bold text-muted-foreground/50">Impacto</p>
                  <p className="text-xs font-black text-white/85 mt-0.5">{impactTier(entry.rating)}</p>
                </div>
              </div>

              {/* Contexto social — já calculado, só nunca tinha sido exibido */}
              <div className="px-4 pb-3 mt-auto flex items-center justify-between">
                <span className="text-[9px] text-muted-foreground/55">{entry.rankText}</span>
                <span className="text-[9px] text-muted-foreground/40 tabular-nums shrink-0">
                  {entry.matchCount} partidas
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 pt-1">
        {archetypes.map((_, i) => (
          <button
            key={i}
            onClick={() => { setCurrentIndex(i); scrollToIndex(i); }}
            aria-label={`Ir para jogador ${i + 1}`}
            className={`rounded-full transition-all ${
              i === currentIndex ? "w-4 h-1.5 bg-primary/70" : "size-1.5 bg-white/[0.15] hover:bg-white/[0.3]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
