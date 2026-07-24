import { FadeIn } from "@/components/motion/fade-in";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { MatchRow } from "@/components/matches/match-row";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AchievementFeedItem } from "@/components/achievements/achievement-feed-item";
import { MapWinrateChart } from "@/components/charts/map-winrate-chart";
import { SeasonHero } from "@/components/dashboard/season-hero";
import { CoachReportCard } from "@/components/ui/coach-report-card";
import { RivalryCarousel } from "@/components/rivalries/rivalry-carousel";
import { ConfrontationsCarousel } from "@/components/matches/confrontations-carousel";
import type { RecentMatchCardData } from "@/components/matches/recent-matches-carousel";
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
  Flame,
  ShieldAlert,
  ArrowRight,
  Swords,
  Zap,
  Map,
  AlertTriangle,
  TrendingDown,
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
  bestPerformance: null,
  worstPerformance: null,
};

export default async function DashboardPage() {
  const [summary, recentMatches, competitive, mapWinrates, recentAchievements, topRivalries] =
    await Promise.all([
      safeQuery(() => dashboardService.getDashboardSummary(), {
        totalMatches: 0,
        totalPlayers: 0,
        totalSessions: 0,
        latestSession: null,
        community: { avgWinrate: 0, avgKills: 0, avgAdr: 0, avgKd: 0, avgHsPercent: 0, totalKills: 0, totalRounds: 0 },
        dominantMap: null,
        bestPlayer: null,
      }),
      safeQuery(() => matchService.listRecentMatches(10), []),
      safeQuery(() => competitiveService.getDashboardCompetitiveBundle(), EMPTY_COMPETITIVE_BUNDLE),
      safeQuery(() => statsService.getMapWinrates(), []),
      safeQuery(() => achievementService.listRecent(4), []),
      safeQuery(() => rivalryService.listTopRivalriesWithH2H(10), []),
    ]);

  const { powerRanking, momentum, jogadorDaSemana, duos, dominantTrio, bestPerformance, worstPerformance } = competitive;

  const sortedMaps = [...mapWinrates].sort((a, b) => b.winrate - a.winrate);
  const bestMap = sortedMaps.find((m) => m.matchesPlayed >= 2) ?? null;
  const worstMap = [...mapWinrates].filter((m) => m.matchesPlayed >= 2).sort((a, b) => a.winrate - b.winrate)[0] ?? null;

  const hottestPlayer = momentum.find((m) => m.status === "up") ?? null;
  const coldestPlayer = momentum.find((m) => m.status === "down") ?? null;

  const FORMA_STYLE: Record<string, { text: string; color: string; bg: string; border: string; prefix: string }> = {
    "Excelente": { text: "Excelente",  color: "text-status-good",    bg: "bg-status-good/10",    border: "border-status-good/20",    prefix: "▲" },
    "Em alta":   { text: "Em alta",    color: "text-status-good",    bg: "bg-status-good/10",    border: "border-status-good/20",    prefix: "▲" },
    "Estável":   { text: "Estável",    color: "text-muted-foreground/70", bg: "bg-white/[0.04]", border: "border-white/[0.08]",       prefix: "▬" },
    "Oscilando": { text: "Oscilando",  color: "text-status-warning", bg: "bg-status-warning/10", border: "border-status-warning/20", prefix: "▼" },
  };

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

        {/* 5 stat tiles compactos */}
        <FadeIn delay={0.03}>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[
              { label: "Rounds",    num: summary.community.totalRounds,   suffix: "",  decimals: 0 },
              { label: "Kills",     num: summary.community.totalKills,     suffix: "",  decimals: 0 },
              { label: "ADR Médio", num: summary.community.avgAdr,         suffix: "",  decimals: 0 },
              { label: "K/D Médio", num: summary.community.avgKd,          suffix: "",  decimals: 2 },
              { label: "HS%",       num: summary.community.avgHsPercent,   suffix: "%", decimals: 0 },
            ].map((stat) => (
              <div key={stat.label} className="glass-panel rounded-xl border border-white/[0.06] px-4 py-3 text-center">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground/65 font-bold">{stat.label}</p>
                <p className="text-lg font-black text-white mt-1 tabular-nums">
                  <AnimatedNumber
                    value={stat.num}
                    decimals={stat.decimals}
                    suffix={stat.suffix}
                  />
                </p>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* 4 insights narrativos */}
        {(hottestPlayer || coldestPlayer || bestMap || worstMap) && (
          <FadeIn delay={0.05}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {hottestPlayer && (
                <div className="glass-panel rounded-xl border border-status-good/20 bg-status-good/[0.03] px-4 py-3.5 flex items-center gap-3">
                  <Zap className="size-4 text-status-good shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-status-good/80">Evolução Recente</p>
                    <p className="text-sm font-black text-white truncate mt-0.5">{hottestPlayer.player.nickname}</p>
                    <p className="text-[10px] text-status-good/90 font-semibold mt-0.5">{hottestPlayer.ratingChangeText}</p>
                    {hottestPlayer.winrateChangeText && (
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{hottestPlayer.winrateChangeText}</p>
                    )}
                  </div>
                </div>
              )}
              {coldestPlayer && (
                <div className="glass-panel rounded-xl border border-status-critical/20 bg-status-critical/[0.03] px-4 py-3.5 flex items-center gap-3">
                  <TrendingDown className="size-4 text-status-critical shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-status-critical/80">Queda de Rendimento</p>
                    <p className="text-sm font-black text-white truncate mt-0.5">{coldestPlayer.player.nickname}</p>
                    <p className="text-[10px] text-status-critical/90 font-semibold mt-0.5">{coldestPlayer.ratingChangeText}</p>
                    {coldestPlayer.winrateChangeText && (
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{coldestPlayer.winrateChangeText}</p>
                    )}
                  </div>
                </div>
              )}
              {bestMap && (
                <div className="glass-panel rounded-xl border border-accent-cyan/20 bg-accent-cyan/[0.03] px-4 py-3.5 flex items-center gap-3">
                  <Map className="size-4 text-accent-cyan shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-accent-cyan/80">Melhor Mapa</p>
                    <p className="text-sm font-black text-white mt-0.5">{bestMap.map}</p>
                    <p className="text-[10px] text-accent-cyan/80 font-semibold mt-0.5">{bestMap.winrate.toFixed(0)}% WR · {bestMap.matchesPlayed} partidas</p>
                  </div>
                </div>
              )}
              {worstMap && (
                <div className="glass-panel rounded-xl border border-status-warning/20 bg-status-warning/[0.03] px-4 py-3.5 flex items-center gap-3">
                  <AlertTriangle className="size-4 text-status-warning shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-status-warning/80">Mapa para Revisar</p>
                    <p className="text-sm font-black text-white mt-0.5">{worstMap.map}</p>
                    <p className="text-[10px] text-status-warning/80 font-semibold mt-0.5">{worstMap.winrate.toFixed(0)}% WR · {worstMap.matchesPlayed} partidas · veto</p>
                  </div>
                </div>
              )}
            </div>
          </FadeIn>
        )}
      </section>

      {/* ═══ ZONA 2 — Últimos Confrontos ═══ */}
      {recentMatches.length > 0 && (
        <section>
          <FadeIn delay={0.07}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/60">Últimos Confrontos</p>
                <p className="text-xs text-muted-foreground/55 mt-0.5">Últimos confrontos entre jogadores monitorados</p>
              </div>
              <Link href="/sessions" className="text-[10px] text-primary/70 hover:text-primary transition-colors font-semibold inline-flex items-center gap-1 group shrink-0">
                Ver todas <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </FadeIn>
          <FadeIn delay={0.08}>
            <ConfrontationsCarousel matches={recentMatches as RecentMatchCardData[]} />
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
                        <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/60">Rating da dupla</p>
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
                              <p className="text-[8px] text-muted-foreground/60 uppercase tracking-widest font-bold">Rating da dupla</p>
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
                  <p className="text-sm font-bold text-white">Ranking Competitivo</p>
                  <p className="text-[10px] text-muted-foreground/65 mt-0.5">Performance da Temporada</p>
                </div>
                <Trophy className="size-4 text-status-warning/60" />
              </div>
              <div className="divide-y divide-white/[0.04]">
                {powerRanking.map((entry, index) => {
                  const isTop3 = index < 3;
                  const podiumColors = ["text-yellow-400", "text-slate-300", "text-amber-600"];
                  return (
                    <div key={entry.player.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/[0.012] transition-colors group/row">
                      <span className={`text-xs font-black w-5 shrink-0 text-center tabular-nums ${isTop3 ? podiumColors[index] : "text-muted-foreground/40"}`}>
                        {index + 1}
                      </span>
                      <Link href={`/players/${entry.player.id}`} className="flex items-center gap-2.5 min-w-0 flex-1 group">
                        <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">{entry.player.nickname}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {(() => {
                              const f = FORMA_STYLE[entry.forma] ?? FORMA_STYLE["Oscilando"];
                              return (
                                <span className={`badge-hover inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${f.color} ${f.bg} ${f.border}`}>
                                  {f.prefix} {f.text}
                                </span>
                              );
                            })()}
                            <span className="text-[10px] text-muted-foreground/50">{entry.matchCount} partidas</span>
                          </div>
                        </div>
                      </Link>
                      <div className="hidden sm:grid grid-cols-5 gap-4 text-center shrink-0">
                        {[
                          { label: "Rating", num: entry.rating,    dec: 2, suf: "",  dur: 0.7 },
                          { label: "ADR",    num: entry.adr,       dec: 0, suf: "",  dur: 0.6 },
                          { label: "K/D",    num: entry.kd,        dec: 2, suf: "",  dur: 0.65 },
                          { label: "KAST",   num: entry.kast,      dec: 0, suf: "%", dur: 0.55 },
                          { label: "WR",     num: entry.winrate,   dec: 0, suf: "%", dur: 0.55 },
                        ].map((col, ci) => (
                          <div key={col.label}>
                            <p className="text-[8px] uppercase tracking-widest text-muted-foreground/60 font-bold">{col.label}</p>
                            <p className="text-xs font-black mt-0.5 text-white/90 tabular-nums">
                              <AnimatedNumber
                                value={col.num}
                                decimals={col.dec}
                                suffix={col.suf}
                                duration={col.dur + index * 0.04 + ci * 0.02}
                              />
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="sm:hidden text-right shrink-0">
                        <p className="text-sm font-black text-white/90 tabular-nums">
                          <AnimatedNumber value={entry.rating} decimals={2} duration={0.7 + index * 0.04} />
                        </p>
                        <p className="text-[9px] text-muted-foreground/60 font-bold">Rating</p>
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
                  <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/65 mb-4">Destaque da Semana</p>
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
                      <p className="text-xl font-black text-white mt-1 tabular-nums">
                        <AnimatedNumber value={jogadorDaSemana.rating} decimals={2} duration={0.8} />
                      </p>
                    </div>
                    <div className="bg-white/[0.025] border border-white/[0.06] rounded-xl p-3 text-center">
                      <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/65">Winrate</p>
                      <p className="text-xl font-black text-white mt-1 tabular-nums">
                        <AnimatedNumber value={jogadorDaSemana.winrate} decimals={0} suffix="%" duration={0.65} />
                      </p>
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

      {/* ═══ DESTAQUES DA TEMPORADA ═══ */}
      {(bestPerformance || worstPerformance) && (
        <section>
          <FadeIn delay={0.15}>
            <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/60 mb-4">Destaques da Temporada</p>
          </FadeIn>
          <FadeIn delay={0.155}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {bestPerformance && (
                <div className="glass-panel rounded-2xl border border-status-warning/25 bg-status-warning/[0.02] overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-status-warning/10 flex items-center gap-2">
                    <Flame className="size-3.5 text-status-warning shrink-0" />
                    <p className="text-[10px] uppercase tracking-widest font-bold text-status-warning/80">Melhor Atuação da Temporada</p>
                  </div>
                  <div className="px-5 py-4 flex items-start gap-4">
                    <PlayerAvatar nickname={bestPerformance.player.nickname} avatarUrl={bestPerformance.player.avatarUrl} size="md" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/players/${bestPerformance.player.id}`} className="text-sm font-black text-white hover:text-primary transition-colors block truncate">
                        {bestPerformance.player.nickname}
                      </Link>
                      <p className="text-[10px] text-muted-foreground/65 mt-0.5">{bestPerformance.mapName} · {bestPerformance.playedAt}</p>
                      <div className="grid grid-cols-4 gap-1.5 mt-3">
                        {([
                          { label: "Rating", num: bestPerformance.rating,           dec: 2, dur: 0.8 },
                          { label: "K/D",    num: parseFloat(bestPerformance.kd),   dec: 2, dur: 0.7 },
                          { label: "ADR",    num: bestPerformance.adr,              dec: 0, dur: 0.65 },
                          { label: "Kills",  num: bestPerformance.kills,            dec: 0, dur: 0.6 },
                        ] as const).map((stat) => (
                          <div key={stat.label} className="text-center bg-status-warning/5 border border-status-warning/10 rounded-lg p-1.5">
                            <p className="text-[7px] uppercase tracking-widest font-bold text-muted-foreground/60">{stat.label}</p>
                            <p className="text-xs font-black text-status-warning mt-0.5 tabular-nums">
                              <AnimatedNumber value={stat.num} decimals={stat.dec} duration={stat.dur} />
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {worstPerformance && (
                <div className="glass-panel rounded-2xl border border-status-critical/20 bg-status-critical/[0.02] overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-status-critical/10 flex items-center gap-2">
                    <ShieldAlert className="size-3.5 text-status-critical shrink-0" />
                    <p className="text-[10px] uppercase tracking-widest font-bold text-status-critical/80">Menor Impacto Registrado</p>
                  </div>
                  <div className="px-5 py-4 flex items-start gap-4">
                    <PlayerAvatar nickname={worstPerformance.player.nickname} avatarUrl={worstPerformance.player.avatarUrl} size="md" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/players/${worstPerformance.player.id}`} className="text-sm font-black text-white hover:text-primary transition-colors block truncate">
                        {worstPerformance.player.nickname}
                      </Link>
                      <p className="text-[10px] text-muted-foreground/65 mt-0.5">{worstPerformance.mapName} · {worstPerformance.playedAt}</p>
                      <div className="grid grid-cols-4 gap-1.5 mt-3">
                        {([
                          { label: "Rating", num: worstPerformance.rating,          dec: 2, dur: 0.8 },
                          { label: "K/D",    num: parseFloat(worstPerformance.kd),  dec: 2, dur: 0.7 },
                          { label: "ADR",    num: worstPerformance.adr,             dec: 0, dur: 0.65 },
                          { label: "Kills",  num: worstPerformance.kills,           dec: 0, dur: 0.6 },
                        ] as const).map((stat) => (
                          <div key={stat.label} className="text-center bg-status-critical/5 border border-status-critical/10 rounded-lg p-1.5">
                            <p className="text-[7px] uppercase tracking-widest font-bold text-muted-foreground/60">{stat.label}</p>
                            <p className="text-xs font-black text-status-critical mt-0.5 tabular-nums">
                              <AnimatedNumber value={stat.num} decimals={stat.dec} duration={stat.dur} />
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </FadeIn>
        </section>
      )}

      {/* ═══ ZONA 4 — Estratégia ═══ */}
      <section>
        <FadeIn delay={0.16}>
          <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/60 mb-4">Estratégia</p>
        </FadeIn>
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
                      <Flame className="size-3" /> Melhor desempenho
                    </span>
                    <span className="text-white/90 font-bold text-[10px]">{bestMap.map} · {bestMap.winrate.toFixed(0)}%</span>
                  </div>
                )}
                {worstMap && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-status-critical/5 border border-status-critical/10">
                    <span className="flex items-center gap-1.5 text-status-critical font-semibold text-[10px]">
                      <ShieldAlert className="size-3" /> Mapa problema
                    </span>
                    <span className="text-white/90 font-bold text-[10px]">{worstMap.map} · {worstMap.winrate.toFixed(0)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ═══ Coach IA ═══ */}
      <FadeIn delay={0.2}>
        <div className="relative">
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-primary/12 via-accent-violet/6 to-transparent pointer-events-none" />
          <CoachReportCard apiUrl="/api/coach/dashboard" />
        </div>
      </FadeIn>

      {/* ═══ ZONA 5 — Conquistas Recentes ═══ */}
      <section>
        <FadeIn delay={0.22}>
          <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/60 mb-4">Conquistas Recentes</p>
        </FadeIn>
        <FadeIn delay={0.23}>
          <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
            {recentAchievements.length === 0 ? (
              <p className="text-muted-foreground/55 py-10 text-center text-sm">Nenhuma conquista ainda.</p>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {recentAchievements.map((entry, i) => (
                  <AchievementFeedItem key={entry.id} entry={entry} index={i} />
                ))}
              </div>
            )}
          </div>
        </FadeIn>
      </section>

      {/* ═══ ZONA 6 — Últimas Partidas ═══ */}
      <section>
        <FadeIn delay={0.24}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/60">Últimas Partidas</p>
            <Link href="/sessions" className="text-[10px] text-primary/70 hover:text-primary transition-colors font-semibold inline-flex items-center gap-1 group shrink-0">
              Ver sessões completas <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </FadeIn>
        <FadeIn delay={0.25}>
          <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
            {recentMatches.length === 0 ? (
              <p className="text-muted-foreground/55 py-10 text-center text-sm">Nenhuma partida.</p>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {recentMatches.slice(0, 4).map((match) => (
                  <MatchRow key={match.id} match={match} />
                ))}
              </div>
            )}
          </div>
        </FadeIn>
      </section>

    </div>
  );
}
