import { FadeIn } from "@/components/motion/fade-in";
import { MatchRow } from "@/components/matches/match-row";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AchievementFeedItem } from "@/components/achievements/achievement-feed-item";
import { RivalryRow } from "@/components/rivalries/rivalry-row";
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
import { Trophy, TrendingUp, TrendingDown, Minus, Flame, ShieldAlert, ArrowRight, Swords } from "lucide-react";

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

function ZoneLabel({ label, title }: { label: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-0.5 h-5 rounded-full bg-accent-violet/60 shrink-0" />
      <div>
        <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/70">{label}</p>
        <h2 className="text-base font-black text-white leading-tight">{title}</h2>
      </div>
    </div>
  );
}

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
      safeQuery(() => matchService.listRecentMatches(6), []),
      safeQuery(() => competitiveService.getDashboardCompetitiveBundle(), EMPTY_COMPETITIVE_BUNDLE),
      safeQuery(() => statsService.getMapWinrates(), []),
      safeQuery(() => achievementService.listRecent(5), []),
      safeQuery(() => rivalryService.listTopRivalriesWithH2H(6), []),
    ]);

  const { powerRanking, momentum, decisive, archetypes, matchups, jogadorDaSemana, duos, dominantTrio, mapSpecialists, records } = competitive;

  const sortedMaps = [...mapWinrates].sort((a, b) => b.winrate - a.winrate);
  const bestMap = sortedMaps.find((m) => m.matchesPlayed >= 1) ?? null;
  const worstMap = [...mapWinrates].filter((m) => m.matchesPlayed >= 1).sort((a, b) => a.winrate - b.winrate)[0] ?? null;

  return (
    <div className="flex flex-col gap-10 lg:gap-14">

      {/* ── ZONA 1: Identidade da Temporada ── */}
      <section>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            {[
              { label: "Winrate Geral", value: `${summary.community.avgWinrate}%`, accent: true },
              { label: "Média de Kills", value: `${summary.community.avgKills}`, accent: false },
              { label: "HS Médio", value: `${summary.community.avgHsPercent}%`, accent: false },
              { label: "Rounds Jogados", value: summary.community.totalRounds.toLocaleString("pt-BR"), accent: false },
            ].map((stat) => (
              <div key={stat.label} className="glass-panel rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-3.5">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-bold">{stat.label}</p>
                <p className={`text-2xl font-black mt-1.5 ${stat.accent ? "text-accent-cyan" : "text-white"}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ── ZONA 2: Rivalidades ── */}
      <section>
        <FadeIn delay={0.06}>
          <ZoneLabel label="Competição" title="Confrontos Diretos" />
        </FadeIn>

        {topRivalries.length === 0 ? (
          <FadeIn delay={0.08}>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] py-16 text-center">
              <Swords className="size-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Ainda não há confrontos suficientes para formar rivalidades.</p>
            </div>
          </FadeIn>
        ) : (
          <FadeIn delay={0.08}>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {topRivalries.map((rivalry) => (
                <RivalryRow key={rivalry.id} rivalry={rivalry} />
              ))}
            </div>
          </FadeIn>
        )}
      </section>

      {/* ── ZONA 3: Performance ── */}
      <section>
        <FadeIn delay={0.1}>
          <ZoneLabel label="Performance" title="Ranking da Temporada" />
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

          {/* Power Ranking */}
          <FadeIn delay={0.11} className="lg:col-span-2">
            <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/70">Power Ranking</p>
                  <p className="text-sm font-bold text-white mt-0.5">Quem domina a temporada</p>
                </div>
                <Trophy className="size-4 text-status-warning/80" />
              </div>
              <div className="divide-y divide-white/[0.04]">
                {powerRanking.map((entry, index) => {
                  const isTop3 = index < 3;
                  const podiumColors = ["text-yellow-400", "text-slate-400", "text-amber-600"];
                  return (
                    <div key={entry.player.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/[0.015] transition-colors">
                      <span className={`text-xs font-black w-5 shrink-0 text-center tabular-nums ${isTop3 ? podiumColors[index] : "text-muted-foreground/40"}`}>
                        {index + 1}
                      </span>
                      <Link href={`/players/${entry.player.id}`} className="flex items-center gap-2.5 min-w-0 flex-1 group">
                        <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">{entry.player.nickname}</p>
                          <p className="text-[10px] text-muted-foreground/60">{entry.forma} · {entry.levelLabel}</p>
                        </div>
                      </Link>
                      <div className="hidden sm:grid grid-cols-4 gap-5 text-center text-xs shrink-0">
                        {[
                          { label: "Rating", value: entry.rating.toFixed(2) },
                          { label: "KAST", value: `${entry.kast}%` },
                          { label: "WR", value: `${entry.winrate}%` },
                          { label: "Score", value: entry.powerScore, highlight: true },
                        ].map((col) => (
                          <div key={col.label}>
                            <p className="text-[8px] uppercase tracking-widest text-muted-foreground/50 font-bold">{col.label}</p>
                            <p className={`font-black mt-0.5 ${col.highlight ? "text-accent-violet" : "text-white"}`}>{col.value}</p>
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

          {/* Jogador da Semana + Parceria */}
          <FadeIn delay={0.12}>
            <div className="flex flex-col gap-3">
              {jogadorDaSemana && (
                <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
                  <div className="px-5 pt-5 pb-4">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/70 mb-3">Jogador da Semana</p>
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
                        <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/60">Rating</p>
                        <p className="text-lg font-black text-white mt-1">{jogadorDaSemana.rating.toFixed(2)}</p>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-3 text-center">
                        <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/60">Winrate</p>
                        <p className="text-lg font-black text-white mt-1">{jogadorDaSemana.winrate}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {duos.length > 0 && (
                <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
                  <div className="px-5 pt-5 pb-4">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/70 mb-3">Melhor Parceria</p>
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
                              <p className="text-[10px] text-muted-foreground/60">{d.total} partidas</p>
                            </div>
                          </div>
                          <span className="text-sm font-black text-status-good shrink-0">{d.winrate}%</span>
                        </div>
                      ))}
                      {dominantTrio && (
                        <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/[0.05]">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex -space-x-2 shrink-0">
                              {dominantTrio.players.map((p) => (
                                <PlayerAvatar key={p.id} nickname={p.nickname} avatarUrl={p.avatarUrl} size="sm" />
                              ))}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{dominantTrio.players.map((p) => p.nickname).join(" · ")}</p>
                              <p className="text-[10px] text-muted-foreground/60">{dominantTrio.total} partidas · trio</p>
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
          </FadeIn>
        </div>
      </section>

      {/* ── ZONA 4: Estratégia ── */}
      <section>
        <FadeIn delay={0.14}>
          <ZoneLabel label="Estratégia" title="Mapa, Evolução e Impacto" />
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">

          {/* Map Pool */}
          <FadeIn delay={0.15}>
            <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/70">Map Pool</p>
                <p className="text-sm font-bold text-white mt-0.5">Winrate por mapa</p>
              </div>
              <div className="p-4">
                <MapWinrateChart data={mapWinrates} />
                <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-white/[0.04]">
                  {bestMap && (
                    <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-status-good/5 border border-status-good/10">
                      <span className="flex items-center gap-1.5 text-status-good font-semibold">
                        <Flame className="size-3" /> Melhor
                      </span>
                      <span className="text-white font-bold">{bestMap.map} {bestMap.winrate.toFixed(0)}%</span>
                    </div>
                  )}
                  {worstMap && (
                    <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-status-critical/5 border border-status-critical/10">
                      <span className="flex items-center gap-1.5 text-status-critical font-semibold">
                        <ShieldAlert className="size-3" /> Crítico
                      </span>
                      <span className="text-white font-bold">{worstMap.map} {worstMap.winrate.toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Evolução Recente */}
          <FadeIn delay={0.16}>
            <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/70">Evolução</p>
                  <p className="text-sm font-bold text-white mt-0.5">Tendência recente</p>
                </div>
                <TrendingUp className="size-3.5 text-accent-cyan/70" />
              </div>
              <div className="divide-y divide-white/[0.04]">
                {momentum.map((entry) => {
                  const isUp = entry.status === "up";
                  const isDown = entry.status === "down";
                  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
                  const colorClass = isUp ? "text-status-good" : isDown ? "text-status-critical" : "text-muted-foreground/40";
                  return (
                    <div key={entry.player.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{entry.player.nickname}</p>
                          <p className="text-[10px] text-muted-foreground/60">{entry.ratingChangeText} rating</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 shrink-0 text-[11px] font-black ${colorClass}`}>
                        <Icon className="size-3.5" />
                        {entry.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </FadeIn>

          {/* Impacto */}
          <FadeIn delay={0.17}>
            <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/70">Impacto</p>
                  <p className="text-sm font-bold text-white mt-0.5">Rounds decisivos</p>
                </div>
                <Flame className="size-3.5 text-status-warning/70" />
              </div>
              <div className="divide-y divide-white/[0.04]">
                {decisive.map((entry) => (
                  <div key={entry.player.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{entry.player.nickname}</p>
                        <p className="text-[10px] text-muted-foreground/60">
                          {entry.entryKills} aberturas{!entry.hideTradesAndClutches && ` · ${entry.clutchWins} clutches`}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-accent-cyan shrink-0">{entry.impactPercent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Identidades + Especialistas */}
          <FadeIn delay={0.18}>
            <div className="flex flex-col gap-3">
              <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.05]">
                  <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/70">Identidades</p>
                  <p className="text-sm font-bold text-white mt-0.5">Perfil tático</p>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {archetypes.slice(0, 4).map((entry) => (
                    <div key={entry.player.id} className="px-5 py-3 flex items-center justify-between gap-3">
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
                  <div className="px-5 py-4 border-b border-white/[0.05]">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/70">Especialistas</p>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {mapSpecialists.slice(0, 4).map((ms) => (
                      <div key={ms.mapName} className="px-5 py-2.5 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground/70 capitalize">{ms.mapName}</span>
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
          </FadeIn>
        </div>
      </section>

      {/* ── Coach IA (Premium) ── */}
      <FadeIn delay={0.2}>
        <div className="relative">
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-primary/15 via-accent-violet/8 to-transparent pointer-events-none" />
          <CoachReportCard apiUrl="/api/coach/dashboard" />
        </div>
      </FadeIn>

      {/* ── ZONA 5: Histórico ── */}
      <section>
        <FadeIn delay={0.22}>
          <ZoneLabel label="Histórico" title="Recordes, Conquistas e Partidas" />
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">

          {/* Recordes */}
          <FadeIn delay={0.23}>
            <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/70">Recordes</p>
                <p className="text-sm font-bold text-white mt-0.5">Melhores momentos</p>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {records.map((r, idx) => (
                  <div key={idx} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[8px] uppercase tracking-widest text-muted-foreground/50 font-bold">{r.category}</p>
                      <p className="text-xs font-bold text-white mt-0.5 truncate">
                        {r.playerName} <span className="text-muted-foreground/60 font-normal">({r.detail})</span>
                      </p>
                    </div>
                    <span className="text-sm font-black text-accent-cyan shrink-0 tabular-nums">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Conquistas */}
          <FadeIn delay={0.24}>
            <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/70">Conquistas</p>
                <p className="text-sm font-bold text-white mt-0.5">Desbloqueadas recentemente</p>
              </div>
              {recentAchievements.length === 0 ? (
                <p className="text-muted-foreground/50 py-10 text-center text-sm">Nenhuma conquista ainda.</p>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {recentAchievements.map((entry) => (
                    <AchievementFeedItem key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          </FadeIn>

          {/* Últimas Partidas */}
          <FadeIn delay={0.25}>
            <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05]">
                <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/70">Últimas Partidas</p>
                <p className="text-sm font-bold text-white mt-0.5">Resultados recentes</p>
              </div>
              {recentMatches.length === 0 ? (
                <p className="text-muted-foreground/50 py-10 text-center text-sm">Nenhuma partida sincronizada.</p>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {recentMatches.slice(0, 4).map((match) => (
                    <MatchRow key={match.id} match={match} />
                  ))}
                </div>
              )}
              <div className="px-5 py-3.5 border-t border-white/[0.04]">
                <Link href="/sessions" className="text-xs text-primary/80 hover:text-primary transition-colors font-semibold inline-flex items-center gap-1.5 group">
                  Ver todas as sessões
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
