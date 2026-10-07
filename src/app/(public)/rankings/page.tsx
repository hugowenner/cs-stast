import * as React from "react";
import Link from "next/link";
import { FadeIn } from "@/components/motion/fade-in";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { SectionContainer } from "@/components/dashboard/section-container";
import { SeasonSelect } from "@/components/dashboard/season-select";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { SampleIndicator } from "@/components/ui/sample-indicator";
import { DeltaIndicator } from "@/components/ui/delta-indicator";
import { FORMA_STYLE } from "@/lib/forma";
import { prisma } from "@/server/db";
import { safeQuery } from "@/server/safeQuery";
import * as statsService from "@/server/services/stats.service";
import * as competitiveService from "@/server/services/competitive.service";
import { listSeasons, resolveSeasonId } from "@/server/services/season.service";
import { cn } from "@/lib/utils";
import {
  Trophy,
  Users,
  Calendar,
  ChevronRight,
  TrendingUp,
  Zap,
  Crosshair,
  Target,
  ShieldCheck,
  Activity,
  Flame,
  Crown,
  ShieldAlert,
  Info,
} from "lucide-react";

export const dynamic = "force-dynamic";

const METRICS = [
  { value: "seasonScore", label: "Score Oficial 3.5", icon: Trophy, accent: "gold" },
  { value: "rating",      label: "Rating 2.0",        icon: TrendingUp, accent: "orange" },
  { value: "adr",         label: "ADR",               icon: Zap, accent: "cyan" },
  { value: "kd",          label: "K/D",               icon: Crosshair, accent: "green" },
  { value: "impact",      label: "Impacto",           icon: Flame, accent: "orange" },
  { value: "kast",        label: "KAST%",             icon: Target, accent: "cyan" },
  { value: "consistency", label: "Consistência",      icon: ShieldCheck, accent: "green" },
  { value: "evolution",   label: "Evolução",          icon: Activity, accent: "orange" },
  { value: "elo",         label: "Hub ELO",           icon: Crown, accent: "gold" },
  { value: "hs",          label: "HS%",               icon: Crosshair, accent: "cyan" },
  { value: "entry",       label: "Entry Kills",       icon: Flame, accent: "orange" },
] as const;

type Metric = (typeof METRICS)[number]["value"];

const METRIC_INFOS: Record<
  Metric,
  {
    explanation: string;
    badgeLabel: string;
    badgeVariant: "good" | "warning" | "critical" | "gold" | "info" | "neutral" | "primary";
  }
> = {
  seasonScore: {
    explanation:
      "Classificação auditada oficial do CS2 Stats. Combina performance individual (Rating ponderado), taxa de vitória com amortização Bayesiana e filtro de amostragem mínima de 10 partidas.",
    badgeLabel: "SCORE OFICIAL",
    badgeVariant: "gold",
  },
  rating: {
    explanation:
      "Indicador de performance geral HLTV 2.0 adaptado para o Hub, considerando impacto individual, sobrevivência e eficiência em rounds.",
    badgeLabel: "RATING 2.0",
    badgeVariant: "primary",
  },
  adr: {
    explanation:
      "Dano médio causado por round (Average Damage per Round). Mede a capacidade direta de desgastar as forças inimigas.",
    badgeLabel: "DANO / ROUND",
    badgeVariant: "info",
  },
  kd: {
    explanation:
      "Relação acumulada entre eliminações conseguidas e mortes sofridas (Kills / Deaths) durante o período da temporada.",
    badgeLabel: "KILL / DEATH",
    badgeVariant: "good",
  },
  impact: {
    explanation:
      "Métrica de influência em rounds decisivos, medindo peso de multikills, opening kills e vitórias em situações de clutch.",
    badgeLabel: "IMPACTO",
    badgeVariant: "primary",
  },
  kast: {
    explanation:
      "Porcentagem de rounds em que o jogador contribuiu ativamente com Kill, Assistência, Sobrevivência ou Trade.",
    badgeLabel: "KAST",
    badgeVariant: "info",
  },
  consistency: {
    explanation:
      "Percentual de partidas em que o jogador atingiu Rating ≥ 1.00 (mínimo de 3 partidas disputadas).",
    badgeLabel: "REGULARIDADE",
    badgeVariant: "good",
  },
  evolution: {
    explanation:
      "Comparativo percentual de desempenho nas últimas 5 partidas em relação à média histórica do jogador na temporada.",
    badgeLabel: "DELTA FORMA",
    badgeVariant: "primary",
  },
  elo: {
    explanation:
      "Pontuação competitiva do Hub baseada nos confrontos, vitórias e derrotas contra os pares do grupo.",
    badgeLabel: "ELO OFICIAL",
    badgeVariant: "gold",
  },
  hs: {
    explanation:
      "Percentual de eliminações concluídas com tiro na cabeça (Headshot Accuracy, mín. 3 partidas).",
    badgeLabel: "PRECISÃO HS",
    badgeVariant: "info",
  },
  entry: {
    explanation:
      "Média de primeiros abates (Entry Kills) obtidos por partida disputada no período (mín. 3 partidas).",
    badgeLabel: "ABERTURAS",
    badgeVariant: "primary",
  },
};

