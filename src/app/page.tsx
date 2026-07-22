import { SectionCard } from "@/components/ui/section-card";
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
import { Trophy, TrendingUp, ShieldAlert, Flame, ArrowRight, TrendingDown, Minus, Calendar } from "lucide-react";

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
  const [
    summary,
    recentMatches,
    competitive,
    mapWinrates,
    recentAchievements,
    topRivalries,
  ] = await Promise.all([
    safeQuery(
      () => dashboardService.getDashboardSummary(),
      {
        totalMatches: 0,
        totalPlayers: 0,
        totalSessions: 0,
        latestSession: null,
        community: { avgWinrate: 0, avgKills: 0, avgHsPercent: 0, totalRounds: 0 },
        dominantMap: null,
        bestPlayer: null,
      }
    ),
    safeQuery(() => matchService.listRecentMatches(6), []),
    // Consolidado: 1 fetch de dataset (jogadores + todas as stats) reaproveitado por
    // todos os cálculos abaixo, em vez de cada um consultar o banco separadamente.
    safeQuery(() => competitiveService.getDashboardCompetitiveBundle(), EMPTY_COMPETITIVE_BUNDLE),
    safeQuery(() => statsService.getMapWinrates(), []),
    safeQuery(() => achievementService.listRecent(6), []),
    safeQuery(() => rivalryService.listTopRivalriesWithH2H(4), []),
  ]);

  const {
    powerRanking,
    momentum,
    decisive,
    archetypes,
    matchups,
    jogadorDaSemana,
    duos,
    dominantTrio,
    mapSpecialists,
    weeklyHighlights,
    records,
  } = competitive;

  // Identifica melhor e pior mapa
  const sortedMaps = [...mapWinrates].sort((a, b) => b.winrate - a.winrate);
  const bestMap = sortedMaps.find((m) => m.matchesPlayed >= 1) ?? null;
  const worstMap =
    [...mapWinrates]
      .filter((m) => m.matchesPlayed >= 1)
      .sort((a, b) => a.winrate - b.winrate)[0] ?? null;

  return (
    <div className="flex flex-col gap-4">
      {/* Hero de Temporada (Destaques e MVP) */}
      <FadeIn>
        <SeasonHero
          seasonLabel={SEASON_LABEL}
          totalMatches={summary.totalMatches}
          bestPlayer={summary.bestPlayer}
          communityWinrate={summary.community.avgWinrate}
          dominantMap={summary.dominantMap}
        />
      </FadeIn>

      {/* 🔥 Jornal da Temporada / Destaques da Semana */}
      {weeklyHighlights.length > 0 && (
        <FadeIn delay={0.02}>
          <div className="glass-panel p-4 rounded-xl border border-white/5 bg-gradient-to-br from-white/[0.01] to-transparent flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
              <Calendar className="size-3.5" /> Destaques Recentes (Jornal da Semana)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {weeklyHighlights.slice(0, 3).map((hl) => (
                <div
                  key={hl.id}
                  className="p-3 border border-white/5 bg-white/[0.01] rounded-xl flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider block mb-1">
                      {hl.meta}
                    </span>
                    <h4 className="text-xs font-bold text-white mb-1">{hl.title}</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {hl.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {/* Grid Principal - 12 Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* LADO ESQUERDO: Estatísticas, Rankings, Evolução, Arquétipos, Insights e Rivalidades (8 colunas) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* 1. Estado da Competição */}
          <FadeIn delay={0.05}>
            <SectionCard title="📊 Estado da Competição" variant="highlight">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-1">
                <div className="glass-panel p-3.5 rounded-xl border border-white/5 bg-white/[0.01]">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Winrate Geral</p>
                  <p className="text-xl font-bold mt-1 text-accent-cyan">{summary.community.avgWinrate}%</p>
                </div>
                <div className="glass-panel p-3.5 rounded-xl border border-white/5 bg-white/[0.01]">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Média Kills</p>
                  <p className="text-xl font-bold mt-1 text-white">{summary.community.avgKills}</p>
                </div>
                <div className="glass-panel p-3.5 rounded-xl border border-white/5 bg-white/[0.01]">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">HS Médio</p>
                  <p className="text-xl font-bold mt-1 text-white">{summary.community.avgHsPercent}%</p>
                </div>
                <div className="glass-panel p-3.5 rounded-xl border border-white/5 bg-white/[0.01]">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Rounds Jogados</p>
                  <p className="text-xl font-bold mt-1 text-white">{summary.community.totalRounds.toLocaleString("pt-BR")}</p>
                </div>
              </div>
            </SectionCard>
          </FadeIn>

          {/* 2. Power Ranking da Temporada & Corrida pelo MVP */}
          <FadeIn delay={0.08}>
            <SectionCard title="🏆 Power Ranking & Corrida pelo MVP">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 px-1 font-semibold">
                Score de 0-100 ponderado por Rating (40%), Impacto (20%), Winrate (20%), ADR (10%) e KAST (10%)
              </p>
              <div className="flex flex-col gap-3">
                {powerRanking.map((entry, index) => {
                  const medals = ["🥇", "🥈", "🥉"];
                  const isTop3 = index < 3;
                  return (
                    <div
                      key={entry.player.id}
                      className="glass-panel p-4 rounded-xl border border-white/5 bg-gradient-to-r from-white/[0.01] to-transparent flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-muted-foreground w-5 text-center">
                            {isTop3 ? medals[index] : index + 1}
                          </span>
                          <Link href={`/players/${entry.player.id}`} className="flex items-center gap-2 group">
                            <PlayerAvatar
                              nickname={entry.player.nickname}
                              avatarUrl={entry.player.avatarUrl}
                              size="sm"
                            />
                            <span className="font-bold text-sm text-white group-hover:text-primary transition-colors">
                              {entry.player.nickname}
                            </span>
                          </Link>
                          {index > 0 && powerRanking[0] && (
                            <span className="text-[10px] font-bold text-status-critical bg-status-critical/10 border border-status-critical/15 px-1.5 py-0.5 rounded-md">
                              {entry.powerScore - powerRanking[0].powerScore} pts
                            </span>
                          )}
                          <span className="text-xs ml-1 font-medium bg-white/5 px-2 py-0.5 rounded-md text-muted-foreground hidden sm:inline-block">
                            Forma: {entry.forma}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Power Score</span>
                          <p className="text-lg font-black text-accent-violet">{entry.powerScore} / 100</p>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">{entry.levelLabel}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-5 gap-2 border-t border-white/5 pt-2.5 text-center text-xs">
                        <div>
                          <p className="text-[9px] uppercase font-semibold text-muted-foreground">Rating</p>
                          <p className="font-bold text-white mt-0.5">{entry.rating.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-semibold text-muted-foreground">Impact</p>
                          <p className="font-bold text-white mt-0.5">{entry.impact.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-semibold text-muted-foreground">KAST</p>
                          <p className="font-bold text-white mt-0.5">{entry.kast}%</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-semibold text-muted-foreground">Winrate</p>
                          <p className="font-bold text-white mt-0.5">{entry.winrate}%</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-semibold text-muted-foreground">ADR</p>
                          <p className="font-bold text-white mt-0.5">{entry.adr}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </FadeIn>

          {/* 3. Grid de Momentum e Decisivos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 3a. Momento dos Jogadores */}
            <FadeIn delay={0.1}>
              <SectionCard title="📈 Momento dos Jogadores">
                <div className="flex flex-col gap-3">
                  {momentum.map((entry) => {
                    const isUp = entry.status === "up";
                    const isDown = entry.status === "down";
                    const colorClass = isUp ? "text-status-good" : isDown ? "text-status-critical" : "text-muted-foreground";
                    return (
                      <div
                        key={entry.player.id}
                        className="p-3 border border-white/5 bg-white/[0.01] rounded-xl flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <PlayerAvatar
                              nickname={entry.player.nickname}
                              avatarUrl={entry.player.avatarUrl}
                              size="sm"
                            />
                            <span className="text-sm font-bold text-white truncate">{entry.player.nickname}</span>
                          </div>
                          <span className={`text-[11px] font-black uppercase ${colorClass}`}>{entry.label}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-1.5 mt-0.5 text-[10px] text-muted-foreground">
                          <div>
                            Rating: <span className={`font-semibold ${isUp ? "text-status-good" : isDown ? "text-status-critical" : "text-white"}`}>{entry.ratingChangeText}</span>
                          </div>
                          <div className="text-right">
                            Winrate: <span className={`font-semibold ${entry.recentWinrate > entry.priorWinrate ? "text-status-good" : entry.recentWinrate < entry.priorWinrate ? "text-status-critical" : "text-white"}`}>{entry.winrateChangeText}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            </FadeIn>

            {/* 3b. Jogadores Decisivos (Impacto por Round) */}
            <FadeIn delay={0.12}>
              <SectionCard title="💥 Jogadores Decisivos">
                <div className="flex flex-col gap-3">
                  {decisive.map((entry) => {
                    return (
                      <div
                        key={entry.player.id}
                        className="p-3 border border-white/5 bg-white/[0.01] rounded-xl flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <PlayerAvatar
                              nickname={entry.player.nickname}
                              avatarUrl={entry.player.avatarUrl}
                              size="sm"
                            />
                            <span className="text-sm font-bold text-white truncate">{entry.player.nickname}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-accent-cyan font-bold">{entry.impactPercent}% Rounds Impactados</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-white/5 pt-1.5 mt-0.5">
                          <span>Aberturas: {entry.entryKills}</span>
                          {!entry.hideTradesAndClutches && (
                            <>
                              <span>Trades: {entry.tradeKills}</span>
                              <span>Clutches: {entry.clutchWins}</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            </FadeIn>

          </div>

          {/* 4. Grid de Arquétipos e Matchups */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 4a. Arquétipos Competitivos */}
            <FadeIn delay={0.13}>
              <SectionCard title="🛡️ Identidades Táticas">
                <div className="flex flex-col gap-3">
                  {archetypes.slice(0, 3).map((entry) => {
                    return (
                      <div
                        key={entry.player.id}
                        className="p-3 border border-white/5 bg-white/[0.01] rounded-xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <PlayerAvatar
                            nickname={entry.player.nickname}
                            avatarUrl={entry.player.avatarUrl}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{entry.player.nickname}</p>
                            <p className="text-[11px] text-accent-violet font-semibold mt-0.5">{entry.label}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">{entry.rankText}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[9px] text-muted-foreground block uppercase font-semibold">{entry.metricLabel}</span>
                          <span className="text-xs font-bold text-white mt-0.5">{entry.metricValue}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            </FadeIn>

            {/* 4b. Freguesias e Tabus (Matchups) */}
            <FadeIn delay={0.15}>
              <SectionCard title="⚔️ Freguesias e Tabus">
                <div className="flex flex-col gap-3">
                  {matchups.slice(0, 3).map((m) => {
                    if (!m.dominates && !m.struggles) return null;
                    return (
                      <div
                        key={m.player.id}
                        className="p-3 border border-white/5 bg-white/[0.01] rounded-xl flex flex-col gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <PlayerAvatar
                            nickname={m.player.nickname}
                            avatarUrl={m.player.avatarUrl}
                            size="sm"
                          />
                          <span className="font-bold text-sm text-white">{m.player.nickname}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] border-t border-white/5 pt-2 mt-0.5 text-muted-foreground">
                          {m.dominates ? (
                            <div>
                              <span className="text-status-good font-semibold">🔥 Freguês:</span> {m.dominates.rivalName} ({m.dominates.wins}V - {m.dominates.total - m.dominates.wins}D)
                            </div>
                          ) : (
                            <div className="text-muted-foreground/40">Sem dominância clara</div>
                          )}
                          {m.struggles ? (
                            <div>
                              <span className="text-status-critical font-semibold">💀 Carrasco:</span> {m.struggles.rivalName} ({m.struggles.wins}V - {m.struggles.total - m.struggles.wins}D)
                            </div>
                          ) : (
                            <div className="text-muted-foreground/40">Sem carrasco claro</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            </FadeIn>

          </div>

          {/* 5. Confrontos Quentes (Rivalidades) */}
          <FadeIn delay={0.19}>
            <SectionCard title="⚔️ Confrontos Quentes">
              {topRivalries.length === 0 ? (
                <EmptyState message="Ainda não há confrontos suficientes para formar rivalidades." />
              ) : (
                <div className="flex flex-col divide-y divide-white/5">
                  {topRivalries.map((rivalry) => (
                    <RivalryRow key={rivalry.id} rivalry={rivalry} />
                  ))}
                </div>
              )}
            </SectionCard>
          </FadeIn>

        </div>

        {/* LADO DIREITO: Jogador da Semana, Map Pool, Destaques, Duplas, Trios, Especialistas, Conquistas e Histórico (4 colunas) */}
        <div className="lg:col-span-4 flex flex-col gap-4">

          {/* 1. Jogador da Semana */}
          {jogadorDaSemana && (
            <FadeIn delay={0.21}>
              <SectionCard title="🔥 Jogador da Semana" variant="highlight">
                <div className="flex items-center gap-3 p-1">
                  <PlayerAvatar
                    nickname={jogadorDaSemana.player.nickname}
                    avatarUrl={jogadorDaSemana.player.avatarUrl}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/players/${jogadorDaSemana.player.id}`}
                      className="text-base font-black hover:text-primary transition-colors block text-white"
                    >
                      {jogadorDaSemana.player.nickname}
                    </Link>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 rounded-md px-1.5 py-0.5 font-bold uppercase">
                        Power Score: {jogadorDaSemana.powerScore}
                      </span>
                      <span className="text-[10px] text-status-good font-bold bg-status-good/10 px-2 py-0.5 rounded-md border border-status-good/15">
                        {jogadorDaSemana.evolutionText}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-3 mt-3 text-xs text-muted-foreground">
                  <div className="p-2 bg-white/[0.01] border border-white/5 rounded-lg">
                    <p className="text-[9px] uppercase tracking-wider font-semibold">Rating Recente</p>
                    <p className="text-sm font-bold text-white mt-0.5">{jogadorDaSemana.rating.toFixed(2)}</p>
                  </div>
                  <div className="p-2 bg-white/[0.01] border border-white/5 rounded-lg">
                    <p className="text-[9px] uppercase tracking-wider font-semibold">Winrate Recente</p>
                    <p className="text-sm font-bold text-white mt-0.5">{jogadorDaSemana.winrate}%</p>
                  </div>
                </div>
              </SectionCard>
            </FadeIn>
          )}

          {/* 2. Map Pool */}
          <FadeIn delay={0.23}>
            <SectionCard title="🗺️ Map Pool">
              <MapWinrateChart data={mapWinrates} />
              
              <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-white/5">
                {bestMap && (
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-status-good/5 border border-status-good/10">
                    <span className="flex items-center gap-1.5 text-status-good font-semibold">
                      <Flame className="size-3.5" /> Melhor Mapa
                    </span>
                    <span className="text-white font-medium">
                      {bestMap.map} ({bestMap.winrate.toFixed(1)}% WR)
                    </span>
                  </div>
                )}
                {worstMap && (
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-status-critical/5 border border-status-critical/10">
                    <span className="flex items-center gap-1.5 text-status-critical font-semibold">
                      <ShieldAlert className="size-3.5" /> Mapa Crítico
                    </span>
                    <span className="text-white font-medium">
                      {worstMap.map} ({worstMap.winrate.toFixed(1)}% WR)
                    </span>
                  </div>
                )}
              </div>
            </SectionCard>
          </FadeIn>

          {/* 3. Melhores Parcerias */}
          <FadeIn delay={0.25}>
            <SectionCard title="🤝 Melhores Parcerias">
              {duos.length === 0 ? (
                <EmptyState message="Sem duplas com dados suficientes." />
              ) : (
                <div className="flex flex-col gap-3">
                  {duos.map((d) => (
                    <div
                      key={`${d.playerA.id}-${d.playerB.id}`}
                      className="p-3 border border-white/5 bg-white/[0.01] rounded-xl flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1.5 shrink-0">
                            <PlayerAvatar
                              nickname={d.playerA.nickname}
                              avatarUrl={d.playerA.avatarUrl}
                              size="sm"
                            />
                            <PlayerAvatar
                              nickname={d.playerB.nickname}
                              avatarUrl={d.playerB.avatarUrl}
                              size="sm"
                            />
                          </div>
                          <span className="text-xs font-bold text-white truncate max-w-[130px] sm:max-w-none">
                            {d.playerA.nickname} + {d.playerB.nickname}
                          </span>
                        </div>
                        <span className="text-xs font-black text-status-good shrink-0">{d.winrate}% WR</span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground border-t border-white/5 pt-1.5 mt-0.5">
                        <span>{d.total} partidas juntos</span>
                        <span>Rating combinado: {d.avgRating.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </FadeIn>

          {/* 4. Trio Dominante */}
          {dominantTrio && (
            <FadeIn delay={0.27}>
              <SectionCard title="🤝 Trio Dominante" variant="highlight">
                <div className="p-3 border border-white/5 bg-white/[0.01] rounded-xl flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2.5 shrink-0">
                        {dominantTrio.players.map((p) => (
                          <PlayerAvatar
                            key={p.id}
                            nickname={p.nickname}
                            avatarUrl={p.avatarUrl}
                            size="sm"
                          />
                        ))}
                      </div>
                      <span className="text-xs font-black text-white truncate max-w-[120px] sm:max-w-none">
                        {dominantTrio.players.map((p) => p.nickname).join(" + ")}
                      </span>
                    </div>
                    <span className="text-xs font-black text-status-good shrink-0">{dominantTrio.winrate}% WR</span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground border-t border-white/5 pt-1.5 mt-0.5">
                    <span>{dominantTrio.total} partidas juntos</span>
                    <span>Rating combinado: {dominantTrio.avgRating.toFixed(2)}</span>
                  </div>
                </div>
              </SectionCard>
            </FadeIn>
          )}

          {/* 5. Especialistas de Mapas */}
          <FadeIn delay={0.28}>
            <SectionCard title="🗺️ Especialistas de Mapas">
              {mapSpecialists.length === 0 ? (
                <EmptyState message="Sem especialistas de mapas definidos." />
              ) : (
                <div className="flex flex-col gap-2">
                  {mapSpecialists.map((ms) => (
                    <div
                      key={ms.mapName}
                      className="flex items-center justify-between text-xs p-2 rounded-lg bg-white/[0.01] border border-white/5"
                    >
                      <span className="font-semibold text-white capitalize">{ms.mapName}</span>
                      <div className="flex items-center gap-2">
                        <PlayerAvatar
                          nickname={ms.player.nickname}
                          avatarUrl={ms.player.avatarUrl}
                          size="sm"
                        />
                        <span className="font-bold text-white text-[11px]">{ms.player.nickname}</span>
                        <span className="text-[10px] font-semibold text-accent-violet">({ms.rating.toFixed(2)})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </FadeIn>

          {/* 6. Recordes Históricos (Hall da Fama) */}
          <FadeIn delay={0.29}>
            <SectionCard title="⭐ Recordes Históricos">
              <div className="flex flex-col gap-2.5 text-xs">
                {records.map((r, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.01] border border-white/5"
                  >
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
                        {r.category}
                      </p>
                      <p className="font-bold text-white mt-0.5">
                        {r.playerName} <span className="text-muted-foreground font-normal">({r.detail})</span>
                      </p>
                    </div>
                    <span className="text-xs font-black text-accent-cyan shrink-0">
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </FadeIn>

          {/* 7. Mural da Fama (Conquistas) */}
          <FadeIn delay={0.31}>
            <SectionCard title="🏆 Mural da Fama">
              {recentAchievements.length === 0 ? (
                <EmptyState message="Nenhuma conquista desbloqueada ainda." />
              ) : (
                <div className="flex flex-col divide-y divide-white/5">
                  {recentAchievements.map((entry) => (
                    <AchievementFeedItem key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </SectionCard>
          </FadeIn>

          {/* 8. Últimas Batalhas (Compacto no Rodapé) */}
          <FadeIn delay={0.33}>
            <SectionCard title="📜 Últimas Batalhas">
              {recentMatches.length === 0 ? (
                <EmptyState message="Nenhuma partida sincronizada ainda." />
              ) : (
                <div className="flex flex-col gap-1.5">
                  {recentMatches.slice(0, 3).map((match) => (
                    <MatchRow key={match.id} match={match} />
                  ))}
                  <div className="mt-2 text-center">
                    <Link
                      href="/sessions"
                      className="text-xs text-primary hover:underline font-bold inline-flex items-center gap-1 group"
                    >
                      Ver todas as sessões e partidas
                      <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              )}
            </SectionCard>
          </FadeIn>

        </div>

      </div>

      {/* 🤖 Fechamento: Insight da Semana - Coach IA */}
      <FadeIn delay={0.36}>
        <div className="mt-4">
          <CoachReportCard apiUrl="/api/coach/dashboard" />
        </div>
      </FadeIn>

    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-muted-foreground py-8 text-center text-sm">{message}</p>;
}
