import { FadeIn } from "@/components/motion/fade-in";
import { MatchRow } from "@/components/matches/match-row";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AchievementFeedItem } from "@/components/achievements/achievement-feed-item";
import { MapWinrateChart } from "@/components/charts/map-winrate-chart";
import { SeasonHero } from "@/components/dashboard/season-hero";
import { CoachReportCard } from "@/components/ui/coach-report-card";
import { safeQuery } from "@/server/safeQuery";
import * as dashboardService from "@/server/services/dashboard.service";
import * as matchService from "@/server/services/match.service";
import * as statsService from "@/server/services/stats.service";
import * as competitiveService from "@/server/services/competitive.service";
import * as achievementService from "@/server/services/achievement.service";
import * as rivalryService from "@/server/services/rivalry.service";
import Link from "next/link";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  ShieldAlert,
  ArrowRight,
  Swords,
  Zap,
  Map,
  AlertTriangle,
  Crown,
} from "lucide-react";

export const dynamic = "force-dynamic";

const SEASON_LABEL = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
  new Date(),
);

const EMPTY_COMPETITIVE_BUNDLE: competitiveService.DashboardCompetitiveBundle = {
  powerRanking: [],
  momentum: [],
  decisive: [],
  archetypes: [],
  matchups: [],
  jogadorDaSemana: null,
  duos: [],
  dominantTrio: null,
  mapSpecialists: [],
  weeklyHighlights: [],
  records: [],
};

