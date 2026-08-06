import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { FadeIn } from "@/components/motion/fade-in";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { SectionContainer } from "@/components/dashboard/section-container";
import { FORMA_STYLE } from "@/lib/forma";
import { prisma } from "@/server/db";
import { safeQuery } from "@/server/safeQuery";
import * as statsService from "@/server/services/stats.service";
import * as competitiveService from "@/server/services/competitive.service";
import { cn } from "@/lib/utils";
import { ChevronRight, Users, Trophy, Activity, Calendar } from "lucide-react";
import { SeasonSelect } from "@/components/dashboard/season-select";
import { listSeasons, resolveSeasonId } from "@/server/services/season.service";

const METRICS = [
  { value: "rating", label: "Rating" },
  { value: "adr", label: "ADR" },
  { value: "kd", label: "K/D" },
  { value: "impact", label: "Impacto" },
  { value: "kast", label: "KAST" },
  { value: "consistency", label: "Consistência" },
  { value: "evolution", label: "Evolução" },
  { value: "elo", label: "Hub ELO" },
  { value: "hs", label: "HS%" },
  { value: "entry", label: "Entry Kills" },
] as const;

type Metric = (typeof METRICS)[number]["value"];

const METRIC_INFOS: Record<Metric, { explanation: string; icon: string }> = {
  rating: { explanation: "Indicador geral de performance considerando impacto individual e resultado de rounds.", icon: "📈" },
  adr: { explanation: "Dano médio causado por round (Average Damage per Round).", icon: "💥" },
  kd: { explanation: "Relação acumulada entre eliminações e mortes (Kills/Deaths).", icon: "🎯" },
  impact: { explanation: "Métrica que mede a influência de multikills, opening kills e clutches ganhos.", icon: "⚡" },
  kast: { explanation: "Porcentagem de rounds com Kill, Assist, Survival ou Trade.", icon: "🤝" },
  consistency: { explanation: "Porcentagem de partidas em que o jogador obteve Rating ≥ 1.0 (mín. 3 partidas).", icon: "🛡️" },
  evolution: { explanation: "Desempenho das últimas 5 partidas em relação à média geral do jogador na temporada.", icon: "🚀" },
  elo: { explanation: "Pontuação interna do Hub ELO baseada em vitórias e derrotas.", icon: "👑" },
  hs: { explanation: "Porcentagem de abates que foram headshots (mín. 3 partidas).", icon: "💀" },
  entry: { explanation: "Média de primeiros abates (Entry Kills) obtidos por partida (mín. 3 partidas).", icon: "⚔️" },
};

function formatMetricValue(value: number, metric: Metric): string {
  if (metric === "consistency" || metric === "hs") return `${value}%`;
  if (metric === "evolution") return `${value > 0 ? "+" : ""}${value}%`;
  if (metric === "rating" || metric === "kd") return value.toFixed(2);
  return value.toString();
}

