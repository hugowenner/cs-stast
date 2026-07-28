import { FadeIn } from "@/components/motion/fade-in";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { MatchRow } from "@/components/matches/match-row";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AchievementFeedItem } from "@/components/achievements/achievement-feed-item";
import { MapWinrateChart } from "@/components/charts/map-winrate-chart";
import { SeasonHero } from "@/components/dashboard/season-hero";
import { MuralDaTemporada } from "@/components/dashboard/mural-da-temporada";
import { SectionHeader } from "@/components/dashboard/section-header";
import { InsightTiles } from "@/components/dashboard/insight-tiles";
import { DuoParceriasSection } from "@/components/dashboard/duo-parcerias-section";
import { PerformanceExtremesSection } from "@/components/dashboard/performance-extremes-section";
import { HallOfFame } from "@/components/dashboard/hall-of-fame";
import { StreaksSection } from "@/components/dashboard/streaks-section";
import { SeasonEvolutionSection } from "@/components/dashboard/season-evolution-section";
import { BestRecentDuoCard } from "@/components/dashboard/best-recent-duo-card";
import { WeeklyCuriosityCard } from "@/components/dashboard/weekly-curiosity-card";
import { SmartAlertsCard } from "@/components/dashboard/smart-alerts-card";
import { CoachReportCard } from "@/components/ui/coach-report-card";
import { RivalryCarousel } from "@/components/rivalries/rivalry-carousel";
import { ConfrontationsCarousel } from "@/components/matches/confrontations-carousel";
import { MonitoredPlayersCarousel } from "@/components/players/monitored-players-carousel";
import { ArchetypesCarousel } from "@/components/dashboard/archetypes-carousel";
import { MatchupsCarousel } from "@/components/dashboard/matchups-carousel";
import { DecisivePlayersSection } from "@/components/dashboard/decisive-players-section";
import { MapSpecialistsGrid } from "@/components/dashboard/map-specialists-grid";
import { RankingTable } from "@/components/ranking/ranking-table";
import type { RecentMatchCardData } from "@/components/matches/recent-matches-carousel";
import { SectionContainer } from "@/components/dashboard/section-container";
import { AdvancedPerformanceSection } from "@/components/dashboard/AdvancedPerformanceSection";
import { safeQuery } from "@/server/safeQuery";
import * as dashboardService from "@/server/services/dashboard.service";
import * as matchService from "@/server/services/match.service";
import * as competitiveService from "@/server/services/competitive.service";
import * as achievementService from "@/server/services/achievement.service";
import * as rivalryService from "@/server/services/rivalry.service";
import Link from "next/link";
import { Flame, ShieldAlert, Swords, RefreshCw, Crosshair, Zap, TrendingUp, Target } from "lucide-react";
import { FORMA_STYLE } from "@/lib/forma";

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
  records: [],
  bestPerformance: null,
  worstPerformance: null,
  monitoredPlayers: [],
  hotStreaks: [],
  coldStreaks: [],
  seasonComparison: [],
  topGainers: [],
  topDecliners: [],
  bestRecentDuo: null,
  weeklyCuriosity: null,
  mapWinrates: [],
  bestMap: null,
  worstMap: null,
  advancedPerformance: {
    sampleSize: 0,
    averageDamage: null,
    averageGcRating: null,
    totalDoubleKills: null,
    totalTripleKills: null,
    totalQuadKills: null,
    totalAces: null,
  },
  multikillsLeaderboards: {
    doubleKills: [],
    tripleKills: [],
    quadKills: [],
    aces: [],
  },
};

