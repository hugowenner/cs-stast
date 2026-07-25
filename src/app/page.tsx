import { FadeIn } from "@/components/motion/fade-in";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { MatchRow } from "@/components/matches/match-row";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { AchievementFeedItem } from "@/components/achievements/achievement-feed-item";
import { MapWinrateChart } from "@/components/charts/map-winrate-chart";
import { SeasonHero } from "@/components/dashboard/season-hero";
import { SectionHeader } from "@/components/dashboard/section-header";
import { InsightTiles } from "@/components/dashboard/insight-tiles";
import { DuoParceriasSection } from "@/components/dashboard/duo-parcerias-section";
import { PerformanceExtremesSection } from "@/components/dashboard/performance-extremes-section";
import { StreaksSection } from "@/components/dashboard/streaks-section";
import { SeasonEvolutionSection } from "@/components/dashboard/season-evolution-section";
import { BestRecentDuoCard } from "@/components/dashboard/best-recent-duo-card";
import { WeeklyCuriosityCard } from "@/components/dashboard/weekly-curiosity-card";
import { SmartAlertsCard } from "@/components/dashboard/smart-alerts-card";
import { CoachReportCard } from "@/components/ui/coach-report-card";
import { RivalryCarousel } from "@/components/rivalries/rivalry-carousel";
import { ConfrontationsCarousel } from "@/components/matches/confrontations-carousel";
import { MonitoredPlayersCarousel } from "@/components/players/monitored-players-carousel";
import { RankingTable } from "@/components/ranking/ranking-table";
import type { RecentMatchCardData } from "@/components/matches/recent-matches-carousel";
import { safeQuery } from "@/server/safeQuery";
import * as dashboardService from "@/server/services/dashboard.service";
import * as matchService from "@/server/services/match.service";
import * as statsService from "@/server/services/stats.service";
import * as competitiveService from "@/server/services/competitive.service";
import * as achievementService from "@/server/services/achievement.service";
import * as rivalryService from "@/server/services/rivalry.service";
import Link from "next/link";
import { Flame, ShieldAlert, Swords } from "lucide-react";
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
  weeklyHighlights: [],
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
};

