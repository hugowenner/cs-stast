import {
  Activity,
  BarChart2,
  Crosshair,
  Map,
  Percent,
  Shield,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { StatTile } from "@/components/ui/stat-tile";
import { ItemProgressList } from "@/components/ui/item-progress-list";
import { SessionPerformanceChart } from "@/components/charts/session-performance-chart";
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

// ─── Computações (server-side, em memória) ────────────────────────────────────

function computePerformanceMetrics(sessions: SimpleSessionSummary[]) {
  const n = sessions.length;
  if (n === 0) return null;

  // Winrate global: fórmula correta (soma de vitórias / soma de partidas)
  const totalWins = sessions.reduce((s, x) => s + x.wins, 0);
  const totalMatches = sessions.reduce((s, x) => s + x.totalMatches, 0);
  const winrateGlobal = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;

  // Médias simples das médias de sessão (melhor aproximação disponível)
  const ratingMean = sessions.reduce((s, x) => s + x.ratingAvg, 0) / n;
  const adrMean = sessions.reduce((s, x) => s + x.adrAvg, 0) / n;
  const hsMean = sessions.reduce((s, x) => s + x.hsPercentage, 0) / n;

  // Saldo de ELO acumulado (soma dos saldos de grupo por sessão)
  const eloBalance = sessions.reduce((s, x) => s + x.eloChangeGroup, 0);

  // Consistência: desvio padrão do ratingAvg
  const variance = sessions.reduce((s, x) => s + Math.pow(x.ratingAvg - ratingMean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const consistencyLabel =
    stdDev < 0.05 ? "Alta" : stdDev < 0.12 ? "Média" : "Baixa";

  // Tendência de rating: primeira metade vs segunda metade (requer >= 4 sessões)
  let ratingTrend: "up" | "down" | "stable" = "stable";
  let ratingTrendDiff = 0;
  if (n >= 4) {
    // sessions vêm ordenadas mais recente → mais antiga, reverter para cronológico
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
    if (count > topMvpCount) { topMvpCount = count; topMvpName = name; }
  }

  // Mapa mais frequente por sessão (contagem de aparições em sessões distintas)
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
      name,
      count,
      percentage: (count / n) * 100,
      subtitle: `${count} ${count === 1 ? "sessão" : "sessões"}`,
    }));

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

  return {
    ratingMean,
    adrMean,
    hsMean,
    winrateGlobal,
    eloBalance,
    stdDev,
    consistencyLabel,
    ratingTrend,
    ratingTrendDiff,
    topMvpName,
    topMvpCount,
    mapItems,
    moodCount,
    chartData,
  };
}

// ─── Filtros de período (preserva view=performance) ───────────────────────────

const PERIODS = [
  { value: "all", label: "Todas" },
  { value: "season", label: "Temporada" },
  { value: "30d", label: "30 dias" },
  { value: "7d", label: "7 dias" },
] as const;

function PerformancePeriodFilters({ activePeriod }: { activePeriod: SessionPeriod }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none whitespace-nowrap flex-nowrap shrink-0">
      {PERIODS.map((p) => (
        <Link
          key={p.value}
          href={`/sessions?view=performance&period=${p.value}`}
          className={cn(
            "rounded-xl px-4 py-2 text-xs font-bold transition-all border",
            activePeriod === p.value
              ? "bg-primary text-black border-primary font-black shadow-[0_0_12px_0_rgba(var(--primary-rgb),0.15)]"
              : "text-muted-foreground/75 border-white/[0.06] bg-white/[0.02] hover:text-white hover:border-white/[0.12] hover:bg-white/[0.04]",
          )}
        >
          {p.label}
        </Link>
      ))}
    </div>
  );
}

// ─── Configuração visual dos moods ────────────────────────────────────────────

const MOOD_CONFIG: Record<
  SimpleSessionSummary["mood"],
  { label: string; color: string; border: string }