export default async function DashboardPage() {
  // Dataset carregado uma única vez e compartilhado entre dashboardService e
  // competitiveService — antes cada um buscava PlayerMatchStats separadamente.
  // A promise é iniciada aqui e só é aguardada dentro de cada safeQuery abaixo,
  // então continua rodando em paralelo com as demais chamadas independentes.
  const datasetPromise = competitiveService.loadCompetitiveDataset();

  const [summary, recentMatches, competitive, recentAchievements, topRivalries] =
    await Promise.all([
      safeQuery(async () => dashboardService.getDashboardSummary(await datasetPromise), {
        totalMatches: 0,
        totalPlayers: 0,
        totalSessions: 0,
        latestSession: null,
        community: { avgWinrate: 0, avgKills: 0, avgAdr: 0, avgKd: 0, avgHsPercent: 0, totalKills: 0, totalRounds: 0 },
        dominantMap: null,
        bestPlayer: null,
      }),
      safeQuery(() => matchService.listRecentMatches(10), []),
      safeQuery(
        async () => competitiveService.getDashboardCompetitiveBundle(await datasetPromise),
        EMPTY_COMPETITIVE_BUNDLE,
      ),
      safeQuery(() => achievementService.listRecent(4), []),
      safeQuery(() => rivalryService.listTopRivalriesWithH2H(10), []),
    ]);

  const {
    powerRanking,
    archetypes,
    matchups,
    decisive,
    mapSpecialists,
    momentum,
    jogadorDaSemana,
    duos,
    dominantTrio,
    bestPerformance,
    worstPerformance,
    monitoredPlayers,
    hotStreaks,
    records,
    coldStreaks,
    seasonComparison,
    topGainers,
    topDecliners,
    bestRecentDuo,
    weeklyCuriosity,
    mapWinrates,
    bestMap,
    worstMap,
    advancedPerformance,
    multikillsLeaderboards,
  } = competitive;

  const hottestPlayer = momentum.find((m) => m.status === "up") ?? null;
  const coldestPlayer = momentum.find((m) => m.status === "down") ?? null;

  // seasonComparison e bestMap/worstMap já vêm prontos do bundle competitivo — mesma
  // fonte usada pelo Map Pool e pelos Insight Tiles, sem nenhuma query extra aqui.
  const smartAlerts = competitiveService.getSmartAlerts(seasonComparison, bestMap, worstMap);

  return (
    <div className="flex flex-col gap-12 lg:gap-16">

      {/* ═══ 1. Resumo da Temporada ═══ */}
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

        {/* KPI pills compactos */}
        <FadeIn delay={0.03}>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Rounds", num: summary.community.totalRounds,  suffix: "",  decimals: 0, Icon: RefreshCw },
              { label: "Kills",  num: summary.community.totalKills,    suffix: "",  decimals: 0, Icon: Crosshair },
              { label: "ADR",    num: summary.community.avgAdr,        suffix: "",  decimals: 0, Icon: Zap       },
              { label: "K/D",    num: summary.community.avgKd,         suffix: "",  decimals: 2, Icon: TrendingUp},
              { label: "HS%",    num: summary.community.avgHsPercent,  suffix: "%", decimals: 0, Icon: Target    },
            ].map(({ label, num, suffix, decimals, Icon }) => (
              <div key={label} className="flex items-center gap-2 glass-panel rounded-xl border border-white/[0.06] px-3 py-2">
                <Icon className="size-3 shrink-0 text-muted-foreground/40" />
                <div>
                  <p className="text-sm font-black text-white tabular-nums leading-none">
                    <AnimatedNumber value={num} decimals={decimals} suffix={suffix} />
                  </p>
                  <p className="text-[8px] uppercase tracking-widest text-muted-foreground/50 font-bold leading-none mt-0.5">
                    {label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* 4 insights narrativos */}
        <InsightTiles
          hottestPlayer={hottestPlayer}
          coldestPlayer={coldestPlayer}
          bestMap={bestMap}
          worstMap={worstMap}
        />
      </section>

      {/* ═══ Mural da Temporada ═══ */}
      <SectionContainer
        title="📊 Mural da Temporada"
        subtitle="Quadro resumido de performance, arquétipos e estatísticas competitivas"
        delay={0.04}
      >
        <MuralDaTemporada competitive={competitive} />
      </SectionContainer>

      {/* ═══ 2. 🏆 Hall da Fama ═══ */}
      <SectionContainer
        title="🏆 Hall da Fama"
        subtitle="Recordes históricos e maiores picos de performance da temporada"
        delay={0.05}
      >
        <HallOfFame records={records} monitoredPlayers={monitoredPlayers} />
      </SectionContainer>

      {/* ═══ Performance Avançada GC ═══ */}
      <SectionContainer
        title="⚡ Performance Avançada GC"
        subtitle="Métricas reais extraídas da Gamers Club (dano, rating e multikills da temporada)"
        delay={0.06}
      >
        <AdvancedPerformanceSection stats={advancedPerformance} />
      </SectionContainer>

      {/* ═══ 🏆 Top Multikills da Temporada ═══ */}
      {(multikillsLeaderboards.doubleKills.length > 0 ||
        multikillsLeaderboards.tripleKills.length > 0 ||
        multikillsLeaderboards.quadKills.length > 0 ||
        multikillsLeaderboards.aces.length > 0) && (
        <SectionContainer
          title="🏆 Top Multikills da Temporada"
          subtitle="Os maiores especialistas em eliminações múltiplas por rodada"
          delay={0.065}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            {/* Card: Double Kills */}
            {multikillsLeaderboards.doubleKills.length > 0 && (
              <div className="glass-panel rounded-2xl border border-white/[0.07] p-5 flex flex-col justify-between hover:bg-white/[0.01] transition-all duration-300 shadow-lg min-h-[160px]">
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5 select-none">
                    <span>🥈 Double Kill (2K)</span>
                  </h3>
                  <div className="flex flex-col gap-2.5">
                    {multikillsLeaderboards.doubleKills.map((p, idx) => (
                      <div key={p.playerId} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-bold text-muted-foreground select-none w-4">
                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx === 3 ? "4️⃣" : idx === 4 ? "5️⃣" : "6️⃣"}
                          </span>
                          <span className="font-semibold text-foreground truncate">{p.nickname}</span>
                        </div>
                        <span className="font-mono font-bold text-foreground bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{p.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Card: Triple Kills */}
            {multikillsLeaderboards.tripleKills.length > 0 && (
              <div className="glass-panel rounded-2xl border border-white/[0.07] p-5 flex flex-col justify-between hover:bg-white/[0.01] transition-all duration-300 shadow-lg min-h-[160px]">
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5 select-none">
                    <span>🥉 Triple Kill (3K)</span>
                  </h3>
                  <div className="flex flex-col gap-2.5">
                    {multikillsLeaderboards.tripleKills.map((p, idx) => (
                      <div key={p.playerId} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-bold text-muted-foreground select-none w-4">
                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx === 3 ? "4️⃣" : idx === 4 ? "5️⃣" : "6️⃣"}
                          </span>
                          <span className="font-semibold text-foreground truncate">{p.nickname}</span>
                        </div>
                        <span className="font-mono font-bold text-foreground bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{p.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Card: Quad Kills */}
            {multikillsLeaderboards.quadKills.length > 0 && (
              <div className="glass-panel rounded-2xl border border-white/[0.07] p-5 flex flex-col justify-between hover:bg-white/[0.01] transition-all duration-300 shadow-lg min-h-[160px]">
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5 select-none">
                    <span>🏅 Quad Kill (4K)</span>
                  </h3>
                  <div className="flex flex-col gap-2.5">
                    {multikillsLeaderboards.quadKills.map((p, idx) => (
                      <div key={p.playerId} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-bold text-muted-foreground select-none w-4">
                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx === 3 ? "4️⃣" : idx === 4 ? "5️⃣" : "6️⃣"}
                          </span>
                          <span className="font-semibold text-foreground truncate">{p.nickname}</span>
                        </div>
                        <span className="font-mono font-bold text-foreground bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{p.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Card: Aces */}
            {multikillsLeaderboards.aces.length > 0 && (
              <div className="glass-panel rounded-2xl border border-white/[0.07] p-5 flex flex-col justify-between hover:bg-white/[0.01] transition-all duration-300 shadow-lg min-h-[160px]">
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5 select-none">
                    <span>👑 Aces (5K)</span>
                  </h3>
                  <div className="flex flex-col gap-2.5">
                    {multikillsLeaderboards.aces.map((p, idx) => (
                      <div key={p.playerId} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-bold text-muted-foreground select-none w-4">
                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx === 3 ? "4️⃣" : idx === 4 ? "5️⃣" : "6️⃣"}
                          </span>
                          <span className="font-semibold text-foreground truncate">{p.nickname}</span>
                        </div>
                        <span className="font-mono font-bold text-foreground bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{p.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </SectionContainer>
      )}

      {/* ═══ 3. Últimos Confrontos ═══ */}
      {recentMatches.length > 0 && (
        <SectionContainer
          title="Últimos Confrontos"
          subtitle="Últimos confrontos diretos entre os jogadores monitorados"
          href="/sessions"
          linkLabel="Ver todas"
          delay={0.07}
        >
          <ConfrontationsCarousel matches={recentMatches as RecentMatchCardData[]} />
        </SectionContainer>
      )}

      {/* ═══ 4. Ranking Competitivo ═══ */}
      <SectionContainer
        title="Ranking Competitivo"
        subtitle="Posição atual baseada na performance geral das partidas comunidade"
        delay={0.09}
      >
        <RankingTable entries={powerRanking.slice(0, 5)} formaStyle={FORMA_STYLE} delay={0.1} className="w-full" />
      </SectionContainer>

      {/* ═══ 5. Destaque da Semana ═══ */}
      {jogadorDaSemana && (
        <SectionContainer
          title="Destaque da Semana"
          subtitle="O jogador monitorado que mais se destacou nos últimos 7 dias"
          delay={0.11}
        >
          <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden p-6 max-w-xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left justify-center">
              <PlayerAvatar nickname={jogadorDaSemana.player.nickname} avatarUrl={jogadorDaSemana.player.avatarUrl} size="lg" />
              <div className="flex-1">
                <Link href={`/players/${jogadorDaSemana.player.id}`} className="text-xl font-black text-white hover:text-primary transition-colors block">
                  {jogadorDaSemana.player.nickname}
                </Link>
                <span className="text-[10px] text-status-good font-bold bg-status-good/10 px-2.5 py-0.5 rounded-full border border-status-good/15 mt-1.5 inline-block">
                  {jogadorDaSemana.evolutionText}
                </span>
                <p className="text-xs text-muted-foreground/60 mt-2 leading-relaxed">
                  Liderando a evolução do grupo com performance consistente e vitórias decisivas.
                </p>
              </div>
              <div className="flex flex-row sm:flex-col gap-3 shrink-0 w-full sm:w-auto">
                <div className="bg-white/[0.025] border border-white/[0.06] rounded-xl p-4 text-center min-w-[100px] flex-1">
                  <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/65">Rating</p>
                  <p className="text-xl font-black text-white mt-1 tabular-nums">
                    <AnimatedNumber value={jogadorDaSemana.rating} decimals={2} duration={0.8} />
                  </p>
                </div>
                <div className="bg-white/[0.025] border border-white/[0.06] rounded-xl p-4 text-center min-w-[100px] flex-1">
                  <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground/65">Winrate</p>
                  <p className="text-xl font-black text-white mt-1 tabular-nums">
                    <AnimatedNumber value={jogadorDaSemana.winrate} decimals={0} suffix="%" duration={0.65} />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SectionContainer>
      )}

      {/* ═══ 6. Melhores Parcerias ═══ */}
      {(duos.length > 0 || dominantTrio) && (
        <SectionContainer
          title="Melhores Parcerias"
          subtitle="Duplas e trios com maior sinergia e winrate na temporada"
          delay={0.12}
        >
          <DuoParceriasSection duos={duos} dominantTrio={dominantTrio} />
        </SectionContainer>
      )}

      {/* ═══ 7. Confrontos Diretos ═══ */}
      <SectionContainer
        title="Confrontos Diretos"
        subtitle="Histórico de rivalidades entre os jogadores monitorados"
        href="/compare"
        linkLabel="Scout H2H"
        delay={0.13}
      >
        {topRivalries.length > 0 ? (
          <RivalryCarousel rivalries={topRivalries} />
        ) : (
          <div className="glass-panel rounded-2xl border border-white/[0.07] p-10 text-center">
            <Swords className="size-6 text-muted-foreground/35 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground/55">Nenhum confronto direto registrado ainda.</p>
          </div>
        )}
      </SectionContainer>

      {/* ═══ 8. Soberania H2H ═══ */}
      {matchups.some((m) => m.dominates || m.struggles) && (
        <SectionContainer
          title="Soberania H2H"
          subtitle="Quem domina e quem sofre contra quem, cabeça a cabeça"
          delay={0.14}
        >
          <MatchupsCarousel matchups={matchups} />
        </SectionContainer>
      )}

      {/* ═══ 9. Perfil de Jogo ═══ */}
      {archetypes.length > 0 && (
        <SectionContainer
          title="Perfil de Jogo"
          subtitle="O estilo de cada jogador, baseado nos dados da temporada"
          delay={0.145}
        >
          <ArchetypesCarousel archetypes={archetypes} />
        </SectionContainer>
      )}

      {/* ═══ 10. Jogadores Decisivos ═══ */}
      {decisive.length > 0 && (
        <SectionContainer
          title="Jogadores Decisivos"
          subtitle="Quem mais impacta rounds — por entry kills, trades e clutches"
          delay={0.15}
        >
          <DecisivePlayersSection decisive={decisive} />
        </SectionContainer>
      )}

      {/* ═══ 11. Especialistas por Mapa ═══ */}
      {mapSpecialists.length > 0 && (
        <SectionContainer
          title="Especialistas por Mapa"
          subtitle="O melhor jogador da temporada em cada mapa, por rating médio"
          delay={0.154}
        >
          <MapSpecialistsGrid specialists={mapSpecialists} />
        </SectionContainer>
      )}

      {/* ═══ 12. Destaques da Temporada ═══ */}
      <PerformanceExtremesSection best={bestPerformance} worst={worstPerformance} />

      {/* ═══ 13. Sequências Atuais ═══ */}
      {(hotStreaks.length > 0 || coldStreaks.length > 0) && (
        <SectionContainer
          title="Sequências Atuais"
          subtitle="Baseado nas últimas 10 partidas de cada jogador monitorado"
          delay={0.158}
        >
          <StreaksSection hot={hotStreaks} cold={coldStreaks} />
        </SectionContainer>
      )}

      {/* ═══ 14. Evolução Recente ═══ */}
      {(topGainers.length > 0 || topDecliners.length > 0) && (
        <SectionContainer
          title="Evolução Recente"
          subtitle="Temporada inteira vs últimas 10 partidas"
          delay={0.162}
        >
          <SeasonEvolutionSection gainers={topGainers} decliners={topDecliners} />
        </SectionContainer>
      )}

      {/* ═══ 15. Análises Inteligentes ═══ */}
      <SectionContainer
        title="Análises Inteligentes"
        subtitle="Insights automáticos baseados nas partidas mais recentes"
        delay={0.166}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
          <BestRecentDuoCard duo={bestRecentDuo} />
          <WeeklyCuriosityCard curiosity={weeklyCuriosity} />
          <SmartAlertsCard alerts={smartAlerts} />
        </div>
      </SectionContainer>

      {/* ═══ 16. Map Pool ═══ */}
      <SectionContainer
        title="Map Pool"
        subtitle="Distribuição de winrate e mapas problemáticos da comunidade"
        delay={0.17}
      >
        <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden w-full flex flex-col p-6">
          <div className="flex flex-col md:flex-row gap-6 items-stretch">
            <div className="flex-1 min-h-[300px]">
              <MapWinrateChart data={mapWinrates} />
            </div>
            <div className="flex flex-col justify-center gap-3 w-full md:w-80 shrink-0 border-t md:border-t-0 md:border-l border-white/[0.04] pt-4 md:pt-0 md:pl-6">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60 mb-2">Desempenho por Mapa</p>
              {bestMap && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-status-good/5 border border-status-good/10">
                  <span className="flex items-center gap-1.5 text-status-good font-semibold text-xs">
                    <Flame className="size-3.5" /> Melhor mapa
                  </span>
                  <span className="text-white font-bold text-xs">{bestMap.map} · {bestMap.winrate.toFixed(0)}%</span>
                </div>
              )}
              {worstMap && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-status-critical/5 border border-status-critical/10">
                  <span className="flex items-center gap-1.5 text-status-critical font-semibold text-xs">
                    <ShieldAlert className="size-3.5" /> Mapa problema
                  </span>
                  <span className="text-white font-bold text-xs">{worstMap.map} · {worstMap.winrate.toFixed(0)}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </SectionContainer>

      {/* ═══ 17. Coach IA ═══ */}
      <SectionContainer
        title="Coach IA"
        subtitle="Relatório de performance gerado por Inteligência Artificial"
        delay={0.172}
      >
        <div className="relative w-full">
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-primary/12 via-accent-violet/6 to-transparent pointer-events-none" />
          <CoachReportCard apiUrl="/api/coach/dashboard" />
        </div>
      </SectionContainer>

      {/* ═══ 18. Conquistas Recentes ═══ */}
      <SectionContainer
        title="Conquistas Recentes"
        subtitle="Últimos marcos alcançados pelos jogadores monitorados"
        delay={0.174}
      >
        <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
          {recentAchievements.length === 0 ? (
            <p className="text-muted-foreground/55 py-10 text-center text-sm">Nenhuma conquista registrada recentemente.</p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {recentAchievements.map((entry, i) => (
                <AchievementFeedItem key={entry.id} entry={entry} index={i} />
              ))}
            </div>
          )}
        </div>
      </SectionContainer>

      {/* ═══ 19. Jogadores Monitorados ═══ */}
      {monitoredPlayers.length > 0 && (
        <SectionContainer
          title="Jogadores Monitorados"
          subtitle="Forma recente de cada jogador — últimas 10 partidas"
          href="/players"
          linkLabel="Ver todos"
          delay={0.178}
        >
          <MonitoredPlayersCarousel players={monitoredPlayers} />
        </SectionContainer>
      )}

      {/* ═══ 20. Últimas Partidas ═══ */}
      <SectionContainer
        title="Últimas Partidas"
        subtitle="Histórico das últimas partidas jogadas"
        href="/sessions"
        linkLabel="Ver sessões completas"
        delay={0.182}
      >
        <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
          {recentMatches.length === 0 ? (
            <p className="text-muted-foreground/55 py-10 text-center text-sm">Nenhuma partida registrada ainda.</p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {recentMatches.slice(0, 4).map((match) => (
                <MatchRow key={match.id} match={match} />
              ))}
            </div>
          )}
        </div>
      </SectionContainer>

    </div>
  );
}
