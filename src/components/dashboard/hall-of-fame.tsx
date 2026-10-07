"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PlayerAvatar } from "@/components/players/player-avatar";
import type { HallOfFameRecord, MonitoredPlayerEntry } from "@/server/services/competitive.service";
import {
  Trophy,
  Flame,
  Swords,
  Star,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Brain,
  Skull,
  Bomb,
  ShieldAlert,
  BarChart2,
  AlertTriangle,
  Ghost,
  Activity,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { recordNarratives, worstRecordNarratives } from "@/lib/narrator/templates";
import { TacticalBadge } from "@/components/ui/tactical-badge";

export interface HallOfFameProps {
  records: HallOfFameRecord[];
  worstRecords?: HallOfFameRecord[];
  monitoredPlayers: MonitoredPlayerEntry[];
  variant?: "best" | "worst";
}

interface RecordMeta {
  title: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  iconColor: string;
  accentColor: string;
}

const BEST_METADATA_BY_CATEGORY: Record<string, RecordMeta> = {
  "Recorde de Rating": {
    title: "Maior Rating",
    shortLabel: "Rating",
    icon: Trophy,
    description: "Maior pontuação de Rating 2.0 individual em um único confronto.",
    iconColor: "text-gold",
    accentColor: "text-gold",
  },
  "Maior K/D em Jogo": {
    title: "Maior K/D",
    shortLabel: "K/D",
    icon: Swords,
    description: "Melhor proporção de eliminações por morte em uma partida.",
    iconColor: "text-status-good",
    accentColor: "text-status-good",
  },
  "Maior ADR em Jogo": {
    title: "Maior ADR",
    shortLabel: "ADR",
    icon: Flame,
    description: "Recorde de dano médio por round registrado na temporada.",
    iconColor: "text-primary",
    accentColor: "text-primary",
  },
  "Recorde de Kills": {
    title: "Mais Kills",
    shortLabel: "Kills",
    icon: Swords,
    description: "Maior quantidade de eliminações registradas em uma partida.",
    iconColor: "text-status-good",
    accentColor: "text-status-good",
  },
  "Maior HS% em Jogo": {
    title: "Maior HS%",
    shortLabel: "HS%",
    icon: Star,
    description: "Maior porcentagem de precisão em disparos na cabeça.",
    iconColor: "text-cyan-400",
    accentColor: "text-cyan-400",
  },
  "Maior Sequência de Vitórias": {
    title: "Maior Sequência",
    shortLabel: "Sequência",
    icon: Star,
    description: "Maior número de vitórias consecutivas nesta temporada.",
    iconColor: "text-gold",
    accentColor: "text-gold",
  },
  "Pico de Rating do Hub": {
    title: "Pico de Rating",
    shortLabel: "Pico Rtg",
    icon: TrendingUp,
    description: "Maior pico de pontuação individual alcançado.",
    iconColor: "text-cyan-400",
    accentColor: "text-cyan-400",
  },
  "Maior Impacto em Jogo": {
    title: "Maior Impacto",
    shortLabel: "Impacto",
    icon: Brain,
    description: "Maior índice de jogadas decisivas e abertura de espaço.",
    iconColor: "text-primary",
    accentColor: "text-primary",
  },
  "Mais MultiKills na Temporada": {
    title: "Mais MultiKills",
    shortLabel: "MultiKills",
    icon: Skull,
    description: "Líder agregado de rodadas com 2K, 3K, 4K e 5K.",
    iconColor: "text-status-good",
    accentColor: "text-status-good",
  },
  "Maior Dano em Jogo": {
    title: "Maior Dano Total",
    shortLabel: "Dano",
    icon: Bomb,
    description: "Volume bruto absoluto de dano causado em uma partida.",
    iconColor: "text-primary",
    accentColor: "text-primary",
  },
  "Maior Clutch na Temporada": {
    title: "Maior Clutch",
    shortLabel: "Clutch",
    icon: ShieldAlert,
    description: "Maior quantidade de situações 1vX vencidas sob pressão.",
    iconColor: "text-status-good",
    accentColor: "text-status-good",
  },
  "Maior Consistência na Temporada": {
    title: "Maior Consistência",
    shortLabel: "Consist.",
    icon: BarChart2,
    description: "Maior regularidade de atuações com rating acima da média.",
    iconColor: "text-cyan-400",
    accentColor: "text-cyan-400",
  },
};

const WORST_METADATA_BY_CATEGORY: Record<string, RecordMeta> = {
  "Pior Rating em Jogo": {
    title: "Menor Rating",
    shortLabel: "Rating",
    icon: TrendingDown,
    description: "Menor pontuação individual registrada em uma partida.",
    iconColor: "text-status-critical",
    accentColor: "text-status-critical",
  },
  "Pior K/D em Jogo": {
    title: "Pior K/D",
    shortLabel: "K/D",
    icon: Swords,
    description: "Pior relação entre eliminações e mortes em um confronto.",
    iconColor: "text-status-critical",
    accentColor: "text-status-critical",
  },
  "Menor ADR em Jogo": {
    title: "Menor ADR",
    shortLabel: "ADR",
    icon: Flame,
    description: "Menor média de dano por round registrado.",
    iconColor: "text-status-warning",
    accentColor: "text-status-warning",
  },
  "Mais Mortes em Jogo": {
    title: "Mais Mortes",
    shortLabel: "Mortes",
    icon: Skull,
    description: "Maior quantidade de quedas em uma única partida.",
    iconColor: "text-status-critical",
    accentColor: "text-status-critical",
  },
  "Menor HS% em Jogo": {
    title: "Menor HS%",
    shortLabel: "HS%",
    icon: Star,
    description: "Menor aproveitamento em disparos na cabeça.",
    iconColor: "text-status-warning",
    accentColor: "text-status-warning",
  },
  "Maior Sequência de Derrotas": {
    title: "Sequência de Derrotas",
    shortLabel: "Derrotas",
    icon: AlertTriangle,
    description: "Maior sequência consecutiva de resultados negativos.",
    iconColor: "text-status-critical",
    accentColor: "text-status-critical",
  },
  "Pior Momento no Ranking": {
    title: "Pior Momento no Ranking",
    shortLabel: "Ranking",
    icon: TrendingDown,
    description: "Menor pontuação atingida no ranking da temporada.",
    iconColor: "text-status-warning",
    accentColor: "text-status-warning",
  },
  "Partida Fantasma": {
    title: "Partida Fantasma",
    shortLabel: "Fantasma",
    icon: Ghost,
    description: "Pior combinação combinada de Rating + ADR em jogo.",
    iconColor: "text-muted-foreground",
    accentColor: "text-muted-foreground",
  },
  "Maior Inconsistência na Temporada": {
    title: "Maior Inconsistência",
    shortLabel: "Consist.",
    icon: Activity,
    description: "Maior volume de partidas abaixo de 1.00 de rating.",
    iconColor: "text-status-warning",
    accentColor: "text-status-warning",
  },
};

const DEFAULT_META: RecordMeta = {
  title: "Recorde",
  shortLabel: "Recorde",
  icon: Trophy,
  description: "Recorde oficial registrado na temporada.",
  iconColor: "text-foreground",
  accentColor: "text-foreground",
};

const DEFAULT_WORST_META: RecordMeta = {
  title: "Anomalia",
  shortLabel: "Anomalia",
  icon: TrendingDown,
  description: "Marca atípica registrada na temporada.",
  iconColor: "text-status-warning",
  accentColor: "text-status-warning",
};

const MAP_IMAGES: Record<string, string> = {
  mirage: "/maps/mirage.png",
  dust2: "/maps/dust2.png",
  inferno: "/maps/inferno.png",
  ancient: "/maps/ancient.png",
  anubis: "/maps/anubis.png",
  nuke: "/maps/nuke.png",
  cache: "/maps/cache.png",
  overpass: "/maps/overpass.png",
};

function getMapImage(mapName: string | null | undefined): string | null {
  if (!mapName) return null;
  const norm = mapName.toLowerCase().replace(/^de_/, "").trim();
  return MAP_IMAGES[norm] ?? null;
}

function extractMapName(detail: string): string | null {
  const match = detail.match(/mapa\s+(\w+)/i) || detail.match(/na\s+(\w+)/i);
  return match ? match[1] : null;
}

export function HallOfFame({ records, worstRecords, monitoredPlayers, variant = "best" }: HallOfFameProps) {
  const hasBoth = Boolean(worstRecords && worstRecords.length > 0 && records.length > 0);
  const [mode, setMode] = useState<"best" | "worst">(variant);
  const [activeIndex, setActiveIndex] = useState(0);

  const isWorst = mode === "worst";
  const list = isWorst ? (worstRecords ?? records) : records;
  const categoryMetadata = isWorst ? WORST_METADATA_BY_CATEGORY : BEST_METADATA_BY_CATEGORY;
  const defaultMeta = isWorst ? DEFAULT_WORST_META : DEFAULT_META;
  const allNarratives = isWorst ? worstRecordNarratives : recordNarratives;

  useEffect(() => {
    setActiveIndex(0);
  }, [mode]);

  useEffect(() => {
    if (list.length <= 1) return;
    const t = setInterval(() => setActiveIndex((i) => (i + 1) % list.length), 8000);
    return () => clearInterval(t);
  }, [list.length]);

  if (list.length === 0) return null;

  const record = list[activeIndex] ?? list[0];
  if (!record) return null;

  const meta = categoryMetadata[record.category] ?? defaultMeta;
  const IconComponent = meta.icon;
  const mapName = extractMapName(record.detail);
  const mapImgUrl = record.matchId ? getMapImage(record.mapName || mapName) : null;

  const matchedPlayer = monitoredPlayers.find(
    (mp) => mp.player.nickname.toLowerCase() === record.playerName.toLowerCase()
  )?.player;

  const handlePrev = () => setActiveIndex((i) => (i - 1 + list.length) % list.length);
  const handleNext = () => setActiveIndex((i) => (i + 1) % list.length);

  return (
    <div className="bg-surface-panel border border-border/70 rounded-sm overflow-hidden flex flex-col shadow-sm">
      {/* Top Bar: Selector if both exist + Title */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 border-b border-border/40 bg-surface-deck/50">
        <div className="flex items-center gap-2">
          <TacticalBadge
            label={isWorst ? "ANOMALIAS & PICOS NEGATIVOS" : "HALL DA FAMA // ELITE"}
            variant={isWorst ? "critical" : "gold"}
            size="xs"
          />
          <span className="text-[10px] font-mono text-muted-foreground/60 hidden sm:inline">
            {list.length} marcas registradas
          </span>
        </div>

        {hasBoth && (
          <div className="flex items-center gap-1 bg-surface-panel border border-border/60 p-0.5 rounded-xs">
            <button
              onClick={() => setMode("best")}
              className={cn(
                "px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-xs transition-micro cursor-pointer",
                !isWorst
                  ? "bg-gold/15 text-gold border border-gold/30"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Elite
            </button>
            <button
              onClick={() => setMode("worst")}
              className={cn(
                "px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-xs transition-micro cursor-pointer",
                isWorst
                  ? "bg-status-critical/15 text-status-critical border border-status-critical/30"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Anomalias
            </button>
          </div>
        )}
      </div>

      {/* Main Content: Hero Deck (Col 8) + Category Grid (Col 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border/40 relative">
        
        {/* Left / Hero Record Showcase (8 cols) */}
        <div className="lg:col-span-8 p-5 sm:p-6 flex flex-col justify-between gap-6 relative overflow-hidden">
          {/* Subtle Map Background overlay if present */}
          {mapImgUrl && (
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
              <img
                src={mapImgUrl}
                alt=""
                className="w-full h-full object-cover object-center opacity-15 grayscale-[30%]"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-panel via-surface-panel/90 to-surface-panel/70" />
            </div>
          )}

          {/* Progress Strip */}
          {list.length > 1 && (
            <div className="flex gap-1 relative z-10">
              {list.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveIndex(idx)}
                  className={cn(
                    "h-0.5 flex-1 rounded-none transition-colors duration-200 cursor-pointer",
                    idx === activeIndex
                      ? isWorst ? "bg-status-critical" : "bg-gold"
                      : "bg-border/60 hover:bg-border"
                  )}
                  aria-label={`Ir para marca ${idx + 1}`}
                />
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={`${mode}-${activeIndex}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex flex-col gap-4 relative z-10"
            >
              {/* Category Header */}
              <div className="flex items-center gap-2">
                <div className={cn("flex size-7 items-center justify-center rounded-xs border shrink-0", isWorst ? "bg-status-critical/10 border-status-critical/30 text-status-critical" : "bg-gold/10 border-gold/30 text-gold")}>
                  <IconComponent className="size-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className={cn("text-xs font-mono font-bold uppercase tracking-wider", meta.accentColor)}>
                    {meta.title}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/60">
                    {record.mapName || mapName ? `Mapa ${record.mapName || mapName}` : "Temporada Geral"}
                  </span>
                </div>
              </div>

              {/* Player & Value Matrix */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-y border-border/30 py-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <PlayerAvatar
                    nickname={matchedPlayer?.nickname ?? record.playerName}
                    avatarUrl={matchedPlayer?.avatarUrl ?? null}
                    size="lg"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">
                      Detentor da Marca
                    </span>
                    {matchedPlayer ? (
                      <Link
                        href={`/players/${matchedPlayer.id}`}
                        className="text-lg sm:text-xl font-black tracking-tight text-foreground hover:text-primary transition-colors uppercase truncate"
                      >
                        {matchedPlayer.nickname}
                      </Link>
                    ) : (
                      <span className="text-lg sm:text-xl font-black tracking-tight text-foreground uppercase truncate">
                        {record.playerName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:items-end">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">
                    Valor Registrado
                  </span>
                  <span className={cn("text-3xl sm:text-4xl font-mono font-black tabular-nums leading-tight", isWorst ? "text-status-critical" : "text-gold")}>
                    {record.value}
                  </span>
                </div>
              </div>

              {/* Narrativa ou Descrição Técnica */}
              {allNarratives[record.category] ? (
                <div className="border-l-2 border-border/80 pl-3 py-0.5">
                  <p className={cn("text-xs font-mono font-bold", meta.accentColor)}>
                    {allNarratives[record.category].headline}
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground/70 italic mt-0.5">
                    &ldquo;{allNarratives[record.category].quote}&rdquo;
                  </p>
                </div>
              ) : (
                <p className="text-xs font-mono text-muted-foreground/70">
                  {meta.description}
                </p>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer Controls */}
          <div className="flex items-center justify-between border-t border-border/30 pt-3 relative z-10">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                className="size-7 rounded-xs bg-surface-deck border border-border/50 hover:bg-surface-elevated flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Marca anterior"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <span className="text-[10px] font-mono text-muted-foreground font-bold tabular-nums">
                {activeIndex + 1} / {list.length}
              </span>
              <button
                onClick={handleNext}
                className="size-7 rounded-xs bg-surface-deck border border-border/50 hover:bg-surface-elevated flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Próxima marca"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>

            {record.matchId && (
              <Link
                href={`/matches/${record.matchId}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-mono font-bold uppercase transition-colors"
              >
                <span>Ver Partida</span>
                <ArrowRight className="size-3" />
              </Link>
            )}
          </div>
        </div>

        {/* Right / Category Selector Grid (4 cols) */}
        <div className="lg:col-span-4 p-3 sm:p-4 bg-surface-deck/40 flex flex-col gap-2">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[9px] font-mono uppercase tracking-widest font-bold text-muted-foreground/70">
              Categorias
            </span>
            <span className="text-[9px] font-mono text-muted-foreground/50">{list.length} itens</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5 max-h-[340px] overflow-y-auto no-scrollbar pr-0.5">
            {list.map((r, idx) => {
              const m = categoryMetadata[r.category] ?? defaultMeta;
              const Icon = m.icon;
              const isActive = idx === activeIndex;
              return (
                <button
                  key={r.category}
                  onClick={() => setActiveIndex(idx)}
                  className={cn(
                    "flex items-center gap-2.5 p-2 rounded-xs border text-left transition-micro cursor-pointer",
                    isActive
                      ? isWorst
                        ? "bg-status-critical/10 border-status-critical/40 text-status-critical"
                        : "bg-gold/10 border-gold/40 text-gold"
                      : "bg-surface-panel border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
                  )}
                >
                  <Icon className={cn("size-3.5 shrink-0", isActive ? (isWorst ? "text-status-critical" : "text-gold") : "text-muted-foreground/60")} />
                  <span className="text-[10px] font-mono font-bold uppercase truncate flex-1">
                    {m.shortLabel}
                  </span>
                  <span className="text-[10px] font-mono tabular-nums font-bold opacity-70">
                    {r.value}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
