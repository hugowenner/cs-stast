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
import { Trophy, TrendingUp, TrendingDown, Minus, Flame, ShieldAlert, ArrowRight } from "lucide-react";

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
    <div className="flex flex-col gap-5">

      {/* 1 — Season Banner */}
      <FadeIn>
        <SeasonHero
          seasonLabel={SEASON_LABEL}
          totalMatches={summary.totalMatches}
          bestPlayer={summary.bestPlayer}
          communityWinrate={summary.community.avgWinrate}
          dominantMap={summary.dominantMap}
        />
      </FadeIn>

      {/* 2 — Métricas da comunidade */}
      <FadeIn delay={0.03}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Winrate Geral", value: `${summary.community.avgWinrate}%`, color: "text-accent-cyan" },
            { label: "Média de Kills", value: `${summary.community.avgKills}`, color: "text-white" },
            { label: "HS Médio", value: `${summary.community.avgHsPercent}%`, color: "text-white" },
            { label: "Rounds Jogados", value: summary.community.totalRounds.toLocaleString("pt-BR"), color: "text-white" },
          ].map((stat) => (
            <div key={stat.label} className="glass-panel rounded-xl border border-white/5 bg-white/[0.01] px-4 py-3.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{stat.label}</p>
              <p className={`text-2xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </FadeIn>

      {/* 3 — RIVALIDADES (destaque principal) */}
      <FadeIn delay={0.06}>
        <section className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-accent-violet/5 to-transparent">
            <div>
              <h2 className="text-sm font-bold text-white">Confrontos Diretos</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Rivalidades, histórico e vantagem head-to-head</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent-violet bg-accent-violet/10 border border-accent-violet/20 px-2.5 py-1 rounded-full">
              H2H
            </span>
          </div>
          {topRivalries.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">Ainda não há confrontos suficientes para formar rivalidades.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {topRivalries.map((rivalry) => (
                <RivalryRow key={rivalry.id} rivalry={rivalry} />
              ))}
            </div>
          )}
        </section>
      </FadeIn>

      {/* 4 — Power Ranking + Jogador da Semana */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

        {/* Power Ranking — 2 colunas */}
        <FadeIn delay={0.09} className="lg:col-span-2">
          <section className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">Power Ranking</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Rating · Impacto · Winrate · ADR · KAST</p>
              </div>
              <Trophy className="size-4 text-status-warning" />
            </div>
            <div className="divide-y divide-white/5">
              {powerRanking.map((entry, index) => {
                const medals = ["1°", "2°", "3°"];
                const isTop3 = index < 3;
                return (
                  <div key={entry.player.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/[0.015] transition-colors">
                    <span className={`text-xs font-black w-5 shrink-0 text-center ${isTop3 ? "text-status-warning" : "text-muted-foreground"}`}>
                      {isTop3 ? medals[index] : `${index + 1}°`}
                    </span>
                    <Link href={`/players/${entry.player.id}`} className="flex items-center gap-2.5 min-w-0 flex-1 group">
                      <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">{entry.player.nickname}</p>
                        <p className="text-[10px] text-muted-foreground">{entry.forma} · {entry.levelLabel}</p>
                      </div>
                    </Link>
                    <div className="hidden sm:grid grid-cols-4 gap-4 text-center text-xs shrink-0">
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase font-semibold">Rating</p>
                        <p className="font-bold text-white mt-0.5">{entry.rating.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase font-semibold">KAST</p>
                        <p className="font-bold text-white mt-0.5">{entry.kast}%</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase font-semibold">WR</p>
                        <p className="font-bold text-white mt-0.5">{entry.winrate}%</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase font-semibold">Score</p>
                        <p className="font-bold text-accent-violet mt-0.5">{entry.powerScore}</p>
                      </div>
                    </div>
                    <div className="sm:hidden text-right shrink-0">
                      <p className="text-xs font-black text-accent-violet">{entry.powerScore}</p>
                      <p className="text-[9px] text-muted-foreground">Score</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </FadeIn>

        {/* Jogador da Semana — 1 coluna */}
        <FadeIn delay={0.1}>
          <div className="flex flex-col gap-4">
            {jogadorDaSemana && (
              <section className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-primary/5 to-transparent">
                  <h2 className="text-sm font-bold text-white">Jogador da Semana</h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Melhor desempenho recente</p>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3">
                    <PlayerAvatar nickname={jogadorDaSemana.player.nickname} avatarUrl={jogadorDaSemana.player.avatarUrl} size="lg" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/players/${jogadorDaSemana.player.id}`} className="text-base font-black text-white hover:text-primary transition-colors block truncate">
                        {jogadorDaSemana.player.nickname}
                      </Link>
                      <span className="text-[10px] text-status-good font-bold bg-status-good/10 px-2 py-0.5 rounded-md border border-status-good/15 mt-1 inline-block">
                        {jogadorDaSemana.evolutionText}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/5">
                    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5 text-center">
                      <p className="text-[9px] uppercase font-semibold text-muted-foreground">Rating</p>
                      <p className="text-base font-black text-white mt-0.5">{jogadorDaSemana.rating.toFixed(2)}</p>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5 text-center">
                      <p className="text-[9px] uppercase font-semibold text-muted-foreground">Winrate</p>
                      <p className="text-base font-black text-white mt-0.5">{jogadorDaSemana.winrate}%</p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Duo destaque */}
            {duos.length > 0 && (
              <section className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5">
                  <h2 className="text-sm font-bold text-white">Melhor Parceria</h2>
                </div>
                <div className="p-4 flex flex-col gap-3">
                  {duos.slice(0, 2).map((d) => (
                    <div key={`${d.playerA.id}-${d.playerB.id}`} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex -space-x-1.5 shrink-0">
                          <PlayerAvatar nickname={d.playerA.nickname} avatarUrl={d.playerA.avatarUrl} size="sm" />
                          <PlayerAvatar nickname={d.playerB.nickname} avatarUrl={d.playerB.avatarUrl} size="sm" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{d.playerA.nickname} + {d.playerB.nickname}</p>
                          <p className="text-[10px] text-muted-foreground">{d.total} partidas juntos</p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-status-good shrink-0">{d.winrate}%</span>
                    </div>
                  ))}
                  {dominantTrio && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex -space-x-2 shrink-0">
                          {dominantTrio.players.map((p) => (
                            <PlayerAvatar key={p.id} nickname={p.nickname} avatarUrl={p.avatarUrl} size="sm" />
                          ))}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{dominantTrio.players.map((p) => p.nickname).join(" · ")}</p>
                          <p className="text-[10px] text-muted-foreground">{dominantTrio.total} partidas · trio</p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-status-good shrink-0">{dominantTrio.winrate}%</span>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </FadeIn>
      </div>

      {/* 5 — Momento + Decisivos + Map Pool */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">

        {/* Momento dos Jogadores */}
        <FadeIn delay={0.12}>
          <section className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Evolução Recente</h2>
              <TrendingUp className="size-4 text-accent-cyan" />
            </div>
            <div className="divide-y divide-white/5">
              {momentum.map((entry) => {
                const isUp = entry.status === "up";
                const isDown = entry.status === "down";
                const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
                const colorClass = isUp ? "text-status-good" : isDown ? "text-status-critical" : "text-muted-foreground";
                return (
                  <div key={entry.player.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{entry.player.nickname}</p>
                        <p className="text-[10px] text-muted-foreground">{entry.ratingChangeText} rating</p>
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
          </section>
        </FadeIn>

        {/* Jogadores Decisivos */}
        <FadeIn delay={0.13}>
          <section className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Impacto por Round</h2>
              <Flame className="size-4 text-status-warning" />
            </div>
            <div className="divide-y divide-white/5">
              {decisive.map((entry) => (
                <div key={entry.player.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{entry.player.nickname}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {entry.entryKills} aberturas
                        {!entry.hideTradesAndClutches && ` · ${entry.clutchWins} clutches`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-accent-cyan shrink-0">{entry.impactPercent}%</span>
                </div>
              ))}
            </div>
          </section>
        </FadeIn>

        {/* Map Pool */}
        <FadeIn delay={0.14}>
          <section className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h2 className="text-sm font-bold text-white">Map Pool</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Winrate por mapa</p>
            </div>
            <div className="p-4">
              <MapWinrateChart data={mapWinrates} />
              <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-white/5">
                {bestMap && (
                  <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-status-good/5 border border-status-good/10">
                    <span className="flex items-center gap-1.5 text-status-good font-semibold">
                      <Flame className="size-3" /> Melhor
                    </span>
                    <span className="text-white font-medium">{bestMap.map} · {bestMap.winrate.toFixed(0)}%</span>
                  </div>
                )}
                {worstMap && (
                  <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-status-critical/5 border border-status-critical/10">
                    <span className="flex items-center gap-1.5 text-status-critical font-semibold">
                      <ShieldAlert className="size-3" /> Crítico
                    </span>
                    <span className="text-white font-medium">{worstMap.map} · {worstMap.winrate.toFixed(0)}%</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        </FadeIn>
      </div>

      {/* 6 — Identidades Táticas + Matchups + Especialistas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">

        <FadeIn delay={0.16}>
          <section className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h2 className="text-sm font-bold text-white">Identidades Táticas</h2>
            </div>
            <div className="divide-y divide-white/5">
              {archetypes.slice(0, 4).map((entry) => (
                <div key={entry.player.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{entry.player.nickname}</p>
                      <p className="text-[10px] text-accent-violet font-semibold">{entry.label}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground text-right shrink-0">{entry.metricValue}</span>
                </div>
              ))}
            </div>
          </section>
        </FadeIn>

        <FadeIn delay={0.17}>
          <section className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h2 className="text-sm font-bold text-white">Domínio e Karma</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Quem domina e quem sofre</p>
            </div>
            <div className="divide-y divide-white/5">
              {matchups.slice(0, 4).map((m) => {
                if (!m.dominates && !m.struggles) return null;
                return (
                  <div key={m.player.id} className="px-5 py-3 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <PlayerAvatar nickname={m.player.nickname} avatarUrl={m.player.avatarUrl} size="sm" />
                      <span className="text-xs font-bold text-white">{m.player.nickname}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 text-[10px] pl-7">
                      {m.dominates && (
                        <span className="text-status-good">Domina: <span className="font-semibold">{m.dominates.rivalName}</span></span>
                      )}
                      {m.struggles && (
                        <span className="text-status-critical">Sofre de: <span className="font-semibold">{m.struggles.rivalName}</span></span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </FadeIn>

        <FadeIn delay={0.18}>
          <section className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h2 className="text-sm font-bold text-white">Especialistas de Mapas</h2>
            </div>
            <div className="divide-y divide-white/5">
              {mapSpecialists.map((ms) => (
                <div key={ms.mapName} className="px-5 py-3 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-white capitalize">{ms.mapName}</span>
                  <div className="flex items-center gap-2">
                    <PlayerAvatar nickname={ms.player.nickname} avatarUrl={ms.player.avatarUrl} size="sm" />
                    <span className="text-[11px] font-bold text-white">{ms.player.nickname}</span>
                    <span className="text-[10px] text-accent-violet font-semibold">{ms.rating.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </FadeIn>
      </div>

      {/* 7 — Coach IA (destaque premium, full width) */}
      <FadeIn delay={0.2}>
        <div className="relative">
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-primary/20 via-accent-violet/10 to-transparent pointer-events-none" />
          <CoachReportCard apiUrl="/api/coach/dashboard" />
        </div>
      </FadeIn>

      {/* 8 — Recordes + Conquistas + Últimas Partidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">

        <FadeIn delay={0.22}>
          <section className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h2 className="text-sm font-bold text-white">Recordes</h2>
            </div>
            <div className="divide-y divide-white/5">
              {records.map((r, idx) => (
                <div key={idx} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">{r.category}</p>
                    <p className="text-xs font-bold text-white mt-0.5 truncate">{r.playerName} <span className="text-muted-foreground font-normal">({r.detail})</span></p>
                  </div>
                  <span className="text-sm font-black text-accent-cyan shrink-0">{r.value}</span>
                </div>
              ))}
            </div>
          </section>
        </FadeIn>

        <FadeIn delay={0.23}>
          <section className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h2 className="text-sm font-bold text-white">Conquistas Recentes</h2>
            </div>
            {recentAchievements.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">Nenhuma conquista ainda.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {recentAchievements.map((entry) => (
                  <AchievementFeedItem key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </section>
        </FadeIn>

        <FadeIn delay={0.24}>
          <section className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h2 className="text-sm font-bold text-white">Últimas Partidas</h2>
            </div>
            {recentMatches.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">Nenhuma partida sincronizada.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {recentMatches.slice(0, 4).map((match) => (
                  <MatchRow key={match.id} match={match} />
                ))}
              </div>
            )}
            <div className="px-5 py-3 border-t border-white/5">
              <Link href="/sessions" className="text-xs text-primary hover:underline font-semibold inline-flex items-center gap-1 group">
                Ver todas as sessões
                <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </section>
        </FadeIn>
      </div>

    </div>
  );
}