> = {
  excellent: {
    label: "Excelente",
    color: "text-status-good",
    border: "border-status-good/20 bg-status-good/[0.04]",
  },
  good: {
    label: "Boa",
    color: "text-accent-cyan",
    border: "border-accent-cyan/20 bg-accent-cyan/[0.04]",
  },
  stable: {
    label: "Estável",
    color: "text-muted-foreground",
    border: "border-white/10 bg-white/[0.02]",
  },
  difficult: {
    label: "Difícil",
    color: "text-status-warning",
    border: "border-status-warning/20 bg-status-warning/[0.04]",
  },
  disaster: {
    label: "Crítica",
    color: "text-status-critical",
    border: "border-status-critical/20 bg-status-critical/[0.04]",
  },
};

// ─── Main ─────────────────────────────────────────────────────────────────────

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
      {/* Cabeçalho */}
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tight">
          Performance
        </h1>
        <p className="text-[10px] text-muted-foreground/60 font-semibold tracking-wider uppercase leading-none mt-1">
          Desempenho acumulado ao longo das sessões registradas.
        </p>
      </div>

      {/* Filtros de período */}
      <PerformancePeriodFilters activePeriod={activePeriod} />

      {/* Estado vazio */}
      {!metrics ? (
        <div className="glass-panel border border-white/[0.06] rounded-2xl p-12 text-center flex flex-col items-center gap-3">
          <BarChart2 className="size-8 text-muted-foreground/30" />
          <p className="text-sm font-bold text-white/70">Nenhuma sessão registrada no período.</p>
          <p className="text-xs text-muted-foreground/50 max-w-xs leading-relaxed">
            Jogue partidas em grupo para que os dados apareçam aqui.
          </p>
        </div>
      ) : (
        <>
          {/* ── Métricas principais ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile
              label="Rating médio"
              value={metrics.ratingMean.toFixed(2)}
              icon={BarChart2}
              accent="violet"
              context={`${sessions.length} ${sessions.length === 1 ? "sessão" : "sessões"} analisadas`}
            />
            <StatTile
              label="ADR médio"
              value={metrics.adrMean.toFixed(1)}
              icon={Target}
              accent="cyan"
              context="Dano por round"
            />
            <StatTile
              label="Headshots"
              value={`${metrics.hsMean.toFixed(1)}%`}
              icon={Crosshair}
              accent="violet"
              context="Taxa média"
            />
            <StatTile
              label="Winrate"
              value={`${metrics.winrateGlobal.toFixed(1)}%`}
              icon={Percent}
              accent="cyan"
              context={`${overview.totalSessions > 0 ? overview.avgMatchesPerSession : "—"} partidas/sessão`}
            />
          </div>

          {/* ── Gráfico de evolução ──────────────────────────────────────────── */}
          <div className="glass-panel border border-white/[0.07] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-black text-white uppercase tracking-wider">
                  Evolução de Rating por Sessão
                </p>
                <p className="text-[10px] text-muted-foreground/55 mt-0.5">
                  Média de rating do grupo em cada sessão registrada
                </p>
              </div>
              {metrics.ratingTrend !== "stable" && sessions.length >= 4 && (
                <div
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-xl border",
                    metrics.ratingTrend === "up"
                      ? "text-status-good border-status-good/25 bg-status-good/[0.06]"
                      : "text-status-critical border-status-critical/25 bg-status-critical/[0.06]",
                  )}
                >
                  {metrics.ratingTrend === "up" ? (
                    <TrendingUp className="size-3.5" />
                  ) : (
                    <TrendingDown className="size-3.5" />
                  )}
                  {metrics.ratingTrendDiff > 0 ? "+" : ""}
                  {metrics.ratingTrendDiff.toFixed(2)}
                </div>
              )}
            </div>
            <SessionPerformanceChart data={metrics.chartData} />
          </div>

          {/* ── Estatísticas secundárias ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* ELO saldo */}
            <div className="glass-panel border border-white/[0.07] rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Activity className="size-4 text-accent-violet/70" />
                <span className="text-[8px] uppercase tracking-widest font-black text-muted-foreground/50">
                  Saldo de ELO
                </span>
              </div>
              <p
                className={cn(
                  "text-2xl font-black tabular-nums",
                  metrics.eloBalance > 0
                    ? "text-status-good"
                    : metrics.eloBalance < 0
                      ? "text-status-critical"
                      : "text-white",
                )}
              >
                {metrics.eloBalance > 0 ? "+" : ""}
                {metrics.eloBalance}
              </p>
              <p className="text-[10px] text-muted-foreground/50 leading-snug">
                Saldo acumulado do grupo no período
              </p>
            </div>

            {/* Consistência */}
            <div className="glass-panel border border-white/[0.07] rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Shield className="size-4 text-accent-cyan/70" />
                <span className="text-[8px] uppercase tracking-widest font-black text-muted-foreground/50">
                  Consistência
                </span>
              </div>
              <p
                className={cn(
                  "text-2xl font-black",
                  metrics.consistencyLabel === "Alta"
                    ? "text-status-good"
                    : metrics.consistencyLabel === "Média"
                      ? "text-status-warning"
                      : "text-status-critical",
                )}
              >
                {metrics.consistencyLabel}
              </p>
              <p className="text-[10px] text-muted-foreground/50 leading-snug">
                Desvio padrão de rating: {metrics.stdDev.toFixed(3)}
              </p>
            </div>

            {/* Melhor sessão */}
            <div className="glass-panel border border-white/[0.07] rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Trophy className="size-4 text-accent-gold/70" />
                <span className="text-[8px] uppercase tracking-widest font-black text-muted-foreground/50">
                  Melhor sessão
                </span>
              </div>
              <p className="text-lg font-black text-white leading-tight truncate">
                {overview.bestSession?.ratingAvg.toFixed(2) ?? "—"}
              </p>
              <p className="text-[10px] text-muted-foreground/50 leading-snug truncate">
                {overview.bestSession?.name ?? "Nenhuma ainda"}
              </p>
            </div>

            {/* MVP mais frequente */}
            <div className="glass-panel border border-white/[0.07] rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Star className="size-4 text-accent-gold/70" />
                <span className="text-[8px] uppercase tracking-widest font-black text-muted-foreground/50">
                  MVP frequente
                </span>
              </div>
              <p className="text-lg font-black text-white leading-tight truncate">
                {metrics.topMvpName}
              </p>
              <p className="text-[10px] text-muted-foreground/50 leading-snug">
                {metrics.topMvpCount > 0
                  ? `MVP em ${metrics.topMvpCount} ${metrics.topMvpCount === 1 ? "sessão" : "sessões"}`
                  : "Sem dados suficientes"}
              </p>
            </div>
          </div>

          {/* ── Mapas mais frequentes ────────────────────────────────────────── */}
          {metrics.mapItems.length > 0 && (
            <div className="glass-panel border border-white/[0.07] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Map className="size-4 text-accent-violet/70" />
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-wider">
                    Mapas mais jogados
                  </p>
                  <p className="text-[10px] text-muted-foreground/55 mt-0.5">
                    Frequência de aparição por sessão — sem winrate por mapa (dado insuficiente nesta visão)
                  </p>
                </div>
              </div>
              <ItemProgressList
                items={metrics.mapItems}
                emptyMessage="Sem dados de mapa."
                barColor="var(--series-2)"
              />
            </div>
          )}

          {/* ── Distribuição de desempenho ───────────────────────────────────── */}
          <div className="glass-panel border border-white/[0.07] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="size-4 text-accent-cyan/70" />
              <div>
                <p className="text-xs font-black text-white uppercase tracking-wider">
                  Distribuição de desempenho
                </p>
                <p className="text-[10px] text-muted-foreground/55 mt-0.5">
                  Classificação das sessões por resultado
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(Object.keys(MOOD_CONFIG) as SimpleSessionSummary["mood"][]).map((mood) => {
                const count = metrics.moodCount[mood];
                const pct = sessions.length > 0 ? (count / sessions.length) * 100 : 0;
                const cfg = MOOD_CONFIG[mood];
                return (
                  <div
                    key={mood}
                    className={cn(
                      "rounded-xl border p-3 text-center flex flex-col gap-1",
                      cfg.border,
                    )}
                  >
                    <p className={cn("text-xl font-black tabular-nums", cfg.color)}>{count}</p>
                    <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/55">
                      {cfg.label}
                    </p>
                    <p className="text-[9px] text-muted-foreground/40 font-semibold">
                      {pct.toFixed(0)}%
                    </p>
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
