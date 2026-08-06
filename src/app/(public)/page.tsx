import { FadeIn } from "@/components/motion/fade-in";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { AchievementFeedItem } from "@/components/achievements/achievement-feed-item";
import { SeasonHero } from "@/components/dashboard/season-hero";
import { HallOfFame } from "@/components/dashboard/hall-of-fame";
import { CoachReportCard } from "@/components/ui/coach-report-card";
import { ConfrontationsCarousel } from "@/components/matches/confrontations-carousel";
import { MonitoredPlayersCarousel } from "@/components/players/monitored-players-carousel";
import { RankingTable } from "@/components/ranking/ranking-table";
import type { RecentMatchCardData } from "@/components/matches/recent-matches-carousel";
import { SectionContainer } from "@/components/dashboard/section-container";
import { NarratorSection } from "@/components/dashboard/narrator-section";
import { SeasonSelect } from "@/components/dashboard/season-select";
import { RadarDaTemporada } from "@/components/dashboard/radar-da-temporada";
import { MuralCompetitivo } from "@/components/dashboard/mural-competitivo";
import { SinergiaSection } from "@/components/dashboard/sinergia-section";
import { ReisDosMapa } from "@/components/dashboard/reis-dos-mapas";
import { PerformanceGcSection } from "@/components/dashboard/performance-gc-section";
import { TendenciasDaTemporada } from "@/components/dashboard/tendencias-da-temporada";
import { safeQuery } from "@/server/safeQuery";
import * as dashboardService from "@/server/services/dashboard.service";
import * as matchService from "@/server/services/match.service";
import * as competitiveService from "@/server/services/competitive.service";
import * as achievementService from "@/server/services/achievement.service";
import * as rivalryService from "@/server/services/rivalry.service";
import { listSeasons, resolveSeasonId } from "@/server/services/season.service";
import { prisma } from "@/server/db";
import { RefreshCw, Crosshair, Zap, TrendingUp, Target } from "lucide-react";
import { FORMA_STYLE } from "@/lib/forma";
import { AnnouncementBanner } from "@/components/dashboard/AnnouncementBanner";

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
  smartAlerts: [],
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
  highlightsPool: [],
};