export default async function DashboardPage() {
  const [summary, recentMatches, competitive, mapWinrates, recentAchievements, topRivalries] =
    await Promise.all([
      safeQuery(() => dashboardService.getDashboardSummary(), {
        totalMatches: 0,
        totalPlayers: 0,
        totalSessions: 0,
        latestSession: null,
        community: { avgWinrate: 0, avgKills: 0, avgHsPercent: 0, totalRounds: 0 },
        dominantMap: null,
        bestPlayer: null,
      }),
      safeQuery(() => matchService.listRecentMatches(5), []),
      safeQuery(() => competitiveService.getDashboardCompetitiveBundle(), EMPTY_COMPETITIVE_BUNDLE),
      safeQuery(() => statsService.getMapWinrates(), []),
      safeQuery(() => achievementService.listRecent(4), []),
      safeQuery(() => rivalryService.listTopRivalriesWithH2H(8), []),
    ]);

  const { powerRanking, momentum, decisive, archetypes, matchups, jogadorDaSemana, duos, dominantTrio, mapSpecialists, records } = competitive;

  const sortedMaps = [...mapWinrates].sort((a, b) => b.winrate - a.winrate);
  const bestMap = sortedMaps.find((m) => m.matchesPlayed >= 2) ?? null;
  const worstMap = [...mapWinrates].filter((m) => m.matchesPlayed >= 2).sort((a, b) => a.winrate - b.winrate)[0] ?? null;

  // Insight: jogador mais quente (maior delta positivo)
  const hottestPlayer = momentum.find((m) => m.status === "up") ?? null;

  // Insight: rivalidade mais acirrada (menor diferença de vitórias)
  const closestRivalry = topRivalries.reduce<typeof topRivalries[0] | null>((acc, r) => {
    if (r.matchesAgainst < 3) return acc;
    const gap = Math.abs(r.winsA - r.winsB);
    if (!acc) return r;
    const accGap = Math.abs(acc.winsA - acc.winsB);
    return gap < accGap ? r : acc;
  }, null);

  return (
    <div className="flex flex-col gap-8 lg:gap-12">

      {/* ── Identidade da Temporada ── */}
      <section className="flex flex-col gap-3">
        <FadeIn>
          <SeasonHero
            seasonLabel={SEASON_LABEL}
            totalMatches={summary.totalMatches}
            bestPlayer={summary.bestPlayer}
            communityWinrate={summary.community.avgWinrate}
            dominantMap={summary.dominantMap}
          />
        </FadeIn>

        <FadeIn delay={0.04}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { label: "Winrate Geral", value: `${summary.community.avgWinrate}%`, accent: true },
              { label: "Média de Kills", value: `${summary.community.avgKills}`, accent: false },
              { label: "HS Médio", value: `${summary.community.avgHsPercent}%`, accent: false },
              { label: "Rounds", value: summary.community.totalRounds.toLocaleString("pt-BR"), accent: false },
            ].map((stat) => (
              <div key={stat.label} className="glass-panel rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-3">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-bold">{stat.label}</p>
                <p className={`text-xl font-black mt-1 ${stat.accent ? "text-accent-cyan" : "text-white"}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ── Status Insights ── */}
      {(powerRanking.length > 0 || hottestPlayer || bestMap || worstMap) && (
        <FadeIn delay={0.06}>
          <section>
            <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/50 mb-3">O que está acontecendo</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">

              {powerRanking[0] && (
                <div className="glass-panel rounded-xl border border-status-warning/20 bg-status-warning/[0.03] px-4 py-3.5 flex items-start gap-3">
                  <Crown className="size-4 text-status-warning shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-status-warning/80">Líder da temporada</p>
                    <p className="text-sm font-black text-white mt-1 truncate">{powerRanking[0].player.nickname}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      Rating {powerRanking[0].rating.toFixed(2)} · Score {powerRanking[0].powerScore}
                    </p>
                  </div>
                </div>
              )}

              {hottestPlayer && (
                <div className="glass-panel rounded-xl border border-status-good/20 bg-status-good/[0.03] px-4 py-3.5 flex items-start gap-3">
                  <Zap className="size-4 text-status-good shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-status-good/80">Em ascensão</p>
                    <p className="text-sm font-black text-white mt-1 truncate">{hottestPlayer.player.nickname}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">{hottestPlayer.ratingChangeText} rating recente</p>
                  </div>
                </div>
              )}

              {bestMap && (
                <div className="glass-panel rounded-xl border border-accent-cyan/20 bg-accent-cyan/[0.03] px-4 py-3.5 flex items-start gap-3">
                  <Map className="size-4 text-accent-cyan shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-accent-cyan/80">Mapa forte</p>
                    <p className="text-sm font-black text-white mt-1">{bestMap.map}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">{bestMap.winrate.toFixed(0)}% de winrate · {bestMap.matchesPlayed} partidas</p>
                  </div>
                </div>
              )}

              {worstMap && (
                <div className="glass-panel rounded-xl border border-status-critical/20 bg-status-critical/[0.03] px-4 py-3.5 flex items-start gap-3">
                  <AlertTriangle className="size-4 text-status-critical shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-status-critical/80">Ponto crítico</p>
                    <p className="text-sm font-black text-white mt-1">{worstMap.map}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">{worstMap.winrate.toFixed(0)}% de winrate · evitar no veto</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </FadeIn>
      )}

      {/* ── Confrontos Diretos — um card compacto ── */}
      <FadeIn delay={0.08}>
        <section>
          <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/50 mb-3">Head-to-head</p>
          <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">Confrontos Diretos</p>
                {closestRivalry && (
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    Rivalidade mais acirrada: {closestRivalry.playerA.nickname} vs {closestRivalry.playerB.nickname}
                  </p>
                )}
              </div>
              <Swords className="size-4 text-accent-violet/60 shrink-0" />
            </div>

            {topRivalries.length === 0 ? (
              <p className="text-muted-foreground/50 py-10 text-center text-sm">Sem confrontos suficientes ainda.</p>
            ) : (
              <>
                {/* Header da tabela — visível só em sm+ */}
                <div className="hidden sm:grid grid-cols-[1fr_auto_1fr_auto] gap-x-4 px-5 py-2 border-b border-white/[0.03] bg-white/[0.01]">
                  <span className="text-[8px] uppercase tracking-widest text-muted-foreground/40 font-bold">Jogador A</span>
                  <span className="text-[8px] uppercase tracking-widest text-muted-foreground/40 font-bold text-center w-20">Placar</span>
                  <span className="text-[8px] uppercase tracking-widest text-muted-foreground/40 font-bold text-right">Jogador B</span>
                  <span className="text-[8px] uppercase tracking-widest text-muted-foreground/40 font-bold text-right">Último</span>
                </div>

                <div className="divide-y divide-white/[0.035]">
                  {topRivalries.map((r) => {
                    const aLeads = r.winsA > r.winsB;
                    const bLeads = r.winsB > r.winsA;
                    return (
                      <div key={r.id} className="px-5 py-3 flex items-center gap-3">
                        {/* Jogador A */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <PlayerAvatar nickname={r.playerA.nickname} avatarUrl={r.playerA.avatarUrl} size="sm" />
                          <span className={`text-xs font-bold truncate ${aLeads ? "text-white" : "text-muted-foreground/60"}`}>
                            {r.playerA.nickname}
                          </span>
                        </div>

                        {/* Placar */}
                        <div className="flex items-center gap-1.5 shrink-0 w-20 justify-center">
                          <span className={`text-base font-black tabular-nums leading-none ${aLeads ? "text-white" : "text-muted-foreground/40"}`}>
                            {r.winsA}
                          </span>
                          <span className="text-xs text-muted-foreground/30">×</span>
                          <span className={`text-base font-black tabular-nums leading-none ${bLeads ? "text-white" : "text-muted-foreground/40"}`}>
                            {r.winsB}
                          </span>
                        </div>

                        {/* Jogador B */}
                        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                          <span className={`text-xs font-bold truncate text-right ${bLeads ? "text-white" : "text-muted-foreground/60"}`}>
                            {r.playerB.nickname}
                          </span>
                          <PlayerAvatar nickname={r.playerB.nickname} avatarUrl={r.playerB.avatarUrl} size="sm" />
                        </div>

                        {/* Último confronto */}
                        {r.lastMatch ? (
                          <div className="hidden sm:flex items-center gap-1.5 text-[9px] text-muted-foreground/50 shrink-0 w-28 justify-end">
                            <span className="capitalize truncate">{r.lastMatch.mapName}</span>
                            <span className="font-bold text-muted-foreground/70 tabular-nums">{r.lastMatch.scoreA}–{r.lastMatch.scoreB}</span>
                          </div>
                        ) : (
                          <div className="hidden sm:block w-28" />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="px-5 py-3 border-t border-white/[0.04] bg-white/[0.01]">
                  <Link href="/compare" className="text-xs text-primary/70 hover:text-primary transition-colors font-semibold inline-flex items-center gap-1.5 group">
                    Scout H2H completo
                    <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>
      </FadeIn>

      {/* ── Power Ranking + Jogador da Semana ── */}
      <FadeIn delay={0.1}>
        <section>
          <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/50 mb-3">Performance</p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

            <div className="lg:col-span-2 glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Power Ranking</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">Quem domina a temporada</p>
                </div>
                <Trophy className="size-4 text-status-warning/70" />
              </div>
              <div className="divide-y divide-white/[0.04]">
                {powerRanking.map((entry, index) => {
                  const isTop3 = index < 3;
                  const podiumColors = ["text-yellow-400", "text-slate-400", "text-amber-600"];
                  return (
                    <div key={entry.player.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/[0.012] transition-colors">
                      <span className={`text-xs font-black w-5 shrink-0 text-center tabular-nums ${isTop3 ? podiumColors[index] : "text-muted-foreground/30"}`}>
                        {index + 1}
                      </span>
                      <Link href={`/players/${entry.player.id}`} className="flex items-center gap-2.5 min-w-0 flex-1 group">
                        <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">{entry.player.nickname}</p>
                          <p className="text-[10px] text-muted-foreground/50">{entry.levelLabel}</p>
                        </div>
                      </Link>
                      <div className="hidden sm:grid grid-cols-4 gap-5 text-center shrink-0">
                        {[
                          { label: "Rating", value: entry.rating.toFixed(2) },
                          { label: "KAST", value: `${entry.kast}%` },
                          { label: "WR", value: `${entry.winrate}%` },
                          { label: "Score", value: entry.powerScore, highlight: true },
                        ].map((col) => (
                          <div key={col.label}>
                            <p className="text-[8px] uppercase tracking-widest text-muted-foreground/40 font-bold">{col.label}</p>
                            <p className={`text-xs font-black mt-0.5 ${col.highlight ? "text-accent-violet" : "text-white"}`}>{col.value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="sm:hidden text-right shrink-0">
                        <p className="text-sm font-black text-accent-violet">{entry.powerScore}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {jogadorDaSemana && (
                <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
                  <div className="px-5 pt-5 pb-4">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/60 mb-3">Jogador da Semana</p>
                    <div className="flex items-center gap-3">
                      <PlayerAvatar nickname={jogadorDaSemana.player.nickname} avatarUrl={jogadorDaSemana.player.avatarUrl} size="lg" />
                      <div className="min-w-0 flex-1">
                        <Link href={`/players/${jogadorDaSemana.player.id}`} className="text-base font-black text-white hover:text-primary transition-colors block truncate">
                          {jogadorDaSemana.player.nickname}
                        </Link>
                        <span className="text-[10px] text-status-good font-bold bg-status-good/10 px-2 py-0.5 rounded border border-status-good/15 mt-1 inline-block">
                          {jogadorDaSemana.evolutionText}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/[0.05]">
                      <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-3 text-center">
                        <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/50">Rating</p>
                        <p className="text-lg font-black text-white mt-1">{jogadorDaSemana.rating.toFixed(2)}</p>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-3 text-center">
                        <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/50">Winrate</p>
                        <p className="text-lg font-black text-white mt-1">{jogadorDaSemana.winrate}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {duos.length > 0 && (
                <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
                  <div className="px-5 pt-4 pb-4">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/60 mb-3">Melhores Parcerias</p>
                    <div className="flex flex-col gap-3">
                      {duos.slice(0, 2).map((d) => (
                        <div key={`${d.playerA.id}-${d.playerB.id}`} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex -space-x-2 shrink-0">
                              <PlayerAvatar nickname={d.playerA.nickname} avatarUrl={d.playerA.avatarUrl} size="sm" />
                              <PlayerAvatar nickname={d.playerB.nickname} avatarUrl={d.playerB.avatarUrl} size="sm" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{d.playerA.nickname} + {d.playerB.nickname}</p>
                              <p className="text-[10px] text-muted-foreground/50">{d.total} partidas</p>
                            </div>
                          </div>
                          <span className="text-sm font-black text-status-good shrink-0">{d.winrate}%</span>
                        </div>
                      ))}
                      {dominantTrio && (
                        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/[0.05]">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex -space-x-2 shrink-0">
                              {dominantTrio.players.map((p) => (
                                <PlayerAvatar key={p.id} nickname={p.nickname} avatarUrl={p.avatarUrl} size="sm" />
                              ))}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{dominantTrio.players.map((p) => p.nickname).join(" · ")}</p>
                              <p className="text-[10px] text-muted-foreground/50">{dominantTrio.total} partidas · trio</p>
                            </div>
                          </div>
                          <span className="text-sm font-black text-status-good shrink-0">{dominantTrio.winrate}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* ── Estratégia ── */}
      <FadeIn delay={0.12}>
        <section>
          <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/50 mb-3">Estratégia</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">

            <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <p className="text-sm font-bold text-white">Map Pool</p>
              </div>
              <div className="p-4">
                <MapWinrateChart data={mapWinrates} />
                <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-white/[0.04]">
                  {bestMap && (
                    <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-status-good/5 border border-status-good/10">
                      <span className="flex items-center gap-1.5 text-status-good font-semibold text-[10px]">
                        <Flame className="size-3" /> Forte
                      </span>
                      <span className="text-white font-bold text-[10px]">{bestMap.map} · {bestMap.winrate.toFixed(0)}%</span>
                    </div>
                  )}
                  {worstMap && (
                    <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-status-critical/5 border border-status-critical/10">
                      <span className="flex items-center gap-1.5 text-status-critical font-semibold text-[10px]">
                        <ShieldAlert className="size-3" /> Evitar
                      </span>
                      <span className="text-white font-bold text-[10px]">{worstMap.map} · {worstMap.winrate.toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
                <p className="text-sm font-bold text-white">Evolução Recente</p>
                <TrendingUp className="size-3.5 text-accent-cyan/60" />
              </div>
              <div className="divide-y divide-white/[0.04]">
                {momentum.map((entry) => {
                  const isUp = entry.status === "up";
                  const isDown = entry.status === "down";
                  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
                  const colorClass = isUp ? "text-status-good" : isDown ? "text-status-critical" : "text-muted-foreground/30";
                  return (
                    <div key={entry.player.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{entry.player.nickname}</p>
                          <p className="text-[10px] text-muted-foreground/50">{entry.ratingChangeText} rating</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 shrink-0 text-[10px] font-black ${colorClass}`}>
                        <Icon className="size-3.5" />
                        {entry.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
                <p className="text-sm font-bold text-white">Impacto</p>
                <Flame className="size-3.5 text-status-warning/60" />
              </div>
              <div className="divide-y divide-white/[0.04]">
                {decisive.map((entry) => (
                  <div key={entry.player.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{entry.player.nickname}</p>
                        <p className="text-[10px] text-muted-foreground/50">
                          {entry.entryKills} aberturas{!entry.hideTradesAndClutches && ` · ${entry.clutchWins} clutches`}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-accent-cyan shrink-0">{entry.impactPercent}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.05]">
                  <p className="text-sm font-bold text-white">Perfis Táticos</p>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {archetypes.slice(0, 4).map((entry) => (
                    <div key={entry.player.id} className="px-5 py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
                        <p className="text-xs font-bold text-white truncate">{entry.player.nickname}</p>
                      </div>
                      <span className="text-[10px] font-bold text-accent-violet shrink-0">{entry.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {mapSpecialists.length > 0 && (
                <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/[0.05]">
                    <p className="text-xs font-bold text-white">Especialistas</p>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {mapSpecialists.slice(0, 4).map((ms) => (
                      <div key={ms.mapName} className="px-5 py-2 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground/60 capitalize">{ms.mapName}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">{ms.player.nickname}</span>
                          <span className="text-[9px] text-accent-violet font-bold">{ms.rating.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* ── Coach IA ── */}
      <FadeIn delay={0.14}>
        <div className="relative">
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-primary/12 via-accent-violet/6 to-transparent pointer-events-none" />
          <CoachReportCard apiUrl="/api/coach/dashboard" />
        </div>
      </FadeIn>

      {/* ── Histórico — peso reduzido ── */}
      <FadeIn delay={0.16}>
        <section>
          <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/50 mb-3">Histórico</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">

            <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <p className="text-sm font-bold text-white">Recordes</p>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {records.map((r, idx) => (
                  <div key={idx} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[8px] uppercase tracking-widest text-muted-foreground/40 font-bold">{r.category}</p>
                      <p className="text-xs font-bold text-white mt-0.5 truncate">
                        {r.playerName} <span className="text-muted-foreground/50 font-normal text-[10px]">{r.detail}</span>
                      </p>
                    </div>
                    <span className="text-sm font-black text-accent-cyan shrink-0 tabular-nums">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <p className="text-sm font-bold text-white">Conquistas Recentes</p>
              </div>
              {recentAchievements.length === 0 ? (
                <p className="text-muted-foreground/40 py-10 text-center text-sm">Nenhuma ainda.</p>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {recentAchievements.map((entry) => (
                    <AchievementFeedItem key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </div>

            <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <p className="text-sm font-bold text-white">Últimas Partidas</p>
              </div>
              {recentMatches.length === 0 ? (
                <p className="text-muted-foreground/40 py-10 text-center text-sm">Nenhuma partida.</p>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {recentMatches.map((match) => (
                    <MatchRow key={match.id} match={match} />
                  ))}
                </div>
              )}
              <div className="px-5 py-3.5 border-t border-white/[0.04]">
                <Link href="/sessions" className="text-xs text-primary/70 hover:text-primary transition-colors font-semibold inline-flex items-center gap-1.5 group">
                  Ver sessões completas
                  <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </FadeIn>

    </div>
  );
}
