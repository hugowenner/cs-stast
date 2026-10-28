"use client";

import * as React from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Flame,
  ArrowRight,
  BarChart3,
  Info,
} from "lucide-react";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { cleanMapName, cn } from "@/lib/utils";
import type {
  SeasonComparisonEntry,
  StreakEntry,
  MapPerformanceEntry,
  RecentMatchPoint,
  StreakRecentMatch,
} from "@/server/services/competitive.service";

export interface TendenciasDaTemporadaProps {
  topGainers: SeasonComparisonEntry[];
  topDecliners: SeasonComparisonEntry[];
  hotStreaks: StreakEntry[];
  coldStreaks: StreakEntry[];
  mapWinrates: MapPerformanceEntry[];
  bestMap?: MapPerformanceEntry | null;
  worstMap?: MapPerformanceEntry | null;
}

// ─── Formatadores auxiliares ────────────────────────────────────────────────
function formatRating(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

function formatRatingDelta(delta: number): string {
  const formatted = Math.abs(delta).toFixed(2).replace(".", ",");
  if (delta > 0) return `+${formatted}`;
  if (delta < 0) return `−${formatted}`;
  return formatted;
}

function formatWinrate(value: number): string {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1).replace(".", ",")}%`;
}

function formatDateBr(dateIsoOrStr: string): string {
  try {
    const d = new Date(dateIsoOrStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch {
    return "";
  }
}

// ─── Sparkline interativo das últimas 10 partidas ───────────────────────────
interface RatingSparklineProps {
  matches: RecentMatchPoint[];
  color: "good" | "critical";
}

function RatingSparkline({ matches, color }: RatingSparklineProps) {
  const [activeIdx, setActiveIdx] = React.useState<number | null>(null);

  if (!matches || matches.length === 0) {
    return (
      <div className="h-16 flex items-center justify-center text-[10px] font-mono text-muted-foreground/40">
        Sem histórico recente suficiente
      </div>
    );
  }

  const ratings = matches.map((m) => m.rating);
  const minVal = Math.min(...ratings, 1.0);
  const maxVal = Math.max(...ratings, 1.0);

  // Escala vertical com amplitude mínima de 0.60 para evitar oscilações exageradas
  const targetAmplitude = Math.max(0.6, maxVal - minVal + 0.15);
  const center = (minVal + maxVal) / 2;
  const yMin = center - targetAmplitude / 2;
  const yMax = center + targetAmplitude / 2;

  const width = 280;
  const height = 64;
  const padLeft = 8;
  const padRight = 38; // Espaço para a legenda 1,00
  const padTop = 10;
  const padBottom = 12;

  const usableW = width - padLeft - padRight;
  const usableH = height - padTop - padBottom;

  const points = matches.map((m, idx) => {
    const x =
      matches.length === 1
        ? padLeft + usableW / 2
        : padLeft + (idx / (matches.length - 1)) * usableW;
    const normY = (m.rating - yMin) / (yMax - yMin);
    const y = padTop + (1 - normY) * usableH;
    return { x, y, match: m };
  });

  const pathD = points
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(" ");

  // Linha de base em 1.00
  const baselineNorm = (1.0 - yMin) / (yMax - yMin);
  const baselineY = Math.min(
    height - padBottom,
    Math.max(padTop, padTop + (1 - baselineNorm) * usableH),
  );

  const strokeColor = color === "good" ? "var(--status-good)" : "var(--status-critical)";
  const activePoint = activeIdx !== null ? points[activeIdx] : null;

  return (
    <div className="flex flex-col gap-1.5 pt-2">
      {/* Header do Sparkline com Tooltip Integrado */}
      <div className="flex items-center justify-between text-[10px] font-mono h-4">
        <span className="text-muted-foreground/60 uppercase tracking-wider">
          Últimas {matches.length} partidas (cronológico)
        </span>
        {activePoint ? (
          <span className="font-bold text-foreground truncate max-w-[190px]">
            {formatDateBr(activePoint.match.playedAt)} · {activePoint.match.mapName} ·{" "}
            <span
              className={cn(
                "font-black",
                activePoint.match.rating >= 1.0 ? "text-status-good" : "text-status-critical",
              )}
            >
              {formatRating(activePoint.match.rating)}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground/40 italic">Passe o mouse nos pontos</span>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden bg-background/50 rounded-xs border border-border/40 p-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-14 block select-none"
          onMouseLeave={() => setActiveIdx(null)}
        >
          {/* Baseline de Rating 1.00 */}
          <line
            x1={padLeft}
            y1={baselineY}
            x2={width - padRight}
            y2={baselineY}
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="2 3"
            className="text-muted-foreground/30"
          />
          <text
            x={width - padRight + 4}
            y={baselineY + 3}
            fill="currentColor"
            className="text-[9px] font-mono text-muted-foreground/45 select-none"
          >
            1,00
          </text>

          {/* Linha de Trajetória */}
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Pontos de Partida */}
          {points.map((pt, idx) => {
            const isHovered = activeIdx === idx;
            const isLatest = idx === points.length - 1;
            return (
              <g key={pt.match.matchId || idx}>
                {/* Hit area invisível para facilitar o hover */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="9"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setActiveIdx(idx)}
                />
                {/* Ponto visível */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 4.5 : isLatest ? 3.5 : 2.5}
                  fill={isHovered ? strokeColor : "var(--background)"}
                  stroke={strokeColor}
                  strokeWidth={isHovered ? "2.5" : "1.75"}
                  className="transition-all duration-150 pointer-events-none"
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── Linha compacta para 2º e 3º colocados ──────────────────────────────────
function CompactEvolutionRow({
  entry,
  position,
  color,
}: {
  entry: SeasonComparisonEntry;
  position: 2 | 3;
  color: "good" | "critical";
}) {
  const isGood = color === "good";

  return (
    <div className="flex items-center justify-between gap-3 p-2 rounded-xs bg-surface-deck/60 border border-border/40 hover:border-border/80 transition-micro">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-[10px] font-mono font-bold text-muted-foreground/50 w-4 text-center shrink-0">
          #{position}
        </span>
        <PlayerAvatar
          nickname={entry.player.nickname}
          avatarUrl={entry.player.avatarUrl}
          size="sm"
        />
        <div className="min-w-0">
          <Link
            href={`/players/${entry.player.id}`}
            className="text-xs font-bold text-foreground hover:text-primary transition-micro truncate block"
          >
            {entry.player.nickname}
          </Link>
          <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/60 tabular-nums">
            <span>{formatRating(entry.season.rating)}</span>
            <ArrowRight className="size-2.5 text-muted-foreground/40 shrink-0" />
            <span className={cn("font-semibold", isGood ? "text-status-good" : "text-status-critical")}>
              {formatRating(entry.recent.rating)}
            </span>
          </div>
        </div>
      </div>

      <div className="text-right shrink-0">
        <span
          className={cn(
            "text-xs font-mono font-black tabular-nums block",
            isGood ? "text-status-good" : "text-status-critical",
          )}
        >
          {formatRatingDelta(entry.rawDiff)}
        </span>
        <span className="text-[9px] font-mono text-muted-foreground/50 block">de rating</span>
      </div>
    </div>
  );
}

// ─── Card 1: Maior Evolução ──────────────────────────────────────────────────
function EvolucaoCard({ gainers }: { gainers: SeasonComparisonEntry[] }) {
  const top = gainers.slice(0, 3);
  const featured = top[0] ?? null;
  const rest = top.slice(1);

  return (
    <div className="flex flex-col justify-between p-4 lg:p-5 bg-surface-panel border border-border/60 rounded-sm">
      <div className="flex flex-col gap-3">
        {/* Header do Card */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <TrendingUp className="size-4 text-status-good shrink-0" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-[0.12em] text-foreground truncate">
              Maior evolução
            </h3>
          </div>
          <TacticalBadge label="EM ALTA" variant="good" size="xs" />
        </div>

        <p className="text-[11px] text-muted-foreground/75 font-sans leading-snug">
          Últimas 10 partidas comparadas às 10 anteriores do jogador.
        </p>

        {/* Conteúdo Principal */}
        {!featured ? (
          <div className="p-4 rounded-xs bg-surface-deck/40 border border-border/40 text-center my-auto">
            <p className="text-xs font-mono font-semibold text-foreground/80 mb-1">
              Sem evolução no período
            </p>
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
              São necessárias 20 partidas com rating no período para comparar dois blocos de 10.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pt-1">
            {/* 1º Colocado — Destaque Principal */}
            <div className="p-3.5 bg-surface-deck rounded-xs border border-status-good/30 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <PlayerAvatar
                    nickname={featured.player.nickname}
                    avatarUrl={featured.player.avatarUrl}
                    size="md"
                  />
                  <div className="min-w-0">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-status-good block">
                      #1 Maior salto
                    </span>
                    <Link
                      href={`/players/${featured.player.id}`}
                      className="text-sm font-bold text-foreground hover:text-primary transition-micro truncate block"
                    >
                      {featured.player.nickname}
                    </Link>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-2xl lg:text-3xl font-mono font-black text-status-good tabular-nums block leading-none">
                    {formatRatingDelta(featured.rawDiff)}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/70 font-semibold uppercase tracking-wider block mt-0.5">
                    de rating
                  </span>
                </div>
              </div>

              {/* Comparação Explícita */}
              <div className="flex items-center justify-between text-xs font-mono border-t border-border/40 pt-2 text-muted-foreground/70">
                <span>10 anteriores vs. 10 recentes</span>
                <div className="flex items-center gap-1.5 font-bold tabular-nums">
                  <span className="text-muted-foreground/60">{formatRating(featured.season.rating)}</span>
                  <ArrowRight className="size-3 text-muted-foreground/40 shrink-0" />
                  <span className="text-status-good">{formatRating(featured.recent.rating)}</span>
                </div>
              </div>

              {/* Gráfico Sparkline */}
              <RatingSparkline matches={featured.recentMatches} color="good" />
            </div>

            {/* 2º e 3º Colocados */}
            {rest.length > 0 && (
              <div className="flex flex-col gap-2 pt-1">
                {rest.map((entry, idx) => (
                  <CompactEvolutionRow
                    key={entry.player.id}
                    entry={entry}
                    position={(idx + 2) as 2 | 3}
                    color="good"
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Card 2: Maior Queda ─────────────────────────────────────────────────────
function QuedaCard({ decliners }: { decliners: SeasonComparisonEntry[] }) {
  const top = decliners.slice(0, 3);
  const featured = top[0] ?? null;
  const rest = top.slice(1);

  return (
    <div className="flex flex-col justify-between p-4 lg:p-5 bg-surface-panel border border-border/60 rounded-sm">
      <div className="flex flex-col gap-3">
        {/* Header do Card */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <TrendingDown className="size-4 text-status-critical shrink-0" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-[0.12em] text-foreground truncate">
              Maior queda
            </h3>
          </div>
          <TacticalBadge label="EM QUEDA" variant="critical" size="xs" />
        </div>

        <p className="text-[11px] text-muted-foreground/75 font-sans leading-snug">
          Últimas 10 partidas comparadas às 10 anteriores do jogador.
        </p>

        {/* Conteúdo Principal */}
        {!featured ? (
          <div className="p-4 rounded-xs bg-surface-deck/40 border border-border/40 text-center my-auto">
            <p className="text-xs font-mono font-semibold text-foreground/80 mb-1">
              Sem quedas no período
            </p>
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
              São necessárias 20 partidas com rating no período para comparar dois blocos de 10.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pt-1">
            {/* 1º Colocado — Destaque Principal */}
            <div className="p-3.5 bg-surface-deck rounded-xs border border-status-critical/30 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <PlayerAvatar
                    nickname={featured.player.nickname}
                    avatarUrl={featured.player.avatarUrl}
                    size="md"
                  />
                  <div className="min-w-0">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-status-critical block">
                      #1 Maior oscilação
                    </span>
                    <Link
                      href={`/players/${featured.player.id}`}
                      className="text-sm font-bold text-foreground hover:text-primary transition-micro truncate block"
                    >
                      {featured.player.nickname}
                    </Link>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-2xl lg:text-3xl font-mono font-black text-status-critical tabular-nums block leading-none">
                    {formatRatingDelta(featured.rawDiff)}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/70 font-semibold uppercase tracking-wider block mt-0.5">
                    de rating
                  </span>
                </div>
              </div>

              {/* Comparação Explícita */}
              <div className="flex items-center justify-between text-xs font-mono border-t border-border/40 pt-2 text-muted-foreground/70">
                <span>10 anteriores vs. 10 recentes</span>
                <div className="flex items-center gap-1.5 font-bold tabular-nums">
                  <span className="text-muted-foreground/60">{formatRating(featured.season.rating)}</span>
                  <ArrowRight className="size-3 text-muted-foreground/40 shrink-0" />
                  <span className="text-status-critical">{formatRating(featured.recent.rating)}</span>
                </div>
              </div>

              {/* Gráfico Sparkline */}
              <RatingSparkline matches={featured.recentMatches} color="critical" />
            </div>

            {/* 2º e 3º Colocados */}
            {rest.length > 0 && (
              <div className="flex flex-col gap-2 pt-1">
                {rest.map((entry, idx) => (
                  <CompactEvolutionRow
                    key={entry.player.id}
                    entry={entry}
                    position={(idx + 2) as 2 | 3}
                    color="critical"
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Faixa de resultados de sequência (V/D/E) ───────────────────────────────
function StreakResultStrip({ results }: { results: StreakRecentMatch[] }) {
  if (!results || results.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 pt-1">
      <div className="flex items-center gap-1.5">
        {results.map((r, idx) => {
          const isWin = r.result === "V";
          const isLoss = r.result === "D";
          const isTie = r.result === "E";

          return (
            <div
              key={r.matchId || idx}
              title={`${isWin ? "Vitória" : isLoss ? "Derrota" : "Empate"} (${r.score}) em ${r.mapName} · ${formatDateBr(r.playedAt)}`}
              className={cn(
                "relative flex-1 py-1 text-center font-mono text-[11px] font-black rounded-xs transition-micro border select-none cursor-help",
                isWin && "bg-status-good/20 text-status-good border-status-good/40",
                isLoss && "bg-status-critical/20 text-status-critical border-status-critical/40",
                isTie && "bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30",
                r.isMostRecent && "ring-1 ring-primary ring-offset-1 ring-offset-background",
              )}
            >
              {r.result}
              {r.isMostRecent && (
                <span className="absolute -top-1 -right-1 size-1.5 rounded-full bg-primary" />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground/50">
        <span>← Mais antiga</span>
        <span>Mais recente (atual) →</span>
      </div>
    </div>
  );
}

// ─── Card 3: Sequências Atuais ───────────────────────────────────────────────
function SequenciasCard({
  hotStreaks,
  coldStreaks,
}: {
  hotStreaks: StreakEntry[];
  coldStreaks: StreakEntry[];
}) {
  const hot = hotStreaks[0] ?? null;
  const cold = coldStreaks[0] ?? null;

  const hasAny = Boolean(hot || cold);

  return (
    <div className="flex flex-col justify-between p-4 lg:p-5 bg-surface-panel border border-border/60 rounded-sm">
      <div className="flex flex-col gap-3">
        {/* Header do Card */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Flame className="size-4 text-primary shrink-0" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-[0.12em] text-foreground truncate">
              Sequências atuais
            </h3>
          </div>
          <TacticalBadge label="MOMENTO" variant="gold" size="xs" />
        </div>

        <p className="text-[11px] text-muted-foreground/75 font-sans leading-snug">
          Partidas consecutivas computadas até o último jogo de cada atleta.
        </p>

        {!hasAny ? (
          <div className="p-4 rounded-xs bg-surface-deck/40 border border-border/40 text-center my-auto">
            <p className="text-xs font-mono font-semibold text-foreground/80 mb-1">
              Sem sequências ativas
            </p>
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
              Nenhum jogador possui sequência ativa de 2 ou mais partidas consecutivas.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pt-1">
            {/* Bloco 1: Maior sequência de vitórias */}
            <div className="p-3 bg-surface-deck rounded-xs border border-status-good/25 flex flex-col gap-2">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-status-good">
                Maior sequência de vitórias
              </span>
              {hot ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlayerAvatar
                        nickname={hot.player.nickname}
                        avatarUrl={hot.player.avatarUrl}
                        size="sm"
                      />
                      <Link
                        href={`/players/${hot.player.id}`}
                        className="text-xs font-bold text-foreground hover:text-primary transition-micro truncate block"
                      >
                        {hot.player.nickname}
                      </Link>
                    </div>
                    <span className="text-xs font-mono font-black text-status-good tabular-nums shrink-0">
                      {hot.streak} vitórias seguidas
                    </span>
                  </div>

                  <StreakResultStrip results={hot.recentResults} />
                </>
              ) : (
                <p className="text-[11px] font-mono text-muted-foreground/50 py-1">
                  Nenhuma sequência de vitórias ativa (mínimo de 2).
                </p>
              )}
            </div>

            {/* Bloco 2: Maior sequência sem vencer */}
            <div className="p-3 bg-surface-deck rounded-xs border border-status-critical/25 flex flex-col gap-2">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-status-critical">
                Maior sequência sem vencer
              </span>
              {cold ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlayerAvatar
                        nickname={cold.player.nickname}
                        avatarUrl={cold.player.avatarUrl}
                        size="sm"
                      />
                      <Link
                        href={`/players/${cold.player.id}`}
                        className="text-xs font-bold text-foreground hover:text-primary transition-micro truncate block"
                      >
                        {cold.player.nickname}
                      </Link>
                    </div>
                    <span className="text-xs font-mono font-black text-status-critical tabular-nums shrink-0">
                      {cold.streak} jogos sem vencer
                    </span>
                  </div>

                  <StreakResultStrip results={cold.recentResults} />
                </>
              ) : (
                <p className="text-[11px] font-mono text-muted-foreground/50 py-1">
                  Nenhuma sequência sem vencer ativa (mínimo de 2).
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Card 4: Balanço de Mapas ────────────────────────────────────────────────
function MapasBalancoCard({ mapWinrates }: { mapWinrates: MapPerformanceEntry[] }) {
  // Amostra mínima coletiva de 3 partidas disputadas
  const eligible = mapWinrates.filter((m) => m.matchesPlayed >= 3);

  // Verificação de neutralidade / empate total
  const hasMultipleEligible = eligible.length >= 2;
  const allSameWinrate =
    hasMultipleEligible && eligible.every((m) => m.winrate === eligible[0].winrate);

  const sorted = [...eligible].sort(
    (a, b) => b.winrate - a.winrate || b.matchesPlayed - a.matchesPlayed,
  );
  const best = hasMultipleEligible && !allSameWinrate ? sorted[0] : null;
  const worst =
    hasMultipleEligible && !allSameWinrate ? sorted[sorted.length - 1] : null;

  return (
    <div className="flex flex-col justify-between p-4 lg:p-5 bg-surface-panel border border-border/60 rounded-sm">
      <div className="flex flex-col gap-3">
        {/* Header do Card */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <BarChart3 className="size-4 text-status-info shrink-0" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-[0.12em] text-foreground truncate">
              Balanço de mapas
            </h3>
          </div>
          <TacticalBadge label="COLETIVO" variant="info" size="xs" />
        </div>

        <p className="text-[11px] text-muted-foreground/75 font-sans leading-snug">
          Aproveitamento coletivo da equipe nos mapas com amostra de 3+ jogos.
        </p>

        {/* Estado Neutro ou Exibição dos Extremos */}
        {eligible.length === 0 ? (
          <div className="p-4 rounded-xs bg-surface-deck/40 border border-border/40 text-center my-auto">
            <p className="text-xs font-mono font-semibold text-foreground/80 mb-1">
              Amostra insuficiente
            </p>
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
              Nenhum mapa disputado atingiu o mínimo de 3 partidas no período.
            </p>
          </div>
        ) : eligible.length === 1 ? (
          <div className="p-4 rounded-xs bg-surface-deck/40 border border-border/40 text-center my-auto">
            <p className="text-xs font-mono font-semibold text-foreground/80 mb-1">
              Mapa único qualificado
            </p>
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
              Apenas <strong className="text-foreground">{cleanMapName(eligible[0].map)}</strong> tem 3+ partidas ({formatWinrate(eligible[0].winrate)}). Não há extremos distintos para comparação.
            </p>
          </div>
        ) : allSameWinrate ? (
          <div className="p-4 rounded-xs bg-surface-deck/40 border border-border/40 text-center my-auto">
            <p className="text-xs font-mono font-semibold text-foreground/80 mb-1">
              Aproveitamento uniforme
            </p>
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
              Todos os mapas elegíveis possuem exatamente o mesmo aproveitamento ({formatWinrate(eligible[0].winrate)}). Sem extremos destacados.
            </p>
          </div>
        ) : best && worst ? (
          <div className="flex flex-col gap-3 pt-1">
            {/* Melhor Mapa */}
            <div className="p-3 bg-surface-deck rounded-xs border border-status-good/30 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-status-good block">
                    Maior aproveitamento
                  </span>
                  <span className="text-xs font-mono font-bold text-foreground truncate block">
                    {best.cleanMapName || cleanMapName(best.map)}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-base font-mono font-black text-status-good tabular-nums block leading-none">
                    {formatWinrate(best.winrate)}
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground/60 block mt-0.5">
                    {best.wins}V em {best.matchesPlayed} jogos
                  </span>
                </div>
              </div>

              {/* Barra de Progresso 0 a 100% */}
              <div className="w-full h-1.5 bg-background rounded-full overflow-hidden border border-border/30">
                <div
                  className="h-full bg-status-good rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, best.winrate))}%` }}
                />
              </div>
            </div>

            {/* Pior Mapa */}
            <div className="p-3 bg-surface-deck rounded-xs border border-status-critical/30 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-status-critical block">
                    Menor aproveitamento
                  </span>
                  <span className="text-xs font-mono font-bold text-foreground truncate block">
                    {worst.cleanMapName || cleanMapName(worst.map)}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-base font-mono font-black text-status-critical tabular-nums block leading-none">
                    {formatWinrate(worst.winrate)}
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground/60 block mt-0.5">
                    {worst.wins}V em {worst.matchesPlayed} jogos
                  </span>
                </div>
              </div>

              {/* Barra de Progresso 0 a 100% */}
              <div className="w-full h-1.5 bg-background rounded-full overflow-hidden border border-border/30">
                <div
                  className="h-full bg-status-critical rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, worst.winrate))}%` }}
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* Rodapé explicativo sobre o cálculo coletivo */}
        <div className="flex items-start gap-1.5 pt-2 border-t border-border/30 text-[10px] text-muted-foreground/60">
          <Info className="size-3 text-muted-foreground/40 shrink-0 mt-0.5" />
          <span>
            Cálculo coletivo sobre partidas únicas com ≥ 2 monitorados. Confrontos diretos entre monitorados são excluídos.
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export function TendenciasDaTemporada({
  topGainers,
  topDecliners,
  hotStreaks,
  coldStreaks,
  mapWinrates,
}: TendenciasDaTemporadaProps) {
  const hasContent =
    topGainers.length > 0 ||
    topDecliners.length > 0 ||
    hotStreaks.length > 0 ||
    coldStreaks.length > 0 ||
    mapWinrates.length > 0;

  if (!hasContent) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
      {/* Primeira linha no Desktop: Destaque visual maior */}
      <EvolucaoCard gainers={topGainers} />
      <QuedaCard decliners={topDecliners} />

      {/* Segunda linha no Desktop: Contexto situacional */}
      <SequenciasCard hotStreaks={hotStreaks} coldStreaks={coldStreaks} />
      <MapasBalancoCard mapWinrates={mapWinrates} />
    </div>
  );
}
