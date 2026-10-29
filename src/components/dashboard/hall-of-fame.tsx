"use client";

import { useState, useEffect, useId } from "react";
import Link from "next/link";
import { PlayerAvatar } from "@/components/players/player-avatar";
import type {
  HallOfFameRecord,
  MonitoredPlayerEntry,
  RecordHolderContext,
} from "@/server/services/competitive.service";
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
  Calendar,
  Users,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, cleanMapName } from "@/lib/utils";
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
    title: "Maior Rating em Jogo",
    shortLabel: "Rating",
    icon: Trophy,
    description: "Maior pontuação de Rating individual (escala 2.0) registrada em um único confronto.",
    iconColor: "text-gold",
    accentColor: "text-gold",
  },
  "Maior K/D em Jogo": {
    title: "Maior K/D em Jogo",
    shortLabel: "K/D",
    icon: Swords,
    description: "Melhor proporção de eliminações por morte (K/D) registrada em um único confronto.",
    iconColor: "text-status-good",
    accentColor: "text-status-good",
  },
  "Maior ADR em Jogo": {
    title: "Maior ADR em Jogo",
    shortLabel: "ADR",
    icon: Flame,
    description: "Maior média de dano causado por round (Average Damage per Round) registrada em uma partida.",
    iconColor: "text-primary",
    accentColor: "text-primary",
  },
  "Recorde de Kills": {
    title: "Mais Kills em Jogo",
    shortLabel: "Kills",
    icon: Swords,
    description: "Maior número absoluto de eliminações registradas por um jogador em uma única partida.",
    iconColor: "text-status-good",
    accentColor: "text-status-good",
  },
  "Maior HS% em Jogo": {
    title: "Maior HS% em Jogo",
    shortLabel: "HS%",
    icon: Star,
    description: "Maior taxa de tiros na cabeça em eliminações (mínimo de 10 kills para relevância).",
    iconColor: "text-cyan-400",
    accentColor: "text-cyan-400",
  },
  "Maior Sequência de Vitórias": {
    title: "Maior Sequência de Vitórias",
    shortLabel: "Sequência",
    icon: Star,
    description: "Maior número consecutivo de vitórias nesta temporada. Derrota ou empate encerram a contagem.",
    iconColor: "text-gold",
    accentColor: "text-gold",
  },
  "Pico de Rating do Hub": {
    title: "Maior ELO GC registrado",
    shortLabel: "ELO GC",
    icon: TrendingUp,
    description: "Maior pontuação de ELO Gamers Club registrada após uma partida durante o período da temporada.",
    iconColor: "text-cyan-400",
    accentColor: "text-cyan-400",
  },
  "Maior Impacto em Jogo": {
    title: "Maior índice combinado de Rating e ADR",
    shortLabel: "Impacto",
    icon: Brain,
    description: "Índice combinado calculado por (Rating × 100) + ADR em uma única partida. Mede impacto simultâneo.",
    iconColor: "text-primary",
    accentColor: "text-primary",
  },
  "Mais MultiKills na Temporada": {
    title: "Mais MultiKills na Temporada",
    shortLabel: "MultiKills",
    icon: Skull,
    description: "Soma total de rodadas com multikills (2K, 3K, 4K e Aces) acumuladas em partidas da temporada.",
    iconColor: "text-status-good",
    accentColor: "text-status-good",
  },
  "Maior Dano em Jogo": {
    title: "Maior Dano em Jogo",
    shortLabel: "Dano",
    icon: Bomb,
    description: "Volume absoluto de dano causado por um jogador ao longo de uma única partida.",
    iconColor: "text-primary",
    accentColor: "text-primary",
  },
  "Maior Clutch na Temporada": {
    title: "Mais Clutches na Temporada",
    shortLabel: "Clutches",
    icon: ShieldAlert,
    description: "Maior quantidade de situações 1vX vencidas sob pressão durante a temporada.",
    iconColor: "text-status-good",
    accentColor: "text-status-good",
  },
  "Maior Consistência na Temporada": {
    title: "Maior Consistência na Temporada",
    shortLabel: "Consistência",
    icon: BarChart2,
    description: "Índice de consistência = Rating Médio × (1 + % partidas com Rating ≥ 1.00). Amostra mínima de 3 partidas.",
    iconColor: "text-cyan-400",
    accentColor: "text-cyan-400",
  },
};

