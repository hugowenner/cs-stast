import {
  Activity,
  BarChart2,
  Crosshair,
  MapPin,
  Percent,
  Shield,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Swords,
  Layers,
  Zap,
  Flame,
  Users,
} from "lucide-react";
import { ItemProgressList } from "@/components/ui/item-progress-list";
import { SessionPerformanceChart } from "@/components/charts/session-performance-chart";
import { SectionHeader } from "@/components/ui/section-header";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { DeltaIndicator } from "@/components/ui/delta-indicator";
import { Sparkline } from "@/components/ui/sparkline";
import { SampleIndicator } from "@/components/ui/sample-indicator";
import { getCleanMapImage } from "@/components/ui/map-performance-card";
import { cn } from "@/lib/utils";
import type { TimelineChartPoint } from "@/components/charts/timeline-chart";
import type { SimpleSessionSummary, SessionsOverview } from "@/server/analytics/session.analytics";
import type { SessionPeriod } from "@/components/sessions/session-filters";
import Link from "next/link";

// ─── Tipos locais ─────────────────────────────────────────────────────────────

interface MoodCount {
  excellent: number;
  good: number;
  stable: number;
  difficult: number;
  disaster: number;
}

// ─── Computações Estritamente em Memória ──────────────────────────────────────

function computePerformanceMetrics(sessions: SimpleSessionSummary[]) {
  const n = sessions.length;
  if (n === 0) return null;

  // Winrate global: fórmula correta (soma de vitórias / soma de partidas)
  const totalWins = sessions.reduce((s, x) => s + x.wins, 0);
  const totalLosses = sessions.reduce((s, x) => s + x.losses, 0);
  const totalMatches = sessions.reduce((s, x) => s + x.totalMatches, 0);
  const winrateGlobal = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;

  // Médias simples das médias de sessão
  const ratingMean = sessions.reduce((s, x) => s + x.ratingAvg, 0) / n;
  const adrMean = sessions.reduce((s, x) => s + x.adrAvg, 0) / n;
  const hsMean = sessions.reduce((s, x) => s + x.hsPercentage, 0) / n;

  // Saldo de ELO acumulado e média por sessão
  const eloBalance = sessions.reduce((s, x) => s + x.eloChangeGroup, 0);
  const eloPerSession = n > 0 ? eloBalance / n : 0;

  // Pico e Piso de Rating da temporada
  const ratingValues = sessions.map((s) => s.ratingAvg);
  const peakRating = Math.max(...ratingValues);
  const floorRating = Math.min(...ratingValues);
  const ratingAmplitude = peakRating - floorRating;

  // Consistência: desvio padrão do ratingAvg
  const variance = sessions.reduce((s, x) => s + Math.pow(x.ratingAvg - ratingMean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const consistencyLabel: "ALTA" | "MÉDIA" | "BAIXA" =
    stdDev < 0.05 ? "ALTA" : stdDev < 0.12 ? "MÉDIA" : "BAIXA";

  // Tendência de rating: primeira metade vs segunda metade (requer >= 4 sessões)
  let ratingTrend: "up" | "down" | "stable" = "stable";
  let ratingTrendDiff = 0;
  if (n >= 4) {
    const chronological = [...sessions].reverse();
    const half = Math.floor(n / 2);
    const early = chronological.slice(0, half);
    const recent = chronological.slice(-half);
    const earlyMean = early.reduce((s, x) => s + x.ratingAvg, 0) / early.length;
    const recentMean = recent.reduce((s, x) => s + x.ratingAvg, 0) / recent.length;
    ratingTrendDiff = recentMean - earlyMean;
    if (ratingTrendDiff > 0.03) ratingTrend = "up";
    else if (ratingTrendDiff < -0.03) ratingTrend = "down";
  }

  // MVP mais frequente
  const mvpCount: Record<string, number> = {};
  for (const s of sessions) {
    if (s.mvpName && s.mvpName !== "—") {
      mvpCount[s.mvpName] = (mvpCount[s.mvpName] ?? 0) + 1;
    }
  }
  let topMvpName = "—";
  let topMvpCount = 0;
  for (const [name, count] of Object.entries(mvpCount)) {
    if (count > topMvpCount) {
      topMvpCount = count;
      topMvpName = name;
    }
  }

  // Mapa mais frequente por sessão
  const mapSessionCount: Record<string, number> = {};
  for (const s of sessions) {
    for (const mapName of s.mapNames) {
      mapSessionCount[mapName] = (mapSessionCount[mapName] ?? 0) + 1;
    }
  }
  const mapItems = Object.entries(mapSessionCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({
      name: name.replace(/^de_/i, "").toUpperCase(),
      count,
      percentage: (count / n) * 100,
      subtitle: `${count} ${count === 1 ? "sessão" : "sessões"}`,
    }));

  // Operadores únicos monitorados
  const uniquePlayerIds = new Set<string>();
  sessions.forEach((s) => s.players.forEach((p) => uniquePlayerIds.add(p.id)));

  // Distribuição de desempenho (moods)
  const moodCount: MoodCount = { excellent: 0, good: 0, stable: 0, difficult: 0, disaster: 0 };
  for (const s of sessions) moodCount[s.mood]++;

  // Dados para o gráfico de Rating por sessão (cronológico)
  const chartData: TimelineChartPoint[] = [...sessions]
    .reverse()
    .filter((s) => s.ratingAvg > 0)
    .map((s) => ({
      playedAt: s.date instanceof Date ? s.date.toISOString() : String(s.date),
      value: s.ratingAvg,
    }));

  // Sparkline data (ratings cronológicos)
  const sparklineRatings = chartData.map((d) => d.value);

  return {
    totalWins,
    totalLosses,
    totalMatches,
    ratingMean,
    adrMean,
    hsMean,
    winrateGlobal,
    eloBalance,
    eloPerSession,
    peakRating,
    floorRating,
    ratingAmplitude,
    stdDev,
    consistencyLabel,
    ratingTrend,
    ratingTrendDiff,
    topMvpName,
    topMvpCount,
    mapItems,
    uniquePlayersCount: uniquePlayerIds.size,
    moodCount,
    chartData,
    sparklineRatings,
  };
}

const PERIODS = [
  { value: "all", label: "HISTÓRICO TOTAL" },
  { value: "season", label: "TEMPORADA" },
  { value: "30d", label: "30 DIAS" },
  { value: "7d", label: "7 DIAS" },
] as const;

function PerformancePeriodFilters({ activePeriod }: { activePeriod: SessionPeriod }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
      {/* Switcher de Visão */}
      <div className="flex items-center gap-1 bg-surface-deck p-1 rounded-sm border border-border/40">
        <Link
          href={`/sessions?period=${activePeriod}`}
          className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground/70 hover:text-foreground hover:bg-surface-panel transition-all duration-150"
        >
          <Swords className="size-3.5" />
          <span>Partidas</span>
        </Link>
        <Link
          href={`/sessions?period=${activePeriod}&view=performance`}
          className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-mono font-black uppercase tracking-wider bg-primary text-black shadow-sm transition-all duration-150"
        >
          <BarChart2 className="size-3.5" />
          <span>Performance</span>
        </Link>
      </div>

      {/* Chips de Período */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {PERIODS.map((p) => {
          const isActive = activePeriod === p.value;
          return (
            <Link
              key={p.value}
              href={`/sessions?view=performance&period=${p.value}`}
              className={cn(
                "px-3 py-1.5 rounded-sm text-[11px] font-mono font-bold uppercase tracking-wider transition-all duration-150 border whitespace-nowrap",
                isActive
                  ? "bg-surface-panel text-primary border-primary/50 shadow-sm"
                  : "bg-surface-deck text-muted-foreground/70 border-border/40 hover:text-foreground hover:border-border/80"
              )}
            >
              {p.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

const MOOD_CONFIG: Record<
  SimpleSessionSummary["mood"],
  { label: string; color: string; border: string; desc: string }
> = {
  excellent: {
    label: "EXCELENTE",
    color: "text-status-good",
    border: "border-status-good/30 bg-status-good/10",
    desc: "Aproveitamento ≥ 70% e saldo positivo",
  },
  good: {
    label: "EM EVOLUÇÃO",
    color: "text-accent-cyan",
    border: "border-accent-cyan/30 bg-accent-cyan/10",
    desc: "Aproveitamento ≥ 50% e saldo estável",
  },
  stable: {
    label: "ESTÁVEL",
    color: "text-muted-foreground",
    border: "border-border/60 bg-surface-deck",
    desc: "Saldo de partidas em paridade",
  },
  difficult: {
    label: "DIFÍCIL",
    color: "text-status-warning",
    border: "border-status-warning/30 bg-status-warning/10",
    desc: "Aproveitamento < 50%",
  },
  disaster: {
    label: "CRÍTICA",
    color: "text-status-critical",
    border: "border-status-critical/30 bg-status-critical/10",
    desc: "Aproveitamento < 30% e perda severa",
  },
};

interface SessionPerformanceViewProps {
  sessions: SimpleSessionSummary[];
  overview: SessionsOverview;
  activePeriod: SessionPeriod;
}

export function SessionPerformanceView({
  sessions,
  overview,
  activePeriod,
}: SessionPerformanceViewProps) {
  const metrics = computePerformanceMetrics(sessions);

  return (
    <div className="flex flex-col gap-6">
      {/* ── BLOCO 01: HEADER EDITORIAL & FILTROS ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/40 pb-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold tracking-widest text-primary uppercase">
              01 / PERFORMANCE
            </span>
            <TacticalBadge variant="tactical" size="sm">
              TELEMETRIA CONSOLIDADA
            </TacticalBadge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground flex items-center gap-2.5">
            <BarChart2 className="size-6 text-primary shrink-0" />
            PERFORMANCE INTELLIGENCE HUB
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground/80 max-w-2xl">
            Telemetria competitiva consolidada, dinâmica de evolução temporal, análise de consistência e dispersão estatística de equipe.
          </p>
        </div>

        {metrics && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-surface-panel border border-border/40 shrink-0">
            <SampleIndicator count={metrics.totalMatches} variant="subtle" />
            <span className="text-[11px] font-mono text-muted-foreground/80">
              Amostra: <strong className="text-foreground font-bold">{metrics.totalMatches} partidas</strong> ({sessions.length} noites)
            </span>
          </div>
        )}
      </div>

      {/* Filtros de período */}
      <PerformancePeriodFilters activePeriod={activePeriod} />

      {/* Estado vazio */}
      {!metrics ? (
        <div className="surface-panel rounded-sm border border-border/40 p-12 text-center flex flex-col items-center gap-3">
          <BarChart2 className="size-8 text-muted-foreground/30" />
          <p className="text-sm font-bold text-foreground font-mono uppercase">
            Nenhuma sessão registrada no período selecionado.
          </p>
          <p className="text-xs text-muted-foreground/60 max-w-xs leading-relaxed">
            Dispute partidas com a equipe para que as métricas consolidadas apareçam aqui.
          </p>
        </div>
      ) : (
        <>
          {/* ── BLOCO 01 (Deck): PRIMARY KPI RIBBON ─────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Rating Médio Coletivo */}
            <div className="surface-panel rounded-sm p-4 sm:p-5 border border-border/40 flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between text-muted-foreground/60">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                  RATING 2.0 MÉDIO
                </span>
                <Trophy className="size-3.5 text-primary" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "font-mono text-2xl sm:text-3xl font-black tabular-nums tracking-tight",
                      metrics.ratingMean >= 1.15
                        ? "text-status-good"
                        : metrics.ratingMean < 0.95
                        ? "text-status-critical"
                        : "text-foreground"
                    )}
                  >
                    {metrics.ratingMean.toFixed(2)}
                  </span>
                  {metrics.ratingTrendDiff !== 0 && (
                    <DeltaIndicator
                      value={metrics.ratingTrendDiff.toFixed(2)}
                      direction={metrics.ratingTrend === "stable" ? "neutral" : metrics.ratingTrend}
                      size="xs"
                    />
                  )}
                </div>
                <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">
                  Base ponderada de {sessions.length} sessões
                </p>
              </div>
              <div className="mt-1 pt-2 border-t border-border/30 flex items-center justify-between">
                <span className="text-[9px] font-mono text-muted-foreground/50 uppercase">Evolução:</span>
                <Sparkline data={metrics.sparklineRatings} type="line" width={60} height={14} />
              </div>
            </div>

            {/* Winrate Global */}
            <div className="surface-panel rounded-sm p-4 sm:p-5 border border-border/40 flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between text-muted-foreground/60">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                  WINRATE COLETIVO
                </span>
                <Percent className="size-3.5 text-accent-cyan" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "font-mono text-2xl sm:text-3xl font-black tabular-nums tracking-tight",
                      metrics.winrateGlobal >= 55
                        ? "text-status-good"
                        : metrics.winrateGlobal < 45
                        ? "text-status-critical"
                        : "text-foreground"
                    )}
                  >
                    {metrics.winrateGlobal.toFixed(1)}%
                  </span>
                </div>
                <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">
                  <strong className="text-status-good">{metrics.totalWins}V</strong> - <strong className="text-status-critical">{metrics.totalLosses}D</strong> em {metrics.totalMatches} partidas
                </p>
              </div>
              <div className="mt-1 pt-2 border-t border-border/30">
                <div className="h-1.5 w-full rounded-xs bg-surface-deck border border-border/40 overflow-hidden">
                  <div
                    style={{ width: `${metrics.winrateGlobal}%` }}
                    className={cn(
                      "h-full",
                      metrics.winrateGlobal >= 50 ? "bg-status-good" : "bg-status-critical"
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Dano Médio (ADR) */}
            <div className="surface-panel rounded-sm p-4 sm:p-5 border border-border/40 flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between text-muted-foreground/60">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                  DANO MÉDIO (ADR)
                </span>
                <Target className="size-3.5 text-foreground" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-2xl sm:text-3xl font-black text-foreground tabular-nums tracking-tight">
                    {metrics.adrMean.toFixed(1)}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/60">dano / round</span>
                </div>
                <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">
                  Precisão Headshot: <strong className="text-foreground">{metrics.hsMean.toFixed(1)}%</strong>
                </p>
              </div>
              <div className="mt-1 pt-2 border-t border-border/30 flex items-center justify-between">
                <span className="text-[9px] font-mono text-muted-foreground/50 uppercase">Impacto:</span>
                <span className="text-[10px] font-mono font-bold text-accent-cyan">
                  {metrics.adrMean >= 80 ? "ALTO IMPACTO" : "MÉDIO"}
                </span>
              </div>
            </div>

            {/* Saldo Líquido ELO */}
            <div className="surface-panel rounded-sm p-4 sm:p-5 border border-border/40 flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between text-muted-foreground/60">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                  SALDO TOTAL DE ELO
                </span>
                <Zap className="size-3.5 text-accent-gold" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "font-mono text-2xl sm:text-3xl font-black tabular-nums tracking-tight",
                      metrics.eloBalance > 0
                        ? "text-status-good"
                        : metrics.eloBalance < 0
                        ? "text-status-critical"
                        : "text-foreground"
                    )}
                  >
                    {metrics.eloBalance > 0 ? `+${metrics.eloBalance}` : metrics.eloBalance}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/60">pontos ELO</span>
                </div>
                <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">
                  Média: {metrics.eloPerSession > 0 ? `+${metrics.eloPerSession.toFixed(1)}` : metrics.eloPerSession.toFixed(1)} / sessão
                </p>
              </div>
              <div className="mt-1 pt-2 border-t border-border/30 flex items-center justify-between">
                <span className="text-[9px] font-mono text-muted-foreground/50 uppercase">Status:</span>
                <span className={cn(
                  "text-[10px] font-mono font-bold",
                  metrics.eloBalance >= 0 ? "text-status-good" : "text-status-critical"
                )}>
                  {metrics.eloBalance >= 0 ? "ACUMULATIVO" : "DEFASAGEM"}
                </span>
              </div>
            </div>
          </div>

          {/* ── BLOCO 02: PERFORMANCE TREND & EVOLUTION ─────────────────────── */}
          <div className="surface-panel rounded-sm border border-border/40 p-5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold tracking-widest text-primary uppercase">
                    02 / EVOLUÇÃO TEMPORAL
                  </span>
                  <TacticalBadge variant="neutral" size="xs">
                    RATING 2.0 CRONOLÓGICO
                  </TacticalBadge>
                </div>
                <h3 className="text-sm font-mono font-black text-foreground uppercase tracking-wide">
                  Dinâmica de Rating por Sessão
                </h3>
              </div>

              {metrics.ratingTrend !== "stable" && sessions.length >= 4 && (
                <div
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-mono font-black px-3 py-1 rounded-xs border w-max",
                    metrics.ratingTrend === "up"
                      ? "text-status-good border-status-good/30 bg-status-good/10"
                      : "text-status-critical border-status-critical/30 bg-status-critical/10"
                  )}
                >
                  {metrics.ratingTrend === "up" ? (
                    <TrendingUp className="size-3.5" />
                  ) : (
                    <TrendingDown className="size-3.5" />
                  )}
                  {metrics.ratingTrendDiff > 0 ? "+" : ""}
                  {metrics.ratingTrendDiff.toFixed(2)} vs início do período
                </div>
              )}
            </div>

            {/* Gráfico de Área */}
            <SessionPerformanceChart data={metrics.chartData} />

            {/* Faixa de Amplitude & Picos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-border/30">
              <div className="p-2.5 rounded-xs bg-surface-deck border border-border/40 flex flex-col gap-0.5">
                <span className="text-[9px] font-mono uppercase text-muted-foreground/60 font-bold">
                  Pico de Rating
                </span>
                <span className="font-mono text-base font-black text-status-good tabular-nums">
                  {metrics.peakRating.toFixed(2)}
                </span>
              </div>

              <div className="p-2.5 rounded-xs bg-surface-deck border border-border/40 flex flex-col gap-0.5">
                <span className="text-[9px] font-mono uppercase text-muted-foreground/60 font-bold">
                  Piso de Rating
                </span>
                <span className="font-mono text-base font-black text-status-critical tabular-nums">
                  {metrics.floorRating.toFixed(2)}
                </span>
              </div>

              <div className="p-2.5 rounded-xs bg-surface-deck border border-border/40 flex flex-col gap-0.5">
                <span className="text-[9px] font-mono uppercase text-muted-foreground/60 font-bold">
                  Amplitude (Variação)
                </span>
                <span className="font-mono text-base font-black text-foreground tabular-nums">
                  ±{metrics.ratingAmplitude.toFixed(2)}
                </span>
              </div>

              <div className="p-2.5 rounded-xs bg-surface-deck border border-border/40 flex flex-col gap-0.5">
                <span className="text-[9px] font-mono uppercase text-muted-foreground/60 font-bold">
                  Melhor Sessão
                </span>
                <span className="font-mono text-xs font-bold text-accent-gold truncate" title={overview.bestSession?.name}>
                  {overview.bestSession?.name ?? "—"}
                </span>
              </div>
            </div>
          </div>

          {/* ── BLOCO 03 & 04: COMBAT TELEMETRY & CONSISTENCY ───────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Lado Esquerdo: Combate & Métricas Operacionais (6 cols) */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              <div className="surface-panel rounded-sm border border-border/40 p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2">
                    <Crosshair className="size-4 text-primary" />
                    <h3 className="text-xs font-mono font-black text-foreground uppercase tracking-wider">
                      03 / Telemetria de Combate
                    </h3>
                  </div>
                  <TacticalBadge variant="neutral" size="xs">
                    MÉDIAS
                  </TacticalBadge>
                </div>

                <div className="flex flex-col gap-3">
                  {/* Régua: Precisão Headshots */}
                  <div className="p-3 border border-border/40 bg-surface-deck rounded-xs flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-muted-foreground/80 uppercase">
                        Taxa Média de Headshots
                      </span>
                      <span className="font-mono text-sm font-black text-foreground tabular-nums">
                        {metrics.hsMean.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-xs bg-surface-panel border border-border/40 overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, metrics.hsMean * 1.5)}%` }}
                        className="h-full bg-accent-cyan"
                      />
                    </div>
                  </div>

                  {/* Régua: Volume de Partidas por Noite */}
                  <div className="p-3 border border-border/40 bg-surface-deck rounded-xs flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-muted-foreground/80 uppercase">
                        Ritmo de Partidas / Sessão
                      </span>
                      <span className="font-mono text-sm font-black text-foreground tabular-nums">
                        {overview.avgMatchesPerSession} jogos / noite
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-xs bg-surface-panel border border-border/40 overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, overview.avgMatchesPerSession * 20)}%` }}
                        className="h-full bg-primary"
                      />
                    </div>
                  </div>

                  {/* Detalhes de Lineup e Escopo */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="p-3 border border-border/40 bg-surface-deck rounded-xs flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 text-muted-foreground/60">
                        <Users className="size-3 text-primary" />
                        <span className="text-[10px] font-mono font-bold uppercase">Operadores Ativos</span>
                      </div>
                      <span className="font-mono text-lg font-black text-foreground tabular-nums mt-0.5">
                        {metrics.uniquePlayersCount} jogadores
                      </span>
                    </div>

                    <div className="p-3 border border-border/40 bg-surface-deck rounded-xs flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 text-muted-foreground/60">
                        <Swords className="size-3 text-accent-cyan" />
                        <span className="text-[10px] font-mono font-bold uppercase">Confrontos Totais</span>
                      </div>
                      <span className="font-mono text-lg font-black text-foreground tabular-nums mt-0.5">
                        {metrics.totalMatches} partidas
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Lado Direito: Consistência, Estabilidade & MVP (6 cols) */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              <div className="surface-panel rounded-sm border border-border/40 p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="size-4 text-accent-cyan" />
                    <h3 className="text-xs font-mono font-black text-foreground uppercase tracking-wider">
                      04 / Consistência & Forma
                    </h3>
                  </div>
                  <TacticalBadge
                    variant={
                      metrics.consistencyLabel === "ALTA"
                        ? "good"
                        : metrics.consistencyLabel === "MÉDIA"
                        ? "warning"
                        : "critical"
                    }
                    size="xs"
                  >
                    {metrics.consistencyLabel}
                  </TacticalBadge>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Desvio Padrão */}
                  <div className="p-3 border border-border/40 bg-surface-deck rounded-xs flex flex-col justify-between gap-1">
                    <span className="text-[10px] font-mono font-bold text-muted-foreground/70 uppercase">
                      Desvio Padrão (σ)
                    </span>
                    <span className="font-mono text-xl font-black text-foreground tabular-nums">
                      ±{metrics.stdDev.toFixed(3)}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/50 leading-tight">
                      Dispersão em relação à média
                    </span>
                  </div>

                  {/* MVP Mais Frequente */}
                  <div className="p-3 border border-border/40 bg-surface-deck rounded-xs flex flex-col justify-between gap-1">
                    <span className="text-[10px] font-mono font-bold text-accent-gold uppercase flex items-center gap-1">
                      <Star className="size-3" /> MVP Frequente
                    </span>
                    <span className="font-mono text-base font-black text-foreground truncate" title={metrics.topMvpName}>
                      {metrics.topMvpName}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/50 leading-tight">
                      {metrics.topMvpCount > 0 ? `Líder em ${metrics.topMvpCount} noites` : "Sem dados"}
                    </span>
                  </div>
                </div>

                {/* Resumo de Estabilidade */}
                <div className="p-3 border border-border/40 bg-surface-deck rounded-xs flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground/80">
                    Estabilidade Geral do Grupo:
                  </span>
                  <span className={cn(
                    "font-mono text-xs font-black px-2 py-0.5 rounded-xs border",
                    metrics.consistencyLabel === "ALTA"
                      ? "text-status-good border-status-good/30 bg-status-good/10"
                      : metrics.consistencyLabel === "MÉDIA"
                      ? "text-status-warning border-status-warning/30 bg-status-warning/10"
                      : "text-status-critical border-status-critical/30 bg-status-critical/10"
                  )}>
                    {metrics.consistencyLabel === "ALTA" ? "ALTA REGULARIDADE" : metrics.consistencyLabel === "MÉDIA" ? "VARIAÇÃO MODERADA" : "ALTA OSCILAÇÃO"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── BLOCO 05: MAP INTELLIGENCE & FREQUENCY ──────────────────────── */}
          {metrics.mapItems.length > 0 && (
            <div className="surface-panel rounded-sm border border-border/40 p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  <div>
                    <h3 className="text-xs font-mono font-black text-foreground uppercase tracking-wider">
                      05 / Map Intelligence & Frequência
                    </h3>
                    <p className="text-[11px] font-mono text-muted-foreground/60 mt-0.5">
                      Frequência de escolha e aparição de mapas nas sessões analisadas
                    </p>
                  </div>
                </div>
                <TacticalBadge variant="neutral" size="xs">
                  {metrics.mapItems.length} MAPAS
                </TacticalBadge>
              </div>

              <ItemProgressList
                items={metrics.mapItems}
                emptyMessage="Sem dados de mapas no período."
                barColor="var(--primary)"
              />
            </div>
          )}

          {/* ── BLOCO 06: DISTRIBUIÇÃO DE DESEMPENHO ─────────────────────────── */}
          <div className="surface-panel rounded-sm border border-border/40 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-accent-cyan" />
                <div>
                  <h3 className="text-xs font-mono font-black text-foreground uppercase tracking-wider">
                    06 / Matriz de Distribuição das Sessões
                  </h3>
                  <p className="text-[11px] font-mono text-muted-foreground/60 mt-0.5">
                    Classificação objetiva das noites de jogo com base no saldo de vitórias e ELO
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground/60">
                Total: {sessions.length} sessões
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {(Object.keys(MOOD_CONFIG) as SimpleSessionSummary["mood"][]).map((mood) => {
                const count = metrics.moodCount[mood];
                const pct = sessions.length > 0 ? (count / sessions.length) * 100 : 0;
                const cfg = MOOD_CONFIG[mood];
                return (
                  <div
                    key={mood}
                    className={cn(
                      "rounded-xs border p-3 text-center flex flex-col justify-between gap-1.5 transition-all duration-150",
                      cfg.border
                    )}
                  >
                    <div>
                      <p className={cn("text-2xl font-mono font-black tabular-nums tracking-tight", cfg.color)}>
                        {count}
                      </p>
                      <p className="text-[10px] font-mono uppercase tracking-wider font-bold text-foreground mt-0.5">
                        {cfg.label}
                      </p>
                    </div>
                    <div className="border-t border-border/30 pt-1">
                      <p className="text-[10px] font-mono text-muted-foreground/60 font-semibold tabular-nums">
                        {pct.toFixed(0)}% do período
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