export default async function DashboardPage() {
  // Dataset carregado uma única vez e compartilhado entre dashboardService e
  // competitiveService — antes cada um buscava PlayerMatchStats separadamente.
  // A promise é iniciada aqui e só é aguardada dentro de cada safeQuery abaixo,
  // então continua rodando em paralelo com as demais chamadas independentes.
  const datasetPromise = competitiveService.loadCompetitiveDataset();

  const [summary, recentMatches, competitive, mapWinrates, recentAchievements, topRivalries] =
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
      safeQuery(() => statsService.getMapWinrates(), []),
      safeQuery(() => achievementService.listRecent(4), []),
      safeQuery(() => rivalryService.listTopRivalriesWithH2H(10), []),
    ]);

  const {
    powerRanking,
    momentum,
    jogadorDaSemana,
    duos,
    dominantTrio,
    bestPerformance,
    worstPerformance,
    monitoredPlayers,
    hotStreaks,
    coldStreaks,
    seasonComparison,
    topGainers,
    topDecliners,
    bestRecentDuo,
    weeklyCuriosity,
  } = competitive;

  const sortedMaps = [...mapWinrates].sort((a, b) => b.winrate - a.winrate);
  const bestMap = sortedMaps.find((m) => m.matchesPlayed >= 2) ?? null;
  const worstMap = [...mapWinrates].filter((m) => m.matchesPlayed >= 2).sort((a, b) => a.winrate - b.winrate)[0] ?? null;

  const hottestPlayer = momentum.find((m) => m.status === "up") ?? null;
  const coldestPlayer = momentum.find((m) => m.status === "down") ?? null;

  // Combina dados já carregados (seasonComparison do bundle competitivo + bestMap/worstMap
  // do statsService) sem nenhuma query extra.
  const smartAlerts = competitiveService.getSmartAlerts(seasonComparison, bestMap, worstMap);

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
        <InsightTiles
          hottestPlayer={hottestPlayer}
          coldestPlayer={coldestPlayer}
          bestMap={bestMap}
          worstMap={worstMap}
        />
      </section>

      {/* ═══ ZONA 2 — Últimos Confrontos ═══ */}
      {recentMatches.length > 0 && (
        <section>
          <FadeIn delay={0.07}>
            <SectionHeader
              title="Últimos Confrontos"
              subtitle="Últimos confrontos entre jogadores monitorados"
              href="/sessions"
              linkLabel="Ver todas"
            />
          </FadeIn>
          <FadeIn delay={0.08}>
            <ConfrontationsCarousel matches={recentMatches as RecentMatchCardData[]} />
          </FadeIn>
        </section>
      )}

      {/* ═══ ZONA 3 — Confrontos Diretos ═══ */}
      <section>
        <FadeIn delay={0.07}>
          <SectionHeader
            title="Confrontos Diretos"
            subtitle="Histórico de rivalidades entre os jogadores monitorados"
            href="/compare"
            linkLabel="Scout H2H"
          />
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
        <DuoParceriasSection duos={duos} dominantTrio={dominantTrio} />
      </section>

      {/* ═══ ZONA 3 — Performance ═══ */}
      <section>
        <FadeIn delay={0.12}>
          <p className="text-[9px] uppercase tracking-[0.12em] font-bold text-muted-foreground/60 mb-4">Performance</p>
        </FadeIn>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

          <RankingTable entries={powerRanking} formaStyle={FORMA_STYLE} delay={0.13} className="lg:col-span-2" />

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
      <PerformanceExtremesSection best={bestPerformance} worst={worstPerformance} />

      {/* ═══ Sequências Atuais (Hot Streak / Cold Streak) ═══ */}
      {(hotStreaks.length > 0 || coldStreaks.length > 0) && (
        <section>
          <FadeIn delay={0.155}>
            <SectionHeader
              title="Sequências Atuais"
              subtitle="Baseado nas últimas 10 partidas de cada jogador monitorado"
              className="mb-4"
            />
          </FadeIn>
          <FadeIn delay={0.157}>
            <StreaksSection hot={hotStreaks} cold={coldStreaks} />
          </FadeIn>
        </section>
      )}

      {/* ═══ Evolução Recente / Queda de Performance ═══ */}
      {(topGainers.length > 0 || topDecliners.length > 0) && (
        <section>
          <FadeIn delay={0.159}>
            <SectionHeader
              title="Evolução Recente"
              subtitle="Temporada inteira vs últimas 10 partidas"
              className="mb-4"
            />
          </FadeIn>
          <FadeIn delay={0.161}>
            <SeasonEvolutionSection gainers={topGainers} decliners={topDecliners} />
          </FadeIn>
        </section>
      )}

      {/* ═══ Dupla do Momento / Curiosidade / Alertas ═══ */}
      <section>
        <FadeIn delay={0.163}>
          <SectionHeader
            title="Análises Inteligentes"
            subtitle="Dupla em alta, curiosidade da semana e alertas automáticos"
            className="mb-4"
          />
        </FadeIn>
        <FadeIn delay={0.165}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
            <BestRecentDuoCard duo={bestRecentDuo} />
            <WeeklyCuriosityCard curiosity={weeklyCuriosity} />
            <SmartAlertsCard alerts={smartAlerts} />
          </div>
        </FadeIn>
      </section>

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

      {/* ═══ ZONA 5.5 — Jogadores Monitorados ═══ */}
      {monitoredPlayers.length > 0 && (
        <section>
          <FadeIn delay={0.22}>
            <SectionHeader
              title="Jogadores Monitorados"
              subtitle="Forma recente de cada jogador — últimas 10 partidas"
              href="/players"
              linkLabel="Ver todos"
            />
          </FadeIn>
          <FadeIn delay={0.23}>
            <MonitoredPlayersCarousel players={monitoredPlayers} />
          </FadeIn>
        </section>
      )}

      {/* ═══ ZONA 6 — Últimas Partidas ═══ */}
      <section>
        <FadeIn delay={0.24}>
          <SectionHeader
            title="Últimas Partidas"
            href="/sessions"
            linkLabel="Ver sessões completas"
            className="mb-4"
          />
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