const WORST_METADATA_BY_CATEGORY: Record<string, RecordMeta> = {
  "Pior Rating em Jogo": {
    title: "Menor Rating em Jogo",
    shortLabel: "Rating",
    icon: TrendingDown,
    description: "Menor pontuação individual de Rating registrada em uma partida com participação substancial.",
    iconColor: "text-status-critical",
    accentColor: "text-status-critical",
  },
  "Pior K/D em Jogo": {
    title: "Menor K/D em Jogo",
    shortLabel: "K/D",
    icon: Swords,
    description: "Pior relação entre eliminações e mortes em um confronto com participação substancial.",
    iconColor: "text-status-critical",
    accentColor: "text-status-critical",
  },
  "Menor ADR em Jogo": {
    title: "Menor ADR em Jogo",
    shortLabel: "ADR",
    icon: Flame,
    description: "Menor média de dano por round registrada em um confronto com participação substancial.",
    iconColor: "text-status-warning",
    accentColor: "text-status-warning",
  },
  "Mais Mortes em Jogo": {
    title: "Mais Mortes em Jogo",
    shortLabel: "Mortes",
    icon: Skull,
    description: "Maior quantidade de mortes sofridas em uma única partida (incluindo prorrogações).",
    iconColor: "text-status-critical",
    accentColor: "text-status-critical",
  },
  "Menor HS% em Jogo": {
    title: "Menor HS% em Jogo",
    shortLabel: "HS%",
    icon: Star,
    description: "Menor porcentagem de eliminações por tiro na cabeça (mínimo de 10 kills para relevância).",
    iconColor: "text-status-warning",
    accentColor: "text-status-warning",
  },
  "Maior Sequência de Derrotas": {
    title: "Maior Sequência de Derrotas",
    shortLabel: "Derrotas",
    icon: AlertTriangle,
    description: "Maior sequência consecutiva de partidas sem vitória (derrotas e empates) na temporada.",
    iconColor: "text-status-critical",
    accentColor: "text-status-critical",
  },
  "Pior Momento no Ranking": {
    title: "Menor ELO GC registrado",
    shortLabel: "ELO GC",
    icon: TrendingDown,
    description: "Menor pontuação de ELO Gamers Club registrada após uma partida durante o período da temporada.",
    iconColor: "text-status-warning",
    accentColor: "text-status-warning",
  },
  "Partida Fantasma": {
    title: "Menor índice combinado de Rating e ADR",
    shortLabel: "Fantasma",
    icon: Ghost,
    description: "Menor índice combinado calculado por (Rating × 100) + ADR em partida com participação substancial.",
    iconColor: "text-muted-foreground",
    accentColor: "text-muted-foreground",
  },
  "Maior Inconsistência na Temporada": {
    title: "Maior Inconsistência na Temporada",
    shortLabel: "Inconsistência",
    icon: Activity,
    description: "Menor índice de consistência entre jogadores com ao menos 3 partidas na temporada.",
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

export function HallOfFame({
  records,
  worstRecords,
  monitoredPlayers,
  variant = "best",
}: HallOfFameProps) {
  const hasBoth = Boolean(worstRecords && worstRecords.length > 0 && records.length > 0);
  const [mode, setMode] = useState<"best" | "worst">(variant);
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");
  const [isExpandedHolders, setIsExpandedHolders] = useState(false);
  const tabListId = useId();

  const isWorst = mode === "worst";
  const list = isWorst ? (worstRecords ?? records) : records;
  const categoryMetadata = isWorst ? WORST_METADATA_BY_CATEGORY : BEST_METADATA_BY_CATEGORY;
  const defaultMeta = isWorst ? DEFAULT_WORST_META : DEFAULT_META;
  const allNarratives = isWorst ? worstRecordNarratives : recordNarratives;

  // Sincroniza activeCategoryId quando muda o modo
  useEffect(() => {
    if (list.length > 0) {
      setActiveCategoryId(list[0].id ?? list[0].category);
      setIsExpandedHolders(false);
    }
  }, [mode, list]);

  if (list.length === 0) return null;

  // Localiza record ativo com suporte determinístico a fallback
  const activeIndex = Math.max(
    0,
    list.findIndex((r) => (r.id ? r.id === activeCategoryId : r.category === activeCategoryId))
  );
  const record = list[activeIndex] ?? list[0];
  if (!record) return null;

  const meta = categoryMetadata[record.category] ?? defaultMeta;
  const displayTitle = record.title ?? meta.title;
  const displayExplanation = record.explanation ?? meta.description;
  const IconComponent = meta.icon;
  const mapNameFromDetail = extractMapName(record.detail);
  const primaryMapName = record.holders?.[0]?.mapName ?? record.mapName ?? mapNameFromDetail;
  const mapImgUrl = record.matchId || record.holders?.[0]?.matchId ? getMapImage(primaryMapName) : null;

  // Normalização de detentores com retrocompatibilidade para snapshots históricos
  const isLegacySnapshot = !record.holders || record.holders.length === 0;
  const holders: RecordHolderContext[] =
    record.holders && record.holders.length > 0
      ? record.holders
      : [
          {
            player: {
              id: monitoredPlayers.find(
                (mp) => mp.player.nickname.toLowerCase() === record.playerName.toLowerCase()
              )?.player.id ?? "historical",
              nickname: record.playerName,
              avatarUrl:
                monitoredPlayers.find(
                  (mp) => mp.player.nickname.toLowerCase() === record.playerName.toLowerCase()
                )?.player.avatarUrl ?? null,
            },
            matchId: record.matchId,
            mapName: record.mapName,
            cleanMapName: record.mapName ? cleanMapName(record.mapName) : undefined,
          },
        ];

  const isShared = (record.isShared ?? holders.length > 1) && holders.length > 1;
  const sharedCount = record.sharedCount ?? holders.length;
  const isUnavailable = record.availability === "unavailable";

  // Navegação manual (sem timer automático)
  const handlePrev = () => {
    const nextIdx = (activeIndex - 1 + list.length) % list.length;
    setActiveCategoryId(list[nextIdx].id ?? list[nextIdx].category);
    setIsExpandedHolders(false);
  };

  const handleNext = () => {
    const nextIdx = (activeIndex + 1) % list.length;
    setActiveCategoryId(list[nextIdx].id ?? list[nextIdx].category);
    setIsExpandedHolders(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNext();
    }
  };

  const availableCount = list.filter((r) => r.availability !== "unavailable").length;
  const unavailableCount = list.length - availableCount;

  return (
    <div
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label="Painel de Recordes da Temporada"
      className="bg-surface-panel border border-border/70 rounded-sm overflow-hidden flex flex-col shadow-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
    >
      {/* Barra Superior de Navegação */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 border-b border-border/40 bg-surface-deck/50">
        <div className="flex items-center gap-2">
          <TacticalBadge
            label={isWorst ? "ANOMALIAS & PICOS NEGATIVOS" : "HALL DA FAMA // ELITE"}
            variant={isWorst ? "critical" : "gold"}
            size="xs"
          />
          <span className="text-[10px] font-mono text-muted-foreground/70 hidden sm:inline">
            {availableCount} marcas disponíveis
            {unavailableCount > 0 ? ` · ${unavailableCount} indisponível` : ""}
          </span>
          {isLegacySnapshot && (
            <TacticalBadge label="REGISTRO HISTÓRICO" variant="neutral" size="xs" />
          )}
        </div>

        {hasBoth && (
          <div className="flex items-center gap-1 bg-surface-panel border border-border/60 p-0.5 rounded-xs">
            <button
              onClick={() => setMode("best")}
              aria-pressed={!isWorst}
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
              aria-pressed={isWorst}
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

      {/* Conteúdo Principal: Hero Deck (8 cols) + Seletor de Categorias (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border/40 relative">
        
        {/* Painel Esquerdo: Hero Record Showcase (8 cols) */}
        <div className="lg:col-span-8 p-5 sm:p-6 flex flex-col justify-between gap-6 relative overflow-hidden">
          
          {/* Imagem de Fundo Sutil do Mapa se aplicável */}
          {mapImgUrl && !isUnavailable && (
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

          {/* Barra de Progresso / Indicador Visual de Marca */}
          {list.length > 1 && (
            <div className="flex gap-1 relative z-10" aria-hidden="true">
              {list.map((r, idx) => {
                const isActive = idx === activeIndex;
                const isItemUnavailable = r.availability === "unavailable";
                return (
                  <button
                    key={r.id ?? r.category}
                    onClick={() => {
                      setActiveCategoryId(r.id ?? r.category);
                      setIsExpandedHolders(false);
                    }}
                    title={r.title ?? r.category}
                    className={cn(
                      "h-1 flex-1 rounded-none transition-colors duration-200 cursor-pointer",
                      isActive
                        ? isWorst
                          ? "bg-status-critical"
                          : "bg-gold"
                        : isItemUnavailable
                        ? "bg-border/30 hover:bg-border/60"
                        : "bg-border/60 hover:bg-border"
                    )}
                  />
                );
              })}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={`${mode}-${record.id ?? record.category}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="flex flex-col gap-4 relative z-10"
            >
              {/* Cabeçalho da Categoria */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={cn(
                      "flex size-7 items-center justify-center rounded-xs border shrink-0",
                      isWorst
                        ? "bg-status-critical/10 border-status-critical/30 text-status-critical"
                        : "bg-gold/10 border-gold/30 text-gold"
                    )}
                  >
                    <IconComponent className="size-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={cn("text-xs font-mono font-bold uppercase tracking-wider truncate", meta.accentColor)}>
                      {displayTitle}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/70">
                      {record.scopeLabel ?? (record.scope === "streak" ? "Sequência" : record.scope === "season_cumulative" ? "Acumulado da Temporada" : "Em uma partida")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isShared && (
                    <TacticalBadge
                      label={`RECORDE COMPARTILHADO · ${sharedCount} JOGADORES`}
                      variant={isWorst ? "critical" : "gold"}
                      size="xs"
                    />
                  )}
                  {isUnavailable && (
                    <TacticalBadge label="TELEMETRIA INDISPONÍVEL" variant="neutral" size="xs" />
                  )}
                </div>
              </div>

              {/* Corpo da Marca: Disponível vs Indisponível */}
              {isUnavailable ? (
                <div className="flex flex-col items-center justify-center p-6 sm:p-8 border border-border/40 rounded-xs bg-surface-deck/40 text-center gap-2.5">
                  <ShieldAlert className="size-8 text-muted-foreground/60" />
                  <span className="text-xs font-mono font-bold uppercase text-foreground">
                    Dados Indisponíveis no Período
                  </span>
                  <p className="text-[11px] font-mono text-muted-foreground/80 max-w-md leading-relaxed">
                    {record.unavailableReason ??
                      "Nenhum evento registrado nesta categoria na telemetria sincronizada das partidas da temporada."}
                  </p>
                </div>
              ) : isShared ? (
                /* Detentores Compartilhados (Multi-holder) */
                <div className="flex flex-col gap-4 border-y border-border/30 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
                      Marca Registrada
                    </span>
                    <span
                      className={cn(
                        "text-3xl sm:text-4xl font-mono font-black tabular-nums leading-tight",
                        isWorst ? "text-status-critical" : "text-gold"
                      )}
                    >
                      {record.value}
                    </span>
                  </div>

                  {/* Grade de Detentores (exibe até 3 ou todos se expandido) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(isExpandedHolders ? holders : holders.slice(0, 3)).map((holder, hIdx) => {
                      const playerEntry = monitoredPlayers.find(
                        (mp) => mp.player.id === holder.player.id
                      )?.player;
                      const outcomeColor =
                        holder.outcome === "win"
                          ? "text-status-good"
                          : holder.outcome === "loss"
                          ? "text-status-critical"
                          : "text-muted-foreground";

                      return (
                        <div
                          key={`${holder.player.id}-${holder.matchId ?? hIdx}`}
                          className="flex flex-col gap-2.5 p-3 rounded-xs border border-border/50 bg-surface-panel/90 shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <PlayerAvatar
                              nickname={holder.player.nickname}
                              avatarUrl={playerEntry?.avatarUrl ?? holder.player.avatarUrl}
                              size="md"
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60">
                                #{hIdx + 1} Detentor
                              </span>
                              {playerEntry?.id ? (
                                <Link
                                  href={`/players/${playerEntry.id}`}
                                  className="text-sm font-black tracking-tight text-foreground hover:text-primary transition-colors uppercase truncate"
                                >
                                  {holder.player.nickname}
                                </Link>
                              ) : (
                                <span className="text-sm font-black tracking-tight text-foreground uppercase truncate">
                                  {holder.player.nickname}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Contexto Específico do Detentor */}
                          <div className="flex flex-col gap-1 border-t border-border/30 pt-2 text-[10px] font-mono text-muted-foreground/80">
                            {holder.mapName && (
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-muted-foreground/60">Mapa:</span>
                                <span className="font-bold text-foreground">
                                  {holder.cleanMapName ?? cleanMapName(holder.mapName)}
                                </span>
                              </div>
                            )}

                            {holder.scoreFormatted && (
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-muted-foreground/60">Placar:</span>
                                <span className={cn("font-bold", outcomeColor)}>
                                  {holder.scoreFormatted}
                                </span>
                              </div>
                            )}

                            {holder.playedAtFormatted && (
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-muted-foreground/60">Data:</span>
                                <span>{holder.playedAtFormatted}</span>
                              </div>
                            )}

                            {holder.participationContext && (
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-muted-foreground/60">Contexto:</span>
                                <span className="truncate">{holder.participationContext}</span>
                              </div>
                            )}

                            {holder.individualStreak?.formattedRange && (
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-muted-foreground/60">Período:</span>
                                <span>{holder.individualStreak.formattedRange}</span>
                              </div>
                            )}

                            {holder.individualStreak?.endedReason && (
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-muted-foreground/60">Status:</span>
                                <span className="text-status-warning">
                                  {holder.individualStreak.endedReason}
                                </span>
                              </div>
                            )}

                            {holder.individualCumulative?.breakdown && (
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-muted-foreground/60">Volume:</span>
                                <span className="truncate">{holder.individualCumulative.breakdown}</span>
                              </div>
                            )}
                          </div>

                          {holder.matchId && (
                            <Link
                              href={`/matches/${holder.matchId}`}
                              className="mt-1 inline-flex items-center justify-center gap-1 py-1 px-2 rounded-xs border border-primary/30 bg-primary/5 hover:bg-primary/15 text-primary text-[10px] font-mono font-bold uppercase transition-colors"
                            >
                              <span>Ver Partida</span>
                              <ExternalLink className="size-2.5" />
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {holders.length > 3 && (
                    <button
                      onClick={() => setIsExpandedHolders((v) => !v)}
                      className="self-center inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-muted-foreground hover:text-foreground uppercase transition-colors py-1 px-2 rounded-xs border border-border/50"
                    >
                      <span>
                        {isExpandedHolders
                          ? "Recolher detentores"
                          : `+ Ver todos os ${holders.length} detentores`}
                      </span>
                      {isExpandedHolders ? (
                        <ChevronUp className="size-3" />
                      ) : (
                        <ChevronDown className="size-3" />
                      )}
                    </button>
                  )}
                </div>
              ) : (
                /* Detentor Único */
                <div className="flex flex-col gap-4 border-y border-border/30 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <PlayerAvatar
                        nickname={holders[0]?.player.nickname ?? record.playerName}
                        avatarUrl={
                          monitoredPlayers.find(
                            (mp) =>
                              mp.player.id === holders[0]?.player.id ||
                              mp.player.nickname.toLowerCase() ===
                                (holders[0]?.player.nickname ?? record.playerName).toLowerCase()
                          )?.player.avatarUrl ?? holders[0]?.player.avatarUrl
                        }
                        size="lg"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">
                          Detentor da Marca
                        </span>
                        {holders[0]?.player.id && holders[0].player.id !== "historical" ? (
                          <Link
                            href={`/players/${holders[0].player.id}`}
                            className="text-lg sm:text-xl font-black tracking-tight text-foreground hover:text-primary transition-colors uppercase truncate"
                          >
                            {holders[0].player.nickname}
                          </Link>
                        ) : (
                          <span className="text-lg sm:text-xl font-black tracking-tight text-foreground uppercase truncate">
                            {holders[0]?.player.nickname ?? record.playerName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:items-end">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">
                        Valor Registrado
                      </span>
                      <span
                        className={cn(
                          "text-3xl sm:text-4xl font-mono font-black tabular-nums leading-tight",
                          isWorst ? "text-status-critical" : "text-gold"
                        )}
                      >
                        {record.value}
                      </span>
                    </div>
                  </div>

                  {/* Contexto Técnico de Enriquecimento (Mapa, Placar, Data, Participação) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-border/20 text-[10px] font-mono">
                    <div className="flex flex-col gap-0.5 p-2 rounded-xs bg-surface-deck/40 border border-border/30">
                      <span className="text-muted-foreground/60 uppercase">Mapa</span>
                      <span className="font-bold text-foreground truncate">
                        {holders[0]?.cleanMapName ?? (record.mapName ? cleanMapName(record.mapName) : "Geral da Temporada")}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5 p-2 rounded-xs bg-surface-deck/40 border border-border/30">
                      <span className="text-muted-foreground/60 uppercase">Resultado</span>
                      <span
                        className={cn(
                          "font-bold truncate",
                          holders[0]?.outcome === "win"
                            ? "text-status-good"
                            : holders[0]?.outcome === "loss"
                            ? "text-status-critical"
                            : "text-foreground"
                        )}
                      >
                        {holders[0]?.scoreFormatted ?? "Registrado"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5 p-2 rounded-xs bg-surface-deck/40 border border-border/30">
                      <span className="text-muted-foreground/60 uppercase">Data / Período</span>
                      <span className="text-muted-foreground truncate">
                        {holders[0]?.playedAtFormatted ??
                          holders[0]?.individualStreak?.formattedRange ??
                          record.sequenceContext?.formattedRange ??
                          "—"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5 p-2 rounded-xs bg-surface-deck/40 border border-border/30">
                      <span className="text-muted-foreground/60 uppercase">Participação</span>
                      <span className="text-muted-foreground truncate">
                        {holders[0]?.participationContext ??
                          (record.cumulativeContext?.matchesPlayed
                            ? `${record.cumulativeContext.matchesPlayed} partidas`
                            : "Amostra oficial")}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Explicação Técnica e Narrativa */}
              <div className="flex flex-col gap-2">
                {allNarratives[record.category] && !isUnavailable && (
                  <div className="border-l-2 border-border/80 pl-3 py-0.5">
                    <p className={cn("text-xs font-mono font-bold", meta.accentColor)}>
                      {allNarratives[record.category].headline}
                    </p>
                    <p className="text-[11px] font-mono text-muted-foreground/70 italic mt-0.5">
                      &ldquo;{allNarratives[record.category].quote}&rdquo;
                    </p>
                  </div>
                )}

                <p className="text-[11px] font-mono text-muted-foreground/75 leading-relaxed">
                  <span className="text-muted-foreground/50 uppercase font-bold mr-1.5">Regra:</span>
                  {displayExplanation}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Rodapé: Controles de Navegação e Link para Partida */}
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
                {activeIndex + 1} de {list.length}
              </span>
              <button
                onClick={handleNext}
                className="size-7 rounded-xs bg-surface-deck border border-border/50 hover:bg-surface-elevated flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Próxima marca"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>

            {/* Link para Partida (se detentor único possuir matchId) */}
            {!isShared && (holders[0]?.matchId || record.matchId) && (
              <Link
                href={`/matches/${holders[0]?.matchId ?? record.matchId}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-mono font-bold uppercase transition-colors"
              >
                <span>Ver Partida</span>
                <ArrowRight className="size-3" />
              </Link>
            )}
          </div>
        </div>

        {/* Painel Direito: Seletor de Categorias (4 cols) */}
        <div
          id={tabListId}
          role="tablist"
          aria-label="Categorias de Recordes"
          className="lg:col-span-4 p-3 sm:p-4 bg-surface-deck/40 flex flex-col gap-2"
        >
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[9px] font-mono uppercase tracking-widest font-bold text-muted-foreground/70">
              Categorias
            </span>
            <span className="text-[9px] font-mono text-muted-foreground/50">
              {list.length} itens
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5 max-h-[420px] overflow-y-auto no-scrollbar pr-0.5">
            {list.map((r, idx) => {
              const m = categoryMetadata[r.category] ?? defaultMeta;
              const Icon = m.icon;
              const isItemActive = idx === activeIndex;
              const isItemUnavailable = r.availability === "unavailable";
              const label = r.shortLabel ?? m.shortLabel;

              return (
                <button
                  key={r.id ?? r.category}
                  role="tab"
                  aria-selected={isItemActive}
                  onClick={() => {
                    setActiveCategoryId(r.id ?? r.category);
                    setIsExpandedHolders(false);
                  }}
                  className={cn(
                    "flex items-center gap-2.5 p-2 rounded-xs border text-left transition-micro cursor-pointer",
                    isItemActive
                      ? isWorst
                        ? "bg-status-critical/10 border-status-critical/40 text-status-critical"
                        : "bg-gold/10 border-gold/40 text-gold"
                      : "bg-surface-panel border-border/40 text-muted-foreground hover:text-foreground hover:border-border",
                    isItemUnavailable && !isItemActive && "opacity-60"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-3.5 shrink-0",
                      isItemActive
                        ? isWorst
                          ? "text-status-critical"
                          : "text-gold"
                        : "text-muted-foreground/60"
                    )}
                  />
                  <span className="text-[10px] font-mono font-bold uppercase truncate flex-1">
                    {label}
                  </span>
                  <span className="text-[10px] font-mono tabular-nums font-bold opacity-80 shrink-0">
                    {isItemUnavailable ? "—" : r.value}
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
