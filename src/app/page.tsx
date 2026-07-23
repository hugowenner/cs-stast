import { FadeIn } from "@/components/motion/fade-in";
import { MatchRow } from "@/components/matches/match-row";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AchievementFeedItem } from "@/components/achievements/achievement-feed-item";
import { MapWinrateChart } from "@/components/charts/map-winrate-chart";
import { SeasonHero } from "@/components/dashboard/season-hero";
import { CoachReportCard } from "@/components/ui/coach-report-card";
import { RivalryCarousel } from "@/components/rivalries/rivalry-carousel";
import { RecentMatchesCarousel, type RecentMatchCardData } from "@/components/matches/recent-matches-carousel";
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
  Handshake,
  Target,
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
      safeQuery(() => matchService.listRecentMatches(10), []),
      safeQuery(() => competitiveService.getDashboardCompetitiveBundle(), EMPTY_COMPETITIVE_BUNDLE),
      safeQuery(() => statsService.getMapWinrates(), []),
      safeQuery(() => achievementService.listRecent(4), []),
      safeQuery(() => rivalryService.listTopRivalriesWithH2H(10), []),
    ]);

  const { powerRanking, momentum, decisive, archetypes, jogadorDaSemana, duos, dominantTrio, records } = competitive;

  const sortedMaps = [...mapWinrates].sort((a, b) => b.winrate - a.winrate);
  const bestMap = sortedMaps.find((m) => m.matchesPlayed >= 2) ?? null;
  const worstMap = [...mapWinrates].filter((m) => m.matchesPlayed >= 2).sort((a, b) => a.winrate - b.winrate)[0] ?? null;

  const hottestPlayer = momentum.find((m) => m.status === "up") ?? null;

  return (
    <div className="flex flex-col gap-10 lg:gap-14">

      {/* ═══ ZONA 1 — Season Overview ═══ */}
      <section className="flex flex-col gap-4">
        <FadeIn>
          <SeasonHero
            seasonLabel={SEASON_LABEL}
            totalMatches={summary.totalMatches}
            bestPlayer={summary.bestPlayer}
            communityWinrate={summary.community.avgWinrate}
            dominantMap={summary.dominantMap}
          />
        </FadeIn>

        {/* 3 stat tiles compactos */}
        <FadeIn delay={0.03}>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: "Média de Kills", value: `${summary.community.avgKills}` },
              { label: "HS Médio", value: `${summary.community.avgHsPercent}%` },
              { label: "Rounds Jogados", value: summary.community.totalRounds.toLocaleString("pt-BR") },
            ].map((stat) => (
              <div key={stat.label} className="glass-panel rounded-xl border border-white/[0.06] px-4 py-3 text-center">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground/65 font-bold">{stat.label}</p>
                <p className="text-lg font-black text-white mt-1">{stat.value}</p>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* 3 insights narrativos */}
        {(hottestPlayer || bestMap || worstMap) && (
          <FadeIn delay={0.05}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {hottestPlayer && (
                <div className="glass-panel rounded-xl border border-status-good/20 bg-status-good/[0.03] px-4 py-3.5 flex items-center gap-3">
                  <Zap className="size-4 text-status-good shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-status-good/80">Em ascensão</p>
                    <p className="text-sm font-black text-white truncate mt-0.5">{hottestPlayer.player.nickname}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">{hottestPlayer.ratingChangeText} nas últimas partidas</p>
                  </div>
                </div>
              )}
              {bestMap && (
                <div className="glass-panel rounded-xl border border-accent-cyan/20 bg-accent-cyan/[0.03] px-4 py-3.5 flex items-center gap-3">
                  <Map className="size-4 text-accent-cyan shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-accent-cyan/80">Mapa forte</p>
                    <p className="text-sm font-black text-white mt-0.5">{bestMap.map}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">{bestMap.winrate.toFixed(0)}% winrate · {bestMap.matchesPlayed} partidas</p>
                  </div>
                </div>
              )}
              {worstMap && (
                <div className="glass-panel rounded-xl border border-status-critical/20 bg-status-critical/[0.03] px-4 py-3.5 flex items-center gap-3">
                  <AlertTriangle className="size-4 text-status-critical shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-status-critical/80">Evitar no veto</p>
                    <p className="text-sm font-black text-white mt-0.5">{worstMap.map}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">{worstMap.winrate.toFixed(0)}% winrate · ponto crítico</p>
                  </div>
                </div>
              )}
            </div>
          </FadeIn>
        )}
      </section>

      {/* ═══ ZONA 2 — Partidas Recentes ═══ */}
      {recentMatches.length > 0 && (
        <section>
          <FadeIn delay={0.07}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/60">Partidas Recentes</p>
                <p className="text-xs text-muted-foreground/55 mt-0.5">Últimos jogos dos jogadores monitorados</p>
              </div>
              <Link href="/sessions" className="text-[10px] text-primary/70 hover:text-primary transition-colors font-semibold inline-flex items-center gap-1 group shrink-0">
                Ver todas <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </FadeIn>
          <FadeIn delay={0.08}>
            <RecentMatchesCarousel matches={recentMatches as RecentMatchCardData[]} />
          </FadeIn>
        </section>
      )}

      {/* ═══ ZONA 3 — Confrontos Diretos ═══ */}
      <section>
        <FadeIn delay={0.07}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/60">Confrontos Diretos</p>
              <p className="text-xs text-muted-foreground/55 mt-0.5">Histórico de rivalidades entre os jogadores monitorados</p>
            </div>
            <Link href="/compare" className="text-[10px] text-primary/70 hover:text-primary transition-colors font-semibold inline-flex items-center gap-1 group shrink-0">
              Scout H2H <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </FadeIn>

        {topRivalries.length > 0 ? (
          <FadeIn delay={0.08}>
            <RivalryCarousel rivalries={topRivalries} />
          </FadeIn>
        ) : (
          <FadeIn delay={0.08}>
            <div className="glass-panel rounded-2xl border border-white/[0.07] p-10 text-center">
              <Swords className="size-6 text-muted-foreground/35 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground/55">Nenhum confronto direto registrado ainda.</p>
            </div>
          </FadeIn>
        )}

        {/* Parcerias */}
        {(duos.length > 0 || dominantTrio) && (
          <FadeIn delay={0.1}>
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/60">Melhores Parcerias</p>
                  <p className="text-xs text-muted-foreground/55 mt-0.5">Duplas e trios com maior sinergia na temporada</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">

                {duos.slice(0, 2).map((duo, i) => (
                  <div key={i} className="glass-panel rounded-2xl border border-status-good/15 bg-status-good/[0.02] overflow-hidden">
                    <div className="px-4 pt-3.5 pb-2.5 border-b border-white/[0.05] flex items-center gap-2">
                      <Handshake className="size-3 text-status-good shrink-0" />
                      <span className="text-[9px] uppercase tracking-widest font-bold text-status-good/80">
                        {i === 0 ? "Dupla principal" : "Dupla #2"}
                      </span>
                      <span className="ml-auto text-[9px] text-muted-foreground/60 font-semibold">{duo.total} partidas</span>
                    </div>
                    <div className="px-4 py-4 flex items-center justify-center gap-5">
                      <div className="flex flex-col items-center gap-1.5">
                        <PlayerAvatar nickname={duo.playerA.nickname} avatarUrl={duo.playerA.avatarUrl} size="md" />
                        <p className="text-xs font-bold text-white text-center truncate max-w-[90px]">{duo.playerA.nickname}</p>
                      </div>
                      <span className="text-muted-foreground/40 text-base font-light shrink-0">+</span>
                      <div className="flex flex-col items-center gap-1.5">
                        <PlayerAvatar nickname={duo.playerB.nickname} avatarUrl={duo.playerB.avatarUrl} size="md" />
                        <p className="text-xs font-bold text-white text-center truncate max-w-[90px]">{duo.playerB.nickname}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 px-4 pb-4">
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2 text-center">
                        <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/60">Vitórias</p>
                        <p className="text-base font-black text-status-good mt-0.5">{duo.wins}</p>
                      </div>
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2 text-center">
                        <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/60">WR</p>
                        <p className="text-base font-black text-white mt-0.5">{duo.winrate}%</p>
                      </div>
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2 text-center">
                        <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/60">Rating</p>
                        <p className="text-base font-black text-white mt-0.5">{duo.avgRating?.toFixed(2) ?? "—"}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {dominantTrio && (
                  <div className="glass-panel rounded-2xl border border-accent-cyan/15 bg-accent-cyan/[0.02] overflow-hidden">
                    <div className="px-4 pt-3.5 pb-2.5 border-b border-white/[0.05] flex items-center gap-2">
                      <Target className="size-3 text-accent-cyan shrink-0" />
                      <span className="text-[9px] uppercase tracking-widest font-bold text-accent-cyan/80">Trio dominante</span>
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
                )}

                {duos.length > 2 && (
                  <div className="sm:col-span-2 lg:col-span-3 glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-white/[0.05]">
                      <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/60">Outras duplas</p>
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
                              <p className="text-[8px] text-muted-foreground/60 uppercase tracking-widest font-bold">Rating</p>
                              <p className="text-sm font-black text-white/90">{duo.avgRating?.toFixed(2) ?? "—"}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </FadeIn>
        )}
      </section>

      {/* ═══ ZONA 3 — Performance ═══ */}
      <section>
        <FadeIn delay={0.12}>
          <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/60 mb-4">Performance</p>
        </FadeIn>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

          <FadeIn delay={0.13} className="lg:col-span-2">
            <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Power Ranking</p>
                  <p className="text-[10px] text-muted-foreground/65 mt-0.5">Quem domina a temporada</p>
                </div>
                <Trophy className="size-4 text-status-warning/60" />
              </div>
              <div className="divide-y divide-white/[0.04]">
                {powerRanking.map((entry, index) => {
                  const isTop3 = index < 3;
                  const podiumColors = ["text-yellow-400", "text-slate-300", "text-amber-600"];
                  return (
                    <div key={entry.player.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/[0.012] transition-colors">
                      <span className={`text-xs font-black w-5 shrink-0 text-center tabular-nums ${isTop3 ? podiumColors[index] : "text-muted-foreground/40"}`}>
                        {index + 1}
                      </span>
                      <Link href={`/players/${entry.player.id}`} className="flex items-center gap-2.5 min-w-0 flex-1 group">
                        <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">{entry.player.nickname}</p>
                          <p className="text-[10px] text-muted-foreground/65">{entry.levelLabel}</p>
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
                            <p className="text-[8px] uppercase tracking-widest text-muted-foreground/60 font-bold">{col.label}</p>
                            <p className={`text-xs font-black mt-0.5 ${col.highlight ? "text-accent-violet" : "text-white/90"}`}>{col.value}</p>
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
          </FadeIn>

          <FadeIn delay={0.14}>
            {jogadorDaSemana ? (
              <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
                <div className="px-5 pt-5 pb-5">
                  <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/65 mb-4">Jogador da Semana</p>
                  <div className="flex flex-col items-center gap-3 text-center">
                    <PlayerAvatar nickname={jogadorDaSemana.player.nickname} avatarUrl={jogadorDaSemana.player.avatarUrl} size="lg" />
                    <div>
                      <Link href={`/players/${jogadorDaSemana.player.id}`} className="text-base font-black text-white hover:text-primary transition-colors block">
                        {jogadorDaSemana.player.nickname}
                      </Link>
                      <span className="text-[10px] text-status-good font-bold bg-status-good/10 px-2.5 py-0.5 rounded-full border border-status-good/15 mt-1.5 inline-block">
                        {jogadorDaSemana.evolutionText}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-white/[0.05]">
                    <div className="bg-white/[0.025] border border-white/[0.06] rounded-xl p-3 text-center">
                      <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/65">Rating</p>
                      <p className="text-xl font-black text-white mt-1">{jogadorDaSemana.rating.toFixed(2)}</p>
                    </div>
                    <div className="bg-white/[0.025] border border-white/[0.06] rounded-xl p-3 text-center">
                      <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/65">Winrate</p>
                      <p className="text-xl font-black text-white mt-1">{jogadorDaSemana.winrate}%</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-panel rounded-2xl border border-white/[0.07] p-8 text-center">
                <p className="text-xs text-muted-foreground/55">Sem destaques esta semana.</p>
              </div>
            )}
          </FadeIn>
        </div>
      </section>

      {/* ═══ ZONA 4 — Estratégia ═══ */}
      <section>
        <FadeIn delay={0.16}>
          <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/60 mb-4">Estratégia</p>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">

          <FadeIn delay={0.17}>
            <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <p className="text-sm font-bold text-white">Map Pool</p>
              </div>
              <div className="p-4">
                <MapWinrateChart data={mapWinrates} />
                <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-white/[0.04]">
                  {bestMap && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-status-good/5 border border-status-good/10">
                      <span className="flex items-center gap-1.5 text-status-good font-semibold text-[10px]">
                        <Flame className="size-3" /> Forte
                      </span>
                      <span className="text-white/90 font-bold text-[10px]">{bestMap.map} · {bestMap.winrate.toFixed(0)}%</span>
                    </div>
                  )}
                  {worstMap && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-status-critical/5 border border-status-critical/10">
                      <span className="flex items-center gap-1.5 text-status-critical font-semibold text-[10px]">
                        <ShieldAlert className="size-3" /> Evitar
                      </span>
                      <span className="text-white/90 font-bold text-[10px]">{worstMap.map} · {worstMap.winrate.toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.18}>
            <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
                <p className="text-sm font-bold text-white">Evolução e Impacto</p>
                <TrendingUp className="size-3.5 text-accent-cyan/60" />
              </div>
              <div className="divide-y divide-white/[0.04]">
                {momentum.map((entry) => {
                  const isUp = entry.status === "up";
                  const isDown = entry.status === "down";
                  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
                  const colorClass = isUp ? "text-status-good" : isDown ? "text-status-critical" : "text-muted-foreground/40";
                  const impactEntry = decisive.find((d) => d.player.id === entry.player.id);
                  return (
                    <div key={entry.player.id} className="px-5 py-3 flex items-center gap-3">
                      <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white/90 truncate">{entry.player.nickname}</p>
                        <p className="text-[10px] text-muted-foreground/65">{entry.ratingChangeText} rating</p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <div className={`flex items-center gap-1 text-[10px] font-black ${colorClass}`}>
                          <Icon className="size-3" />
                          {entry.label}
                        </div>
                        {impactEntry && (
                          <span className="text-[9px] text-accent-cyan/85 font-semibold">{impactEntry.impactPercent}% impacto</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {decisive
                  .filter((d) => !momentum.find((m) => m.player.id === d.player.id))
                  .slice(0, 2)
                  .map((entry) => (
                    <div key={entry.player.id} className="px-5 py-3 flex items-center gap-3">
                      <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white/90 truncate">{entry.player.nickname}</p>
                        <p className="text-[10px] text-muted-foreground/65">{entry.entryKills} aberturas{!entry.hideTradesAndClutches && ` · ${entry.clutchWins} clutches`}</p>
                      </div>
                      <span className="text-xs font-black text-accent-cyan shrink-0">{entry.impactPercent}%</span>
                    </div>
                  ))}
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.19}>
            <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <p className="text-sm font-bold text-white">Perfis Táticos</p>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {archetypes.slice(0, 6).map((entry) => (
                  <div key={entry.player.id} className="px-5 py-3 flex items-center gap-3">
                    <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white/90 truncate">{entry.player.nickname}</p>
                      <p className="text-[10px] text-muted-foreground/65">{entry.metricValue}</p>
                    </div>
                    <span className="text-[10px] font-bold text-accent-violet shrink-0">{entry.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ Coach IA ═══ */}
      <FadeIn delay={0.2}>
        <div className="relative">
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-primary/12 via-accent-violet/6 to-transparent pointer-events-none" />
          <CoachReportCard apiUrl="/api/coach/dashboard" />
        </div>
      </FadeIn>

      {/* ═══ ZONA 5 — Histórico ═══ */}
      <section>
        <FadeIn delay={0.22}>
          <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/60 mb-4">Histórico</p>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">

          <FadeIn delay={0.23}>
            <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <p className="text-sm font-bold text-white">Recordes</p>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {records.map((r, idx) => (
                  <div key={idx} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[8px] uppercase tracking-widest text-muted-foreground/60 font-bold">{r.category}</p>
                      <p className="text-xs font-bold text-white/90 mt-0.5 truncate">
                        {r.playerName}{" "}
                        <span className="text-muted-foreground/65 font-normal text-[10px]">{r.detail}</span>
                      </p>
                    </div>
                    <span className="text-sm font-black text-accent-cyan shrink-0 tabular-nums">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.24}>
            <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <p className="text-sm font-bold text-white">Conquistas Recentes</p>
              </div>
              {recentAchievements.length === 0 ? (
                <p className="text-muted-foreground/55 py-10 text-center text-sm">Nenhuma ainda.</p>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {recentAchievements.map((entry) => (
                    <AchievementFeedItem key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          </FadeIn>

          <FadeIn delay={0.25}>
            <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <p className="text-sm font-bold text-white">Últimas Partidas</p>
              </div>
              {recentMatches.length === 0 ? (
                <p className="text-muted-foreground/55 py-10 text-center text-sm">Nenhuma partida.</p>
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
          </FadeIn>
        </div>
      </section>

    </div>
  );
}