export const dynamic = "force-dynamic";

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ metric?: string; season?: string }>;
}) {
  const query = await searchParams;
  const { metric: rawMetric, season } = query;
  const metric = (METRICS.some((m) => m.value === rawMetric) ? rawMetric : "rating") as Metric;
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
      metric === "elo"
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

  const dataset = await competitiveService.loadCompetitiveDataset();
  const bundle = await competitiveService.getDashboardCompetitiveBundle(dataset);
  const monitoredByPlayerId = new Map(bundle.monitoredPlayers.map((p) => [p.player.id, p]));

  const top3 = ranking.slice(0, 3);
  const listPlayers = ranking.slice(3);

  const metricLabel = METRICS.find((m) => m.value === metric)?.label ?? "";

  return (
    <div className="flex flex-col gap-6">
      <FadeIn>
        <PageHeader
          title="🏆 Rankings"
          subtitle="Quem realmente está carregando o grupo nesta temporada"
          actions={
            <SeasonSelect seasons={seasonOptions} currentSeasonId={currentSeason} />
          }
        />
      </FadeIn>

      {/* Indicadores de Temporada */}
      <FadeIn delay={0.05}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-panel border-white/[0.06] p-4 rounded-xl flex items-center gap-3">
            <Users className="size-5 text-primary shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/50">Jogadores Ranqueados</p>
              <p className="text-lg font-black text-white mt-0.5">{totalPlayers} monitorados</p>
            </div>
          </div>
          <div className="glass-panel border-white/[0.06] p-4 rounded-xl flex items-center gap-3">
            <Trophy className="size-5 text-status-warning shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/50">Partidas Analisadas</p>
              <p className="text-lg font-black text-white mt-0.5">{totalMatches} partidas</p>
            </div>
          </div>
          <div className="glass-panel border-white/[0.06] p-4 rounded-xl flex items-center gap-3">
            <Calendar className="size-5 text-accent-violet shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/50">Visualização</p>
              <p className="text-lg font-black text-white mt-0.5">{seasonLabel}</p>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Seletor de Métricas */}
      <FadeIn delay={0.1}>
        <div className="flex flex-col gap-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none whitespace-nowrap flex-nowrap shrink-0 border-b border-white/[0.04]">
            {METRICS.map((m) => (
              <Link
                key={m.value}
                href={`/rankings?metric=${m.value}${season ? `&season=${season}` : ""}`}
                className={cn(
                  "rounded-xl px-4 py-2 text-xs font-bold transition-all border",
                  metric === m.value
                    ? "bg-primary text-black border-primary font-black shadow-[0_0_12px_0_rgba(var(--primary-rgb),0.15)]"
                    : "text-muted-foreground/75 border-white/[0.06] bg-white/[0.02] hover:text-white hover:border-white/[0.12] hover:bg-white/[0.04]",
                )}
              >
                {m.label}
              </Link>
            ))}
          </div>
          <div className="glass-panel rounded-2xl border border-white/[0.06] p-4 bg-white/[0.01] flex items-start gap-3">
            <span className="text-xl shrink-0 leading-none">{METRIC_INFOS[metric].icon}</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white uppercase tracking-wider">{metricLabel}</p>
              <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed">{METRIC_INFOS[metric].explanation}</p>
            </div>
          </div>
        </div>
      </FadeIn>

      <SectionContainer
        title={`Classificação por ${metricLabel}`}
        subtitle="Ranking calculado em tempo real com base na temporada"
        delay={0.15}
      >
        {ranking.length === 0 ? (
          <div className="glass-panel rounded-2xl border border-white/[0.06] p-12 text-center">
            <Trophy className="size-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground/50">Sem dados suficientes ainda.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">

            {/* ── Pódio ──────────────────────────────────────────────── */}
            {top3.length >= 3 && (() => {
              // Ordem visual: [2º esq] [1º centro] [3º dir]
              const PODIUM: Array<{
                pos: 1 | 2 | 3;
                entry: (typeof top3)[number];
                medal: string;
                platformClass: string;
                cardBorder: string;
                cardShadow: string;
                cardHoverShadow: string;
                glowStyle: string;
                orderClass: string;
              }> = [
                {
                  pos: 2,
                  entry: top3[1]!,
                  medal: "🥈",
                  platformClass: "h-1.5 bg-slate-400/12",
                  cardBorder: "border-slate-400/18",
                  cardShadow: "shadow-[0_0_12px_0_rgba(148,163,184,0.07)]",
                  cardHoverShadow: "hover:shadow-[0_0_18px_0_rgba(148,163,184,0.14)]",
                  glowStyle: "radial-gradient(ellipse at 50% 90%, rgba(148,163,184,0.12) 0%, transparent 65%)",
                  orderClass: "order-2 md:order-1",
                },
                {
                  pos: 1,
                  entry: top3[0]!,
                  medal: "🥇",
                  platformClass: "h-3 bg-status-warning/14",
                  cardBorder: "border-status-warning/28",
                  cardShadow: "shadow-[0_0_16px_0_rgba(245,158,11,0.10)]",
                  cardHoverShadow: "hover:shadow-[0_0_24px_0_rgba(245,158,11,0.20)]",
                  glowStyle: "radial-gradient(ellipse at 50% 90%, rgba(245,158,11,0.16) 0%, transparent 65%)",
                  orderClass: "order-1 md:order-2",
                },
                {
                  pos: 3,
                  entry: top3[2]!,
                  medal: "🥉",
                  platformClass: "h-1 bg-[#c97a48]/10",
                  cardBorder: "border-[#c97a48]/16",
                  cardShadow: "shadow-[0_0_10px_0_rgba(201,122,72,0.07)]",
                  cardHoverShadow: "hover:shadow-[0_0_16px_0_rgba(201,122,72,0.13)]",
                  glowStyle: "radial-gradient(ellipse at 50% 90%, rgba(201,122,72,0.12) 0%, transparent 65%)",
                  orderClass: "order-3",
                },
              ];

              return (
                <div className="flex flex-col md:flex-row md:items-end justify-center gap-1.5 md:gap-2">
                  {PODIUM.map(({ pos, entry, medal, platformClass, cardBorder, cardShadow, cardHoverShadow, glowStyle, orderClass }) => {
                    if (!entry?.player) return null;
                    const forma = monitoredByPlayerId.get(entry.player.id)?.forma;
                    const formaStyle = forma ? FORMA_STYLE[forma] : null;
                    const FormaIcon = formaStyle?.icon;

                    return (
                      <div key={pos} className={cn("flex flex-col md:w-[30%] lg:w-[28%]", orderClass)}>
                        <div className="relative group">
                          <div
                            className="pointer-events-none absolute inset-x-0 bottom-0 h-full rounded-xl -z-10 opacity-50 transition-opacity duration-200 group-hover:opacity-80"
                            style={{ background: glowStyle }}
                          />
                          <Link
                            href={`/players/${entry.player.id}`}
                            className={cn(
                              "flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-center transition-all duration-200",
                              "glass-panel border",
                              cardBorder,
                              cardShadow,
                              cardHoverShadow,
                              "hover:-translate-y-0.5",
                            )}
                          >
                            <span className="text-sm leading-none">{medal}</span>

                            <PlayerAvatar
                              nickname={entry.player.nickname}
                              avatarUrl={entry.player.avatarUrl}
                              size="sm"
                            />

                            <div className="flex flex-col items-center gap-0 w-full min-w-0">
                              <p className="text-[11px] font-black text-white truncate w-full leading-tight">
                                {entry.player.nickname}
                              </p>
                              {entry.player.levelGc !== null && (
                                <p className="text-[7px] text-muted-foreground/45 font-semibold">
                                  GC {entry.player.levelGc}
                                </p>
                              )}
                            </div>

                            {formaStyle && FormaIcon && (
                              <span className={cn(
                                "inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[7px] font-bold border",
                                formaStyle.bg, formaStyle.border, formaStyle.color,
                              )}>
                                <FormaIcon className="size-1.5" />
                                {formaStyle.text}
                              </span>
                            )}

                            <div>
                              <p className="text-[7px] uppercase tracking-[0.1em] font-bold text-muted-foreground/40">
                                {metricLabel}
                              </p>
                              <p className={cn(
                                "font-black tabular-nums leading-none",
                                pos === 1 ? "text-base text-white" : "text-sm text-white/85",
                              )}>
                                {formatMetricValue(entry.value, metric)}
                              </p>
                            </div>
                          </Link>
                        </div>

                        <div className={cn("w-full rounded-b", platformClass)} />
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* ── Lista (4º+) ─────────────────────────────────────────── */}
            <div className="glass-panel rounded-2xl border border-white/[0.06] overflow-hidden flex flex-col">
              {listPlayers.length === 0 && top3.length < 3 ? (
                ranking.map((entry, index) => {
                  if (!entry.player) return null;
                  const position = index + 1;
                  const forma = monitoredByPlayerId.get(entry.player.id)?.forma;
                  const formaStyle = forma ? FORMA_STYLE[forma] : null;
                  const FormaIcon = formaStyle?.icon;

                  return (
                    <Link
                      key={entry.player.id}
                      href={`/players/${entry.player.id}`}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors border-b border-white/[0.04] last:border-b-0 group"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-black tabular-nums bg-white/5 border border-white/10 text-muted-foreground/75">
                        {position}
                      </span>
                      <div className="shrink-0">
                        <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                        <span className="font-bold text-white text-sm group-hover:text-primary transition-colors truncate">
                          {entry.player.nickname}
                        </span>
                        {entry.player.levelGc !== null && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 bg-white/[0.04] border border-white/10 rounded text-muted-foreground/60 w-max mt-0.5 sm:mt-0">
                            LVL {entry.player.levelGc}
                          </span>
                        )}
                      </div>
                      {formaStyle && FormaIcon && (
                        <div className="shrink-0 hidden sm:block">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border",
                            formaStyle.bg, formaStyle.border, formaStyle.color,
                          )}>
                            <FormaIcon className="size-2.5" />
                            {formaStyle.text}
                          </span>
                        </div>
                      )}
                      <div className="shrink-0 text-right min-w-[70px]">
                        <p className="text-[7px] uppercase tracking-widest font-bold text-muted-foreground/50">{metricLabel}</p>
                        <p className="text-sm font-black text-white tabular-nums mt-0.5">
                          {formatMetricValue(entry.value, metric)}
                        </p>
                      </div>
                      <div className="shrink-0 pl-1">
                        <ChevronRight className="size-3.5 text-muted-foreground/30 group-hover:text-white transition-colors" />
                      </div>
                    </Link>
                  );
                })
              ) : (
                listPlayers.map((entry, index) => {
                  if (!entry.player) return null;
                  const position = index + 4;
                  const forma = monitoredByPlayerId.get(entry.player.id)?.forma;
                  const formaStyle = forma ? FORMA_STYLE[forma] : null;
                  const FormaIcon = formaStyle?.icon;

                  return (
                    <Link
                      key={entry.player.id}
                      href={`/players/${entry.player.id}`}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors border-b border-white/[0.04] last:border-b-0 group"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-black tabular-nums bg-white/5 border border-white/10 text-muted-foreground/75">
                        {position}
                      </span>
                      <div className="shrink-0">
                        <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                        <span className="font-bold text-white text-sm group-hover:text-primary transition-colors truncate">
                          {entry.player.nickname}
                        </span>
                        {entry.player.levelGc !== null && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 bg-white/[0.04] border border-white/10 rounded text-muted-foreground/60 w-max mt-0.5 sm:mt-0">
                            LVL {entry.player.levelGc}
                          </span>
                        )}
                      </div>
                      {formaStyle && FormaIcon && (
                        <div className="shrink-0 hidden sm:block">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border",
                            formaStyle.bg, formaStyle.border, formaStyle.color,
                          )}>
                            <FormaIcon className="size-2.5" />
                            {formaStyle.text}
                          </span>
                        </div>
                      )}
                      <div className="shrink-0 text-right min-w-[70px]">
                        <p className="text-[7px] uppercase tracking-widest font-bold text-muted-foreground/50">{metricLabel}</p>
                        <p className="text-sm font-black text-white tabular-nums mt-0.5">
                          {formatMetricValue(entry.value, metric)}
                        </p>
                      </div>
                      <div className="shrink-0 pl-1">
                        <ChevronRight className="size-3.5 text-muted-foreground/30 group-hover:text-white transition-colors" />
                      </div>
                    </Link>
                  );
                })
              )}
            </div>

          </div>
        )}
      </SectionContainer>
    </div>
  );
}
