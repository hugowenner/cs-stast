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
  Handshake,
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

  const { powerRanking, momentum, decisive, archetypes, jogadorDaSemana, duos, dominantTrio, records } = competitive;

  const sortedMaps = [...mapWinrates].sort((a, b) => b.winrate - a.winrate);
  const bestMap = sortedMaps.find((m) => m.matchesPlayed >= 2) ?? null;
  const worstMap = [...mapWinrates].filter((m) => m.matchesPlayed >= 2).sort((a, b) => a.winrate - b.winrate)[0] ?? null;

  const hottestPlayer = momentum.find((m) => m.status === "up") ?? null;

  // Top rivalry e top duo para os cards em destaque
  const featuredRivalry = topRivalries.find((r) => r.matchesAgainst >= 3) ?? topRivalries[0] ?? null;
  const remainingRivalries = topRivalries.filter((r) => r !== featuredRivalry);
  const featuredDuo = duos[0] ?? null;

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

        {/* 3 stat tiles — apenas o que o hero não repete */}
        <FadeIn delay={0.03}>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: "Média de Kills", value: `${summary.community.avgKills}` },
              { label: "HS Médio", value: `${summary.community.avgHsPercent}%` },
              { label: "Rounds Jogados", value: summary.community.totalRounds.toLocaleString("pt-BR") },
            ].map((stat) => (
              <div key={stat.label} className="glass-panel rounded-xl border border-white/[0.06] px-4 py-3 text-center">
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground/50 font-bold">{stat.label}</p>
                <p className="text-lg font-black text-white mt-1">{stat.value}</p>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* 3 insights narrativos — remove Líder (= MVP do hero) */}
        {(hottestPlayer || bestMap || worstMap) && (
          <FadeIn delay={0.05}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {hottestPlayer && (
                <div className="glass-panel rounded-xl border border-status-good/20 bg-status-good/[0.03] px-4 py-3.5 flex items-center gap-3">
                  <Zap className="size-4 text-status-good shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-status-good/70">Em ascensão</p>
                    <p className="text-sm font-black text-white truncate mt-0.5">{hottestPlayer.player.nickname}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{hottestPlayer.ratingChangeText} nas últimas partidas</p>
                  </div>
                </div>
              )}
              {bestMap && (
                <div className="glass-panel rounded-xl border border-accent-cyan/20 bg-accent-cyan/[0.03] px-4 py-3.5 flex items-center gap-3">
                  <Map className="size-4 text-accent-cyan shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-accent-cyan/70">Mapa forte</p>
                    <p className="text-sm font-black text-white mt-0.5">{bestMap.map}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{bestMap.winrate.toFixed(0)}% winrate · {bestMap.matchesPlayed} partidas</p>
                  </div>
                </div>
              )}
              {worstMap && (
                <div className="glass-panel rounded-xl border border-status-critical/20 bg-status-critical/[0.03] px-4 py-3.5 flex items-center gap-3">
                  <AlertTriangle className="size-4 text-status-critical shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-status-critical/70">Evitar no veto</p>
                    <p className="text-sm font-black text-white mt-0.5">{worstMap.map}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{worstMap.winrate.toFixed(0)}% winrate · ponto crítico</p>
                  </div>
                </div>
              )}
            </div>
          </FadeIn>
        )}
      </section>

      {/* ═══ ZONA 2 — Confrontos (feature section) ═══ */}
      <section>
        <FadeIn delay={0.07}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/50">Confrontos e Parcerias</p>
            <Link href="/compare" className="text-[10px] text-primary/60 hover:text-primary transition-colors font-semibold inline-flex items-center gap-1 group">
              Scout H2H completo <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </FadeIn>

        {/* Cards em destaque: rivalidade + parceria */}
        {(featuredRivalry || featuredDuo) && (
          <FadeIn delay={0.08}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

              {/* Featured Rivalry */}
              {featuredRivalry && (() => {
                const aLeads = featuredRivalry.winsA > featuredRivalry.winsB;
                const bLeads = featuredRivalry.winsB > featuredRivalry.winsA;
                const leader = aLeads ? featuredRivalry.playerA.nickname : bLeads ? featuredRivalry.playerB.nickname : null;
                const leaderWins = aLeads ? featuredRivalry.winsA : featuredRivalry.winsB;
                const total = featuredRivalry.matchesAgainst;
                return (
                  <div className="glass-panel rounded-2xl border border-accent-violet/20 bg-accent-violet/[0.02] overflow-hidden">
                    <div className="px-5 pt-4 pb-3 border-b border-white/[0.05] flex items-center gap-2">
                      <Swords className="size-3.5 text-accent-violet" />
                      <p className="text-[9px] uppercase tracking-widest font-bold text-accent-violet/80">Rivalidade</p>
                      <span className="ml-auto text-[9px] text-muted-foreground/50 font-medium">{total} confrontos</span>
                    </div>

                    {/* Jogadores */}
                    <div className="px-5 py-5 flex items-center gap-4">
                      <div className={`flex flex-col items-center gap-2 flex-1 ${aLeads ? "" : "opacity-60"}`}>
                        <PlayerAvatar nickname={featuredRivalry.playerA.nickname} avatarUrl={featuredRivalry.playerA.avatarUrl} size="lg" />
                        <p className="text-sm font-black text-white text-center truncate max-w-full">{featuredRivalry.playerA.nickname}</p>
                        <span className={`text-2xl font-black tabular-nums ${aLeads ? "text-white" : "text-muted-foreground/40"}`}>{featuredRivalry.winsA}</span>
                      </div>

                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <span className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest">vs</span>
                      </div>

                      <div className={`flex flex-col items-center gap-2 flex-1 ${bLeads ? "" : "opacity-60"}`}>
                        <PlayerAvatar nickname={featuredRivalry.playerB.nickname} avatarUrl={featuredRivalry.playerB.avatarUrl} size="lg" />
                        <p className="text-sm font-black text-white text-center truncate max-w-full">{featuredRivalry.playerB.nickname}</p>
                        <span className={`text-2xl font-black tabular-nums ${bLeads ? "text-white" : "text-muted-foreground/40"}`}>{featuredRivalry.winsB}</span>
                      </div>
                    </div>

                    {/* Barra de domínio */}
                    <div className="px-5 pb-4 flex flex-col gap-3">
                      <div className="relative h-1 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-accent-violet transition-all"
                          style={{ width: `${featuredRivalry.winrateA}%` }}
                        />
                      </div>

                      {/* Contexto narrativo */}
                      <div className="flex flex-col gap-2 pt-1 border-t border-white/[0.05]">
                        {leader && (
                          <p className="text-[10px] text-muted-foreground/70">
                            <span className="text-white font-bold">{leader}</span> venceu{" "}
                            <span className="text-white font-bold">{leaderWins} de {total}</span> confrontos
                            {total >= 5 && ` (${Math.round((leaderWins / total) * 100)}%)`}
                          </p>
                        )}
                        {featuredRivalry.lastMatch && (
                          <p className="text-[10px] text-muted-foreground/50">
                            Último: <span className="text-white/70 capitalize">{featuredRivalry.lastMatch.mapName}</span>
                            {" "}· {featuredRivalry.lastMatch.scoreA}–{featuredRivalry.lastMatch.scoreB}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Featured Partnership */}
              {featuredDuo && (
                <div className="glass-panel rounded-2xl border border-status-good/15 bg-status-good/[0.02] overflow-hidden">
                  <div className="px-5 pt-4 pb-3 border-b border-white/[0.05] flex items-center gap-2">
                    <Handshake className="size-3.5 text-status-good" />
                    <p className="text-[9px] uppercase tracking-widest font-bold text-status-good/80">Melhor Parceria</p>
                    <span className="ml-auto text-[9px] text-muted-foreground/50 font-medium">{featuredDuo.total} partidas</span>
                  </div>

                  {/* Jogadores */}
                  <div className="px-5 py-5 flex items-center justify-center gap-6">
                    <div className="flex flex-col items-center gap-2">
                      <PlayerAvatar nickname={featuredDuo.playerA.nickname} avatarUrl={featuredDuo.playerA.avatarUrl} size="lg" />
                      <p className="text-sm font-black text-white text-center truncate max-w-[100px]">{featuredDuo.playerA.nickname}</p>
                    </div>
                    <span className="text-muted-foreground/30 text-lg font-light">+</span>
                    <div className="flex flex-col items-center gap-2">
                      <PlayerAvatar nickname={featuredDuo.playerB.nickname} avatarUrl={featuredDuo.playerB.avatarUrl} size="lg" />
                      <p className="text-sm font-black text-white text-center truncate max-w-[100px]">{featuredDuo.playerB.nickname}</p>
                    </div>
                  </div>

                  {/* Stats da parceria */}
                  <div className="px-5 pb-5 flex flex-col gap-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/[0.03] border border-white/[0.05] rounded-lg p-2.5 text-center">
                        <p className="text-[8px] uppercase tracking-widest text-muted-foreground/50 font-bold">Partidas</p>
                        <p className="text-base font-black text-white mt-1">{featuredDuo.total}</p>
                      </div>
                      <div className="bg-white/[0.03] border border-white/[0.05] rounded-lg p-2.5 text-center">
                        <p className="text-[8px] uppercase tracking-widest text-muted-foreground/50 font-bold">Vitórias</p>
                        <p className="text-base font-black text-status-good mt-1">{featuredDuo.wins}</p>
                      </div>
                      <div className="bg-white/[0.03] border border-white/[0.05] rounded-lg p-2.5 text-center">
                        <p className="text-[8px] uppercase tracking-widest text-muted-foreground/50 font-bold">Winrate</p>
                        <p className="text-base font-black text-white mt-1">{featuredDuo.winrate}%</p>
                      </div>
                    </div>

                    {/* Segundo duo e trio como linhas secundárias */}
                    {duos[1] && (
                      <div className="pt-3 border-t border-white/[0.05] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex -space-x-2 shrink-0">
                            <PlayerAvatar nickname={duos[1].playerA.nickname} avatarUrl={duos[1].playerA.avatarUrl} size="sm" />
                            <PlayerAvatar nickname={duos[1].playerB.nickname} avatarUrl={duos[1].playerB.avatarUrl} size="sm" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white/80 truncate">{duos[1].playerA.nickname} + {duos[1].playerB.nickname}</p>
                            <p className="text-[10px] text-muted-foreground/50">{duos[1].total} partidas</p>
                          </div>
                        </div>
                        <span className="text-sm font-black text-status-good shrink-0">{duos[1].winrate}%</span>
                      </div>
                    )}
                    {dominantTrio && (
                      <div className={`flex items-center justify-between gap-2 ${duos[1] ? "" : "pt-3 border-t border-white/[0.05]"}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex -space-x-2 shrink-0">
                            {dominantTrio.players.map((p) => (
                              <PlayerAvatar key={p.id} nickname={p.nickname} avatarUrl={p.avatarUrl} size="sm" />
                            ))}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white/80 truncate">{dominantTrio.players.map((p) => p.nickname).join(" · ")}</p>
                            <p className="text-[10px] text-muted-foreground/50">{dominantTrio.total} partidas · trio</p>
                          </div>
                        </div>
                        <span className="text-sm font-black text-status-good shrink-0">{dominantTrio.winrate}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </FadeIn>
        )}

        {/* Tabela compacta: rivalidades restantes */}
        {remainingRivalries.length > 0 && (
          <FadeIn delay={0.1}>
            <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="hidden sm:grid grid-cols-[1fr_auto_1fr_auto] gap-x-4 px-5 py-2 bg-white/[0.01] border-b border-white/[0.03]">
                <span className="text-[8px] uppercase tracking-widest text-muted-foreground/35 font-bold">Jogador A</span>
                <span className="text-[8px] uppercase tracking-widest text-muted-foreground/35 font-bold text-center w-20">H2H</span>
                <span className="text-[8px] uppercase tracking-widest text-muted-foreground/35 font-bold text-right">Jogador B</span>
                <span className="text-[8px] uppercase tracking-widest text-muted-foreground/35 font-bold text-right">Último mapa</span>
              </div>
              <div className="divide-y divide-white/[0.035]">
                {remainingRivalries.map((r) => {
                  const aLeads = r.winsA > r.winsB;
                  const bLeads = r.winsB > r.winsA;
                  return (
                    <div key={r.id} className="px-5 py-3 flex items-center gap-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <PlayerAvatar nickname={r.playerA.nickname} avatarUrl={r.playerA.avatarUrl} size="sm" />
                        <span className={`text-xs font-bold truncate ${aLeads ? "text-white" : "text-muted-foreground/50"}`}>{r.playerA.nickname}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 w-20 justify-center">
                        <span className={`text-sm font-black tabular-nums ${aLeads ? "text-white" : "text-muted-foreground/35"}`}>{r.winsA}</span>
                        <span className="text-[10px] text-muted-foreground/25">×</span>
                        <span className={`text-sm font-black tabular-nums ${bLeads ? "text-white" : "text-muted-foreground/35"}`}>{r.winsB}</span>
                      </div>
                      <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                        <span className={`text-xs font-bold truncate text-right ${bLeads ? "text-white" : "text-muted-foreground/50"}`}>{r.playerB.nickname}</span>
                        <PlayerAvatar nickname={r.playerB.nickname} avatarUrl={r.playerB.avatarUrl} size="sm" />
                      </div>
                      {r.lastMatch ? (
                        <div className="hidden sm:flex items-center gap-1.5 text-[9px] text-muted-foreground/45 shrink-0 w-24 justify-end">
                          <span className="capitalize truncate">{r.lastMatch.mapName}</span>
                          <span className="font-bold tabular-nums">{r.lastMatch.scoreA}–{r.lastMatch.scoreB}</span>
                        </div>
                      ) : <div className="hidden sm:block w-24" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </FadeIn>
        )}
      </section>

      {/* ═══ ZONA 3 — Performance ═══ */}
      <section>
        <FadeIn delay={0.12}>
          <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/50 mb-4">Performance</p>
        </FadeIn>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

          {/* Power Ranking */}
          <FadeIn delay={0.13} className="lg:col-span-2">
            <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Power Ranking</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">Quem domina a temporada</p>
                </div>
                <Trophy className="size-4 text-status-warning/60" />
              </div>
              <div className="divide-y divide-white/[0.04]">
                {powerRanking.map((entry, index) => {
                  const isTop3 = index < 3;
                  const podiumColors = ["text-yellow-400", "text-slate-400", "text-amber-600"];
                  return (
                    <div key={entry.player.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/[0.012] transition-colors">
                      <span className={`text-xs font-black w-5 shrink-0 text-center tabular-nums ${isTop3 ? podiumColors[index] : "text-muted-foreground/25"}`}>
                        {index + 1}
                      </span>
                      <Link href={`/players/${entry.player.id}`} className="flex items-center gap-2.5 min-w-0 flex-1 group">
                        <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">{entry.player.nickname}</p>
                          <p className="text-[10px] text-muted-foreground/45">{entry.levelLabel}</p>
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
                            <p className="text-[8px] uppercase tracking-widest text-muted-foreground/35 font-bold">{col.label}</p>
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
          </FadeIn>

          {/* Jogador da Semana */}
          <FadeIn delay={0.14}>
            {jogadorDaSemana ? (
              <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
                <div className="px-5 pt-5 pb-5">
                  <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/50 mb-4">Jogador da Semana</p>
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
                    <div className="bg-white/[0.025] border border-white/[0.05] rounded-xl p-3 text-center">
                      <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/45">Rating</p>
                      <p className="text-xl font-black text-white mt-1">{jogadorDaSemana.rating.toFixed(2)}</p>
                    </div>
                    <div className="bg-white/[0.025] border border-white/[0.05] rounded-xl p-3 text-center">
                      <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/45">Winrate</p>
                      <p className="text-xl font-black text-white mt-1">{jogadorDaSemana.winrate}%</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-panel rounded-2xl border border-white/[0.07] p-8 text-center">
                <p className="text-xs text-muted-foreground/40">Sem destaques esta semana.</p>
              </div>
            )}
          </FadeIn>
        </div>
      </section>

      {/* ═══ ZONA 4 — Estratégia ═══ */}
      <section>
        <FadeIn delay={0.16}>
          <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/50 mb-4">Estratégia</p>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">

          {/* Map Pool */}
          <FadeIn delay={0.17}>
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
          </FadeIn>

          {/* Evolução + Impacto — fundidos em um card só */}
          <FadeIn delay={0.18}>
            <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
                <p className="text-sm font-bold text-white">Evolução e Impacto</p>
                <TrendingUp className="size-3.5 text-accent-cyan/50" />
              </div>
              <div className="divide-y divide-white/[0.04]">
                {momentum.map((entry) => {
                  const isUp = entry.status === "up";
                  const isDown = entry.status === "down";
                  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
                  const colorClass = isUp ? "text-status-good" : isDown ? "text-status-critical" : "text-muted-foreground/25";
                  // Encontra entrada de impacto correspondente para o mesmo jogador
                  const impactEntry = decisive.find((d) => d.player.id === entry.player.id);
                  return (
                    <div key={entry.player.id} className="px-5 py-3 flex items-center gap-3">
                      <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{entry.player.nickname}</p>
                        <p className="text-[10px] text-muted-foreground/50">{entry.ratingChangeText} rating</p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <div className={`flex items-center gap-1 text-[10px] font-black ${colorClass}`}>
                          <Icon className="size-3" />
                          {entry.label}
                        </div>
                        {impactEntry && (
                          <span className="text-[9px] text-accent-cyan/70 font-semibold">{impactEntry.impactPercent}% impacto</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {/* Jogadores sem entrada de momentum mas com impacto */}
                {decisive
                  .filter((d) => !momentum.find((m) => m.player.id === d.player.id))
                  .slice(0, 2)
                  .map((entry) => (
                    <div key={entry.player.id} className="px-5 py-3 flex items-center gap-3">
                      <PlayerAvatar nickname={entry.player.nickname} avatarUrl={entry.player.avatarUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{entry.player.nickname}</p>
                        <p className="text-[10px] text-muted-foreground/50">{entry.entryKills} aberturas{!entry.hideTradesAndClutches && ` · ${entry.clutchWins} clutches`}</p>
                      </div>
                      <span className="text-xs font-black text-accent-cyan shrink-0">{entry.impactPercent}%</span>
                    </div>
                  ))}
              </div>
            </div>
          </FadeIn>

          {/* Perfis Táticos */}
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
                      <p className="text-xs font-bold text-white truncate">{entry.player.nickname}</p>
                      <p className="text-[10px] text-muted-foreground/50">{entry.metricValue}</p>
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
          <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/50 mb-4">Histórico</p>
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
                      <p className="text-[8px] uppercase tracking-widest text-muted-foreground/35 font-bold">{r.category}</p>
                      <p className="text-xs font-bold text-white mt-0.5 truncate">
                        {r.playerName} <span className="text-muted-foreground/45 font-normal text-[10px]">{r.detail}</span>
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
                <p className="text-muted-foreground/35 py-10 text-center text-sm">Nenhuma ainda.</p>
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
                <p className="text-muted-foreground/35 py-10 text-center text-sm">Nenhuma partida.</p>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {recentMatches.map((match) => (
                    <MatchRow key={match.id} match={match} />
                  ))}
                </div>
              )}
              <div className="px-5 py-3.5 border-t border-white/[0.04]">
                <Link href="/sessions" className="text-xs text-primary/60 hover:text-primary transition-colors font-semibold inline-flex items-center gap-1.5 group">
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
