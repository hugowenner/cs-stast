import { FadeIn } from "@/components/motion/fade-in";
import { AchievementFeedItem } from "@/components/achievements/achievement-feed-item";
import { SeasonHero } from "@/components/dashboard/season-hero";
import { HallOfFame } from "@/components/dashboard/hall-of-fame";
import { CoachReportCard } from "@/components/ui/coach-report-card";
import { ConfrontationsCarousel } from "@/components/matches/confrontations-carousel";
import { MonitoredPlayersCarousel } from "@/components/players/monitored-players-carousel";
import { RankingTable } from "@/components/ranking/ranking-table";
import type { RecentMatchCardData } from "@/components/matches/recent-matches-carousel";
import { SectionContainer } from "@/components/dashboard/section-container";
import { SeasonSelect } from "@/components/dashboard/season-select";
import { RadarDaTemporada } from "@/components/dashboard/radar-da-temporada";
import { MuralCompetitivo } from "@/components/dashboard/mural-competitivo";
import { SinergiaSection } from "@/components/dashboard/sinergia-section";
import { ReisDosMapa } from "@/components/dashboard/reis-dos-mapas";
import { PerformanceGcSection } from "@/components/dashboard/performance-gc-section";
import { TendenciasDaTemporada } from "@/components/dashboard/tendencias-da-temporada";
import { safeQuery } from "@/server/safeQuery";
import * as statsService from "@/server/services/stats.service";
import * as dashboardService from "@/server/services/dashboard.service";
import * as matchService from "@/server/services/match.service";
import * as competitiveService from "@/server/services/competitive.service";
import * as achievementService from "@/server/services/achievement.service";
import * as rivalryService from "@/server/services/rivalry.service";
import { listSeasons, resolveSeasonId } from "@/server/services/season.service";
import { prisma } from "@/server/db";

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
  worstRecords: [],
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
  clutchesBundle: {
    totalAttempts: 0,
    totalWins: 0,
    winrate: 0,
    tiers: [],
    leaders: [],
  },
  combatBundle: {
    wallbangKills: 0,
    throughSmokeKills: 0,
    noScopeKills: 0,
    blindedKills: 0,
    totalSkillKills: 0,
    headDamagePercent: null,
    avgDamagePerHit: null,
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

  const officialRanking = await safeQuery(
    () => statsService.getSeasonScoreRanking(resolvedSeasonId, 5),
    [],
  );

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
    worstRecords,
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
    clutchesBundle,
    combatBundle,
  } = competitive;

  const hottestPlayer = momentum.find((m) => m.status === "up") ?? null;
  const coldestPlayer = momentum.find((m) => m.status === "down") ?? null;

  return (
    <div className="flex flex-col gap-10 lg:gap-12 pb-16">
      {/* ═══ 01. TACTICAL HERO COMMAND CENTER ═══ */}
      <section className="flex flex-col gap-3">
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

      {/* ═══ 02. ÚLTIMOS CONFRONTOS ═══ */}
      {recentMatches.length > 0 && (
        <SectionContainer
          index={2}
          tag="CONFRONTOS RECENTES"
          title="Últimos Confrontos"
          subtitle="Partidas mais recentes registradas pelo grupo."
          href="/sessions"
          linkLabel="Ver histórico completo"
          delay={0.03}
        >
          <ConfrontationsCarousel matches={recentMatches as RecentMatchCardData[]} />
        </SectionContainer>
      )}

      {/* ═══ 03. JOGADORES MONITORADOS ═══ */}
      {monitoredPlayers.length > 0 && (
        <SectionContainer
          index={3}
          tag="ROSTER ATIVO"
          title="Jogadores Monitorados"
          subtitle="Membros com partidas e estatísticas ativas na temporada."
          href="/players"
          linkLabel="Ver todos os jogadores"
          delay={0.035}
        >
          <MonitoredPlayersCarousel players={monitoredPlayers} />
        </SectionContainer>
      )}

      {/* ═══ 04. CLASSIFICAÇÃO OFICIAL (SCORE 3.5) ═══ */}
      <SectionContainer
        index={4}
        tag="SCORE OFICIAL 3.5"
        title="Classificação da Temporada"
        subtitle="Score Oficial 3.5 do CS2 Stats — cálculo balanceado com mínimo de 10 partidas."
        href="/rankings"
        linkLabel="Ver tabela completa de ranking"
        delay={0.04}
      >
        <RankingTable
          officialEntries={officialRanking}
          entries={powerRanking.slice(0, 5)}
          seasonComparison={seasonComparison}
          delay={0.05}
          className="w-full"
        />
      </SectionContainer>

      {/* ═══ 05. TENDÊNCIAS & FORMA ═══ */}
      {(topGainers.length > 0 || topDecliners.length > 0 || hotStreaks.length > 0 || coldStreaks.length > 0) && (
        <SectionContainer
          index={5}
          tag="TRAJETÓRIA & FORMA"
          title="Tendências Recentes"
          subtitle="Comparativo das últimas 10 partidas vs. média histórica da temporada."
          delay={0.06}
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

      {/* ═══ 06. INTELIGÊNCIA DE MAPAS ═══ */}
      {(mapSpecialists.length > 0 || mapWinrates.length > 0) && (
        <SectionContainer
          index={6}
          tag="INTELIGÊNCIA DE MAPAS"
          title="Controle de Território"
          subtitle="Especialistas por mapa, aproveitamento coletivo e pontos de vulnerabilidade."
          delay={0.07}
        >
          <ReisDosMapa
            specialists={mapSpecialists}
            mapWinrates={mapWinrates}
            bestMap={bestMap}
            worstMap={worstMap}
          />
        </SectionContainer>
      )}

      {/* ═══ 07. PAINEL DE PERFORMANCE & DUELOS ═══ */}
      <SectionContainer
        index={7}
        tag="LÍDERES & IMPACTO"
        title="Painel de Performance"
        subtitle="Líderes por métrica, estatísticas decisivas de duelo e perfis táticos."
        delay={0.08}
      >
        <MuralCompetitivo
          powerRanking={powerRanking}
          decisive={decisive}
          archetypes={archetypes}
        />
      </SectionContainer>

      {/* ═══ 08. DUPLAS & SINERGIA COLETIVA ═══ */}
      <SectionContainer
        index={8}
        tag="SINERGIA & DUPLAS"
        title="Duplas e Sinergia Coletiva"
        subtitle="Combinações com maior winrate, trio dominante e histórico de confrontos diretos."
        href="/compare"
        linkLabel="Comparar jogadores (H2H)"
        delay={0.09}
      >
        <SinergiaSection
          duos={duos}
          dominantTrio={dominantTrio}
          topRivalries={topRivalries}
          matchups={matchups}
          bestRecentDuo={bestRecentDuo}
        />
      </SectionContainer>

      {/* ═══ 09. TELEMETRIA AVANÇADA DE COMBATE ═══ */}
      <SectionContainer
        index={9}
        tag="TELEMETRIA GC"
        title="Estatísticas Avançadas de Combate"
        subtitle="Multikills, clutches 1vX e telemetria de dano por disparo da temporada."
        delay={0.10}
      >
        <PerformanceGcSection
          stats={advancedPerformance}
          multikillsLeaderboards={multikillsLeaderboards}
          clutchesBundle={clutchesBundle}
          combatBundle={combatBundle}
        />
      </SectionContainer>

      {/* ═══ 10. DESTAQUES & RADAR TÁTICO ═══ */}
      {(jogadorDaSemana || weeklyCuriosity || smartAlerts.length > 0) && (
        <SectionContainer
          index={10}
          tag="RADAR TÁTICO"
          title="Destaques & Alertas da Semana"
          subtitle="Jogador em evidência, alertas estatísticos e curiosidades da temporada."
          delay={0.11}
        >
          <RadarDaTemporada
            jogadorDaSemana={jogadorDaSemana}
            weeklyCuriosity={weeklyCuriosity}
            smartAlerts={smartAlerts}
          />
        </SectionContainer>
      )}

      {/* ═══ 11. RECORDES & MARCAS DA TEMPORADA ═══ */}
      {(records.length > 0 || worstRecords.length > 0) && (
        <SectionContainer
          index={11}
          tag="HALL DA FAMA"
          title="Recordes da Temporada"
          subtitle="Marcas extremas, atuações de destaque e anomalias registradas pelo grupo."
          delay={0.12}
        >
          <HallOfFame
            records={records}
            worstRecords={worstRecords}
            monitoredPlayers={monitoredPlayers}
          />
        </SectionContainer>
      )}

      {/* ═══ 12. RELATÓRIO TÁTICO DO COACH IA ═══ */}
      <SectionContainer
        index={12}
        tag="INTELIGÊNCIA IA"
        title="Relatório Tático do Coach"
        subtitle="Diagnóstico analítico e direto do desempenho coletivo da temporada."
        delay={0.13}
      >
        <div className="relative w-full">
          <CoachReportCard apiUrl={`/api/coach/dashboard${seasonParam ? `?season=${seasonParam}` : ""}`} />
        </div>
      </SectionContainer>

      {/* ═══ 13. CONQUISTAS RECENTES ═══ */}
      <SectionContainer
        index={13}
        tag="FEED DE CONQUISTAS"
        title="Conquistas Desbloqueadas"
        subtitle="Feitos e marcos recentemente alcançados pelos membros."
        href="/achievements"
        linkLabel="Ver todas as conquistas"
        delay={0.14}
      >
        <div className="bg-surface-panel border border-border/60 rounded-sm overflow-hidden">
          {recentAchievements.length === 0 ? (
            <p className="text-muted-foreground/60 py-8 text-center text-xs font-mono">
              Nenhuma conquista recente registrada.
            </p>
          ) : (
            <div className="divide-y divide-border/30">
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