function formatMetricValue(value: number, metric: Metric): string {
  if (metric === "consistency" || metric === "hs" || metric === "kast") return `${value.toFixed(0)}%`;
  if (metric === "evolution") return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
  if (metric === "seasonScore") return value.toFixed(3);
  if (metric === "rating" || metric === "kd") return value.toFixed(2);
  if (metric === "adr") return value.toFixed(0);
  return value.toString();
}

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ metric?: string; season?: string }>;
}) {
  const query = await searchParams;
  const { metric: rawMetric, season } = query;
  const metric = (METRICS.some((m) => m.value === rawMetric) ? rawMetric : "seasonScore") as Metric;
  const resolvedSeasonId = await resolveSeasonId(season);

  // Carregar todas as temporadas para o seletor
  const allSeasons = await safeQuery(() => listSeasons(), []);
  const seasonOptions = [
    { id: "all", name: "Carreira (Histórico)", status: "CLOSED" as const },
    ...allSeasons.map((s) => ({ id: s.id, name: s.name, status: s.status })),
  ];
  const currentSeason = season || "all";

  let seasonLabel = "Carreira (Histórico)";
  if (resolvedSeasonId) {
    const seasonRecord = await prisma.season.findUnique({
      where: { id: resolvedSeasonId },
    });
    if (seasonRecord) {
      seasonLabel = seasonRecord.name;
    }
  }

  const ranking = await safeQuery(
    () =>
      metric === "seasonScore"
        ? statsService.getSeasonScoreRanking(resolvedSeasonId, 50)
        : metric === "elo"
          ? statsService.getEloRanking(50)
          : metric === "kd"
            ? statsService.getKdRanking(resolvedSeasonId, 50)
            : metric === "consistency"
              ? statsService.getConsistencyRanking(resolvedSeasonId, 50)
              : metric === "evolution"
                ? statsService.getEvolutionRanking(resolvedSeasonId, 50)
                : metric === "hs"
                  ? statsService.getHsRanking(resolvedSeasonId, 50)
                  : metric === "entry"
                    ? statsService.getEntryKillsRanking(resolvedSeasonId, 50)
                    : statsService.getRanking(metric, resolvedSeasonId, 50),
    [],
  );

  const totalPlayers = await prisma.player.count({
    where: { trackedPlayer: { active: true } },
  });
  const totalMatches = await prisma.match.count({
    where: resolvedSeasonId ? { seasonId: resolvedSeasonId } : undefined,
  });

  const dataset = await competitiveService.loadCompetitiveDataset(resolvedSeasonId);
  const bundle = await competitiveService.getDashboardCompetitiveBundle(dataset);
  const monitoredByPlayerId = new Map(bundle.monitoredPlayers.map((p) => [p.player.id, p]));

  const top3 = ranking.slice(0, 3);
  const listPlayers = ranking.slice(3);

  const activeMetricConfig = METRICS.find((m) => m.value === metric) ?? METRICS[0];
  const activeMetricInfo = METRIC_INFOS[metric];

  return (
    <div className="flex flex-col gap-10 lg:gap-12 pb-16">
      
      {/* ═══ 01. HEADER & CENTRAL TELEMETRY ═══ */}
      <FadeIn>
        <div className="flex flex-col bg-surface-panel border border-border/70 rounded-sm overflow-hidden shadow-lg">
          <div className="h-[2px] w-full bg-gradient-to-r from-gold via-primary to-transparent" />
          
          <div className="p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 border-b border-border/40 bg-surface-deck/40">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex size-10 items-center justify-center bg-gold/10 border border-gold/30 rounded-xs text-gold shrink-0">
                <Trophy className="size-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
                    CENTRAL DE RANKING
                  </span>
                  <TacticalBadge label="OFICIAL" variant="gold" size="xs" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-foreground uppercase tracking-tight truncate mt-0.5">
                  Classificação da Temporada
                </h1>
              </div>
            </div>

            <div className="shrink-0">
              <SeasonSelect seasons={seasonOptions} currentSeasonId={currentSeason} />
            </div>
          </div>

          {/* Quick Stats Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/30 bg-surface-deck/20">
            <div className="p-4 flex items-center gap-3">
              <Users className="size-4 text-primary shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60 font-bold">
                  JOGADORES ATIVOS
                </span>
                <span className="font-mono text-sm font-bold text-foreground">
                  {totalPlayers} monitorados
                </span>
              </div>
            </div>

            <div className="p-4 flex items-center gap-3">
              <Trophy className="size-4 text-gold shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60 font-bold">
                  PARTIDAS ANALISADAS
                </span>
                <span className="font-mono text-sm font-bold text-foreground">
                  {totalMatches} confrontos
                </span>
              </div>
            </div>

            <div className="p-4 flex items-center gap-3">
              <Calendar className="size-4 text-cyan-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60 font-bold">
                  PERÍODO ATIVO
                </span>
                <span className="font-mono text-sm font-bold text-foreground truncate">
                  {seasonLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* ═══ 02. SELETOR TÁTICO DE MÉTRICAS & EXPLANATION ═══ */}
      <FadeIn delay={0.06}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
              SELECIONE A MÉTRICA DE ORDENAÇÃO
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/50">
              11 métricas disponíveis
            </span>
          </div>

          {/* Metric Chips Bar */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-border/30">
            {METRICS.map((m) => {
              const isActive = metric === m.value;
              const IconComponent = m.icon;
              return (
                <Link
                  key={m.value}
                  href={`/rankings?metric=${m.value}${season ? `&season=${season}` : ""}`}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-xs text-xs font-mono font-bold uppercase tracking-wider transition-micro border whitespace-nowrap",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-surface-panel text-muted-foreground/80 border-border/60 hover:border-border hover:text-foreground hover:bg-surface-deck"
                  )}
                >
                  <IconComponent className={cn("size-3.5", isActive ? "text-primary-foreground" : "text-muted-foreground/60")} />
                  <span>{m.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Explanatory Technical Box */}
          <div className="flex items-start gap-3 p-4 bg-surface-deck/60 border border-border/50 rounded-xs">
            <Info className="size-4 text-primary shrink-0 mt-0.5" />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase text-foreground">
                  {activeMetricConfig.label}
                </span>
                <TacticalBadge
                  label={activeMetricInfo.badgeLabel}
                  variant={activeMetricInfo.badgeVariant}
                  size="xs"
                />
              </div>
              <p className="text-xs text-muted-foreground/75 font-sans mt-1 leading-relaxed">
                {activeMetricInfo.explanation}
              </p>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* ═══ 03. CLASSIFICAÇÃO GERAL & PÓDIO ═══ */}
      <SectionContainer
        index={1}
        tag="CLASSIFICAÇÃO OFICIAL"
        title={`Ranking por ${activeMetricConfig.label}`}
        subtitle={`Classificação calculada para a temporada selecionada ordenando por ${activeMetricConfig.label}.`}
        delay={0.1}
      >
        {ranking.length === 0 ? (
          <div className="bg-surface-panel border border-border/60 rounded-sm p-12 text-center flex flex-col items-center gap-3">
            <Trophy className="size-8 text-muted-foreground/30" />
            <p className="text-xs font-mono text-muted-foreground/60 uppercase tracking-wider">
              Nenhum dado registrado para esta métrica na temporada selecionada.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">

            {/* ─── PÓDIO DE IMPACTO (TOP 3) ─── */}
            {(() => {
              const first = top3[0];
              const second = top3[1];
              const third = top3[2];
              if (!first?.player || !second?.player || !third?.player) return null;

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-end">
                  
                  {/* #2 — PRATA */}
                  <div className="flex flex-col p-4 bg-surface-panel border border-border/70 rounded-xs hover:border-border/90 transition-micro order-2 md:order-1">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="font-mono text-xs font-bold text-muted-foreground/80">#2 COLOCADO</span>
                      <TacticalBadge label="TOP 2" variant="neutral" size="xs" />
                    </div>

                    <div className="flex items-center gap-3 py-2 border-y border-border/30 my-2">
                      <PlayerAvatar
                        nickname={second.player.nickname}
                        avatarUrl={second.player.avatarUrl}
                        size="md"
                      />
                      <div className="min-w-0 flex flex-col">
                        <Link
                          href={`/players/${second.player.id}`}
                          className="text-sm font-bold text-foreground hover:text-primary transition-micro truncate"
                        >
                          {second.player.nickname}
                        </Link>
                        {second.player.levelGc !== null && (
                          <span className="text-[10px] font-mono text-muted-foreground/60">
                            GC Nível {second.player.levelGc}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60">
                        {activeMetricConfig.label}
                      </span>
                      <span className="font-mono text-lg font-bold text-foreground tabular-nums">
                        {formatMetricValue(second.value, metric)}
                      </span>
                    </div>
                  </div>

                  {/* #1 — OURO DOMINANTE (CENTRO) */}
                  <div className="relative flex flex-col p-5 bg-gradient-to-b from-gold/[0.06] to-surface-panel border-2 border-gold/40 rounded-xs shadow-md order-1 md:order-2">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-gold via-yellow-200 to-gold" />
                    
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Crown className="size-4 text-gold shrink-0" />
                        <span className="font-mono text-xs font-black text-gold tracking-wider">#1 LÍDER OFICIAL</span>
                      </div>
                      <TacticalBadge label="LÍDER" variant="gold" size="xs" />
                    </div>

                    <div className="flex items-center gap-4 py-3 border-y border-gold/20 my-2">
                      <PlayerAvatar
                        nickname={first.player.nickname}
                        avatarUrl={first.player.avatarUrl}
                        size="lg"
                      />
                      <div className="min-w-0 flex flex-col">
                        <Link
                          href={`/players/${first.player.id}`}
                          className="text-base sm:text-lg font-black text-foreground hover:text-primary transition-micro truncate"
                        >
                          {first.player.nickname}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          {first.player.levelGc !== null && (
                            <span className="text-[10px] font-mono text-muted-foreground/60">
                              GC Lvl {first.player.levelGc}
                            </span>
                          )}
                          {monitoredByPlayerId.get(first.player.id)?.forma && (
                            <span className="text-[9px] font-mono font-bold text-status-good uppercase">
                              · {monitoredByPlayerId.get(first.player.id)?.forma}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-gold font-bold">
                        {activeMetricConfig.label}
                      </span>
                      <span className="font-mono text-2xl font-black text-gold tabular-nums drop-shadow-[0_0_10px_rgba(230,175,46,0.3)]">
                        {formatMetricValue(first.value, metric)}
                      </span>
                    </div>
                  </div>

                  {/* #3 — BRONZE */}
                  <div className="flex flex-col p-4 bg-surface-panel border border-border/70 rounded-xs hover:border-border/90 transition-micro order-3">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="font-mono text-xs font-bold text-muted-foreground/80">#3 COLOCADO</span>
                      <TacticalBadge label="TOP 3" variant="neutral" size="xs" />
                    </div>

                    <div className="flex items-center gap-3 py-2 border-y border-border/30 my-2">
                      <PlayerAvatar
                        nickname={third.player.nickname}
                        avatarUrl={third.player.avatarUrl}
                        size="md"
                      />
                      <div className="min-w-0 flex flex-col">
                        <Link
                          href={`/players/${third.player.id}`}
                          className="text-sm font-bold text-foreground hover:text-primary transition-micro truncate"
                        >
                          {third.player.nickname}
                        </Link>
                        {third.player.levelGc !== null && (
                          <span className="text-[10px] font-mono text-muted-foreground/60">
                            GC Nível {third.player.levelGc}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60">
                        {activeMetricConfig.label}
                      </span>
                      <span className="font-mono text-lg font-bold text-foreground tabular-nums">
                        {formatMetricValue(third.value, metric)}
                      </span>
                    </div>
                  </div>

                </div>
              );
            })()}

            {/* ─── TABELA DE CLASSIFICAÇÃO GERAL (4º EM DIANTE OU TODAS) ─── */}
            <div className="bg-surface-panel border border-border/70 rounded-sm overflow-hidden flex flex-col">
              
              {/* Table Header */}
              <div className="px-4 py-3 border-b border-border/40 bg-surface-deck/40 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/70">
                <div className="flex items-center gap-3">
                  <span className="w-8 text-center">POS</span>
                  <span>JOGADOR</span>
                </div>
                <div className="flex items-center gap-8 text-right">
                  <span className="hidden sm:inline-block">FORMA</span>
                  <span className="w-24 text-right">{activeMetricConfig.label}</span>
                </div>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-border/30">
                {(top3.length >= 3 ? listPlayers : ranking).map((entry, idx) => {
                  if (!entry.player) return null;
                  const rank = top3.length >= 3 ? idx + 4 : idx + 1;
                  const isTop1 = rank === 1;
                  const isTop3 = rank <= 3;
                  const monitored = monitoredByPlayerId.get(entry.player.id);
                  const forma = monitored?.forma;
                  const formaStyle = forma ? FORMA_STYLE[forma] : null;

                  return (
                    <Link
                      key={entry.player.id}
                      href={`/players/${entry.player.id}`}
                      className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-surface-elevated/30 transition-micro group"
                    >
                      {/* Left: Position & Avatar & Nickname */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className={cn(
                            "font-mono text-xs font-black w-8 text-center shrink-0 tabular-nums",
                            isTop1
                              ? "text-gold"
                              : isTop3
                                ? "text-foreground font-bold"
                                : "text-muted-foreground/50 font-semibold"
                          )}
                        >
                          #{rank}
                        </span>

                        <PlayerAvatar
                          nickname={entry.player.nickname}
                          avatarUrl={entry.player.avatarUrl}
                          size="sm"
                        />

                        <div className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                          <span className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-micro truncate">
                            {entry.player.nickname}
                          </span>
                          {entry.player.levelGc !== null && (
                            <span className="text-[9px] font-mono text-muted-foreground/50">
                              LVL {entry.player.levelGc}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Forma & Metric Value */}
                      <div className="flex items-center gap-6 sm:gap-8 text-right shrink-0">
                        {forma && (
                          <div className="hidden sm:block">
                            <span
                              className={cn(
                                "text-[10px] font-mono font-bold uppercase",
                                forma === "Excelente" || forma === "Em alta"
                                  ? "text-status-good"
                                  : forma === "Oscilando"
                                    ? "text-status-warning"
                                    : "text-muted-foreground/60"
                              )}
                            >
                              {forma}
                            </span>
                          </div>
                        )}

                        <div className="w-24 text-right">
                          <span className="font-mono text-sm sm:text-base font-black text-foreground group-hover:text-primary transition-micro tabular-nums">
                            {formatMetricValue(entry.value, metric)}
                          </span>
                        </div>

                        <ChevronRight className="size-3.5 text-muted-foreground/30 group-hover:text-foreground transition-micro" />
                      </div>
                    </Link>
                  );
                })}
              </div>

            </div>

          </div>
        )}
      </SectionContainer>
    </div>
  );
}