export default async function DashboardPage(props: {
  searchParams: Promise<{ season?: string }>;
}) {
  const searchParams = await props.searchParams;
  const seasonParam = searchParams.season;
  const targetSeason = seasonParam === "current" ? undefined : seasonParam;

  const resolvedSeasonId = (await resolveSeasonId(targetSeason)) || "";
  const allSeasons = await listSeasons();
  const selectedSeason = allSeasons.find((s) => s.id === resolvedSeasonId);

  const snapshot = await prisma.seasonSnapshot.findUnique({
    where: { seasonId: resolvedSeasonId },
  });

  let summary: Awaited<ReturnType<typeof dashboardService.getDashboardSummary>>;
  let competitive: competitiveService.DashboardCompetitiveBundle;
  let recentMatches: Awaited<ReturnType<typeof matchService.listRecentMatches>>;
  let recentAchievements: Awaited<ReturnType<typeof achievementService.listRecent>>;
  let topRivalries: Awaited<ReturnType<typeof rivalryService.listTopRivalriesWithH2H>>;

  if (snapshot && selectedSeason?.status === "CLOSED") {
    const data = snapshot.dashboard as any;
    summary = data.dashboard ? data.dashboard.summary : data.summary;
    competitive = data.dashboard ? data.dashboard.competitive : data.competitive;
    const [liveRecentMatches, liveAchievements, liveRivalries] = await Promise.all([
      safeQuery(() => matchService.listRecentMatches(10, resolvedSeasonId), []),
      safeQuery(() => achievementService.listRecent(4), []),
      safeQuery(() => rivalryService.listTopRivalriesWithH2H(10), []),
    ]);
    recentMatches = liveRecentMatches;
    recentAchievements = liveAchievements;
    topRivalries = liveRivalries;
  } else {
    const datasetPromise = competitiveService.loadCompetitiveDataset(resolvedSeasonId);

    const [calcSummary, calcRecentMatches, calcCompetitive, calcAchievements, calcRivalries] =
      await Promise.all([
        safeQuery(async () => dashboardService.getDashboardSummary(resolvedSeasonId, await datasetPromise), {
          totalMatches: 0,
          totalPlayers: 0,
          totalSessions: 0,
          latestSession: null,
          community: { avgWinrate: 0, avgKills: 0, avgAdr: 0, avgKd: 0, avgHsPercent: 0, totalKills: 0, totalRounds: 0 },
          dominantMap: null,
          bestPlayer: null,
        }),
        safeQuery(() => matchService.listRecentMatches(10, resolvedSeasonId), []),
        safeQuery(
          async () => competitiveService.getDashboardCompetitiveBundle(await datasetPromise),
          EMPTY_COMPETITIVE_BUNDLE,
        ),
        safeQuery(() => achievementService.listRecent(4), []),
        safeQuery(() => rivalryService.listTopRivalriesWithH2H(10), []),
      ]);

    summary = calcSummary;
    recentMatches = calcRecentMatches;
    competitive = calcCompetitive;
    recentAchievements = calcAchievements;
    topRivalries = calcRivalries;
  }

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
    monitoredPlayers,
    hotStreaks,
    records,
    coldStreaks,
    seasonComparison,
    topGainers,
    topDecliners,
    bestRecentDuo,
    weeklyCuriosity,
    smartAlerts,
    mapWinrates,
    bestMap,
    worstMap,
    advancedPerformance,
    multikillsLeaderboards,
    highlightsPool,
  } = competitive;

  const hottestPlayer = momentum.find((m) => m.status === "up") ?? null;
  const coldestPlayer = momentum.find((m) => m.status === "down") ?? null;

  return (
    <div className="flex flex-col gap-8 lg:gap-10">

      <AnnouncementBanner />

      {/* Page Title */}
      <div className="flex flex-col gap-1 px-1 mt-2">
        <h1 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
          <span>📊</span> Raio-X da Temporada
        </h1>
        <p className="text-[10px] text-muted-foreground/60 font-semibold tracking-wider uppercase leading-none mt-1">
          Competitive Performance Intelligence Overview
        </p>
      </div>

      {/* ═══ 1. Resumo da Temporada ═══ */}
      <section className="flex flex-col gap-4">
        <FadeIn>
          <SeasonHero
            seasonLabel={selectedSeason?.name ?? SEASON_LABEL}
            seasonStatus={selectedSeason?.status ?? "ACTIVE"}
            totalMatches={summary.totalMatches}
            bestPlayer={summary.bestPlayer}
            communityWinrate={summary.community.avgWinrate}
            dominantMap={summary.dominantMap}
            totalPlayers={summary.totalPlayers}
            advancedStats={{
              totalRounds: summary.community.totalRounds,
              totalKills: summary.community.totalKills,
              avgAdr: summary.community.avgAdr,
              avgKd: summary.community.avgKd,
              avgHsPercent: summary.community.avgHsPercent,
            }}
            hottestPlayer={hottestPlayer}
            coldestPlayer={coldestPlayer}
            bestMap={bestMap}
            worstMap={worstMap}
            action={
              <SeasonSelect
                seasons={allSeasons.map((s) => ({ id: s.id, name: s.name, status: s.status }))}
                currentSeasonId={resolvedSeasonId}
              />
            }
          />
        </FadeIn>
      </section>

      {/* ═══ 2. Últimos Confrontos ═══ */}
      {recentMatches.length > 0 && (
        <SectionContainer
          title="Últimos Confrontos"
          href="/sessions"
          linkLabel="Ver todas"
          delay={0.03}
        >
          <ConfrontationsCarousel matches={recentMatches as RecentMatchCardData[]} />
        </SectionContainer>
      )}

      {/* ═══ 3. Jogadores Monitorados ═══ */}
      {monitoredPlayers.length > 0 && (
        <SectionContainer
          title="Jogadores Monitorados"
          href="/players"
          linkLabel="Ver todos"
          delay={0.035}
        >
          <MonitoredPlayersCarousel players={monitoredPlayers} />
        </SectionContainer>
      )}

      {/* ═══ 4. Radar da Temporada ═══ */}
      <SectionContainer
        title="🔎 Detector de Bagre"
        delay={0.04}
      >
        <RadarDaTemporada
          jogadorDaSemana={jogadorDaSemana}
          weeklyCuriosity={weeklyCuriosity}
          smartAlerts={smartAlerts}
        />
      </SectionContainer>

      {/* ═══ 4. Hall da Fama ═══ */}
      <SectionContainer
        title="🏛️ Museu dos Amassos"
        delay={0.05}
      >
        <HallOfFame records={records} monitoredPlayers={monitoredPlayers} />
      </SectionContainer>

      {/* ═══ 5. Ranking Competitivo ═══ */}
      <SectionContainer
        title="Quem está carregando"
        delay={0.06}
      >
        <RankingTable
          entries={powerRanking.slice(0, 5)}
          formaStyle={FORMA_STYLE}
          seasonComparison={seasonComparison}
          delay={0.07}
          className="w-full"
        />
      </SectionContainer>

      {/* ═══ 6. Tendências da Temporada ═══ */}
      {(topGainers.length > 0 || topDecliners.length > 0 || hotStreaks.length > 0 || coldStreaks.length > 0) && (
        <SectionContainer
          title="📈 Quem subiu e quem afundou"
          delay={0.08}
        >
          <TendenciasDaTemporada
            topGainers={topGainers}
            topDecliners={topDecliners}
            hotStreaks={hotStreaks}
            coldStreaks={coldStreaks}
            mapWinrates={mapWinrates}
          />
        </SectionContainer>
      )}

      {/* ═══ 7. Mural Competitivo ═══ */}
      <SectionContainer
        title="📊 Painel de Domínio"
        delay={0.09}
      >
        <MuralCompetitivo
          powerRanking={powerRanking}
          decisive={decisive}
          archetypes={archetypes}
        />
      </SectionContainer>

      {/* ═══ 8. Sinergia ═══ */}
      <SectionContainer
        title="🤝 Dinâmicas do Grupo"
        delay={0.10}
      >
        <SinergiaSection
          duos={duos}
          dominantTrio={dominantTrio}
          topRivalries={topRivalries}
          matchups={matchups}
          bestRecentDuo={bestRecentDuo}
        />
      </SectionContainer>

      {/* ═══ 9. Reis dos Mapas ═══ */}
      {(mapSpecialists.length > 0 || mapWinrates.length > 0) && (
        <SectionContainer
          title="👑 Donos dos Mapas"
          delay={0.11}
        >
          <ReisDosMapa
            specialists={mapSpecialists}
            mapWinrates={mapWinrates}
            bestMap={bestMap}
            worstMap={worstMap}
          />
        </SectionContainer>
      )}

      {/* ═══ 10. Performance GC ═══ */}
      <SectionContainer
        title="🎯 Estatísticas de Boteco Premium"
        delay={0.12}
      >
        <PerformanceGcSection
          stats={advancedPerformance}
          multikillsLeaderboards={multikillsLeaderboards}
        />
      </SectionContainer>



      {/* ═══ 12. Coach IA ═══ */}
      <SectionContainer
        title="Coach IA"
        subtitle="💀 A IA que vai reclamar da sua mira"
        delay={0.14}
      >
        <div className="relative w-full">
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-primary/12 via-accent-violet/6 to-transparent pointer-events-none" />
          <CoachReportCard apiUrl={`/api/coach/dashboard${seasonParam ? `?season=${seasonParam}` : ""}`} />
        </div>
      </SectionContainer>

      {/* ═══ 13. Conquistas Recentes ═══ */}
      <SectionContainer
        title="🏆 Conquistas Recentes"
        delay={0.15}
      >
        <div className="glass-panel rounded-2xl border border-white/[0.07] overflow-hidden">
          {recentAchievements.length === 0 ? (
            <p className="text-muted-foreground/55 py-10 text-center text-sm">Nenhuma conquista desbloqueada recentemente. Joguem mais.</p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {recentAchievements.map((entry, i) => (
                <AchievementFeedItem key={entry.id} entry={entry} index={i} />
              ))}
            </div>
          )}
        </div>
      </SectionContainer>


    </div>
  );
}
