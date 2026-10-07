import * as React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Crosshair,
  Skull,
  Target,
  Trophy,
  Percent,
  Gamepad2,
  Award,
  Handshake,
  Flame,
  Swords,
  Shield,
  Activity,
  Zap,
  Calendar,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { PlayerAvatar } from "@/components/players/player-avatar";
import { RatingBadge } from "@/components/players/rating-badge";
import { AchievementFeedItem } from "@/components/achievements/achievement-feed-item";
import { CoachSummaryCard } from "@/components/ui/coach-summary-card";
import { CoachReportCard } from "@/components/ui/coach-report-card";
import { ProfileChartsSection } from "@/components/players/profile-charts-section";
import { ItemProgressList } from "@/components/ui/item-progress-list";
import { RelationshipList } from "@/components/ui/relationship-list";
import { SectionHeader } from "@/components/ui/section-header";
import { SectionContainer } from "@/components/dashboard/section-container";
import { MetricDisplay } from "@/components/ui/metric-display";
import { TacticalBadge } from "@/components/ui/tactical-badge";
import { SampleIndicator } from "@/components/ui/sample-indicator";
import { EmptyState } from "@/components/ui/empty-state";
import { SeasonSelect } from "@/components/dashboard/season-select";
import { PremiumStatsPanel } from "@/components/players/premium-stats-panel";
import { safeQuery } from "@/server/safeQuery";
import * as playerService from "@/server/services/player.service";
import { getPlayerEntryStats } from "@/server/services/analytics/premium/entry.analytics";
import { getPlayerTradeStats } from "@/server/services/analytics/premium/trade.analytics";
import { getPlayerClutchStats } from "@/server/services/analytics/premium/clutch.analytics";
import { getPlayerKillDistance } from "@/server/services/analytics/premium/matchup.analytics";
import { getPlayerCombatStats } from "@/server/services/analytics/premium/combat.analytics";
import { getPlayerDamageStats } from "@/server/services/analytics/premium/damage.analytics";
import { winrateContext, ratingContext, adrContext, kastContext, hsContext } from "@/lib/statContext";
import { listSeasons } from "@/server/services/season.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PlayerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const { id } = await params;
  const { season } = await searchParams;
  const targetSeason = season === "all" ? undefined : season;

  const allSeasons = await safeQuery(() => listSeasons(), []);
  const seasonOptions = [
    { id: "all", name: "Carreira (Histórico)", status: "CLOSED" as const },
    ...allSeasons.map((s) => ({ id: s.id, name: s.name, status: s.status })),
  ];
  const currentSeason = season || "all";

  const detail = await safeQuery(() => playerService.getPlayerDetail(id, targetSeason), null);
  if (!detail) notFound();

  const { player, overview, maps, timeline, achievements, partners, recentMatches } = detail;

  const [premiumEntry, premiumTrade, premiumClutch, premiumDistance, premiumCombat, premiumDamage] =
    await Promise.all([
      safeQuery(() => getPlayerEntryStats({ playerId: id, seasonId: targetSeason }), null),
      safeQuery(() => getPlayerTradeStats({ playerId: id, seasonId: targetSeason }), null),
      safeQuery(() => getPlayerClutchStats({ playerId: id, seasonId: targetSeason }), null),
      safeQuery(() => getPlayerKillDistance({ playerId: id, seasonId: targetSeason }), null),
      safeQuery(() => getPlayerCombatStats({ playerId: id, seasonId: targetSeason }), null),
      safeQuery(() => getPlayerDamageStats({ playerId: id, seasonId: targetSeason }), null),
    ]);

  const mapProgressItems = maps.map((m) => ({
    name: m.mapName,
    count: m.appearances,
    percentage: m.winrate,
    subtitle: `${m.appearances} ${m.appearances === 1 ? "partida" : "partidas"}`,
  }));

  const relationshipItems = partners.map((p) => ({
    id: p.id,
    nickname: p.nickname,
    avatarUrl: p.avatarUrl,
    count: p.matchesTogether,
  }));

  const eloTimelinePoints = timeline.map((t) => ({
    playedAt: t.playedAt.toISOString(),
    value: t.elo,
  }));

  const ratingTimelinePoints = timeline.map((t) => ({
    playedAt: t.playedAt.toISOString(),
    value: t.rating,
  }));

  const isElite = overview.ratingAvg >= 1.25;
  const isPositive = overview.ratingAvg >= 1.05;

  return (
    <div className="flex flex-col gap-10 lg:gap-12 pb-16">
      
      {/* ═══ 01. PLAYER COMMAND HEADER ═══ */}
      <FadeIn>
        <div className="bg-surface-panel border border-border/70 rounded-sm overflow-hidden flex flex-col shadow-lg">
          <div className="h-[2px] w-full bg-gradient-to-r from-primary via-gold to-transparent" />

          {/* Profile Identity Deck */}
          <div className="p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 border-b border-border/40 bg-surface-deck/40">
            <div className="flex items-center gap-4 min-w-0">
              <PlayerAvatar
                nickname={player.nickname}
                avatarUrl={player.avatarUrl}
                size="lg"
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-foreground uppercase tracking-tight truncate">
                    {player.nickname}
                  </h1>
                  {player.levelGc !== null && player.levelGc !== undefined && (
                    <TacticalBadge
                      label={`GC LVL ${player.levelGc}`}
                      variant="primary"
                      size="xs"
                    />
                  )}
                  {isElite ? (
                    <TacticalBadge label="ALTA PERFORMANCE" variant="gold" size="xs" />
                  ) : isPositive ? (
                    <TacticalBadge label="REGULAR" variant="good" size="xs" />
                  ) : null}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground/70 mt-1">
                  <span>GC ID: {player.gamersClubId ?? "Não associado"}</span>
                  <span>·</span>
                  <span className="text-status-good font-bold">Monitoramento Ativo</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href={`/compare?playerA=${player.id}`}
                className="btn-press hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-surface-deck text-xs font-mono font-bold uppercase tracking-wider text-foreground border border-border/60 hover:border-primary/50 hover:text-primary transition-micro"
              >
                <Swords className="size-3.5" />
                <span>Desafiar no H2H</span>
              </Link>
              <SeasonSelect seasons={seasonOptions} currentSeasonId={currentSeason} />
            </div>
          </div>

          {/* Core Profile Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/30 bg-surface-deck/20">
            <div className="p-4 sm:p-5 flex flex-col justify-between gap-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
                RATING 2.0 MÉDIO
              </span>
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "font-mono text-2xl sm:text-3xl font-black tabular-nums",
                    isElite ? "text-gold" : isPositive ? "text-status-good" : "text-foreground"
                  )}
                >
                  {overview.ratingAvg.toFixed(2)}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/60">
                  {ratingContext(overview.ratingAvg)}
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-5 flex flex-col justify-between gap-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
                WINRATE GERAL
              </span>
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "font-mono text-2xl sm:text-3xl font-black tabular-nums",
                    overview.winrate >= 55 ? "text-status-good" : overview.winrate < 45 ? "text-status-critical" : "text-foreground"
                  )}
                >
                  {overview.winrate}%
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/60">
                  {overview.wins}V - {overview.losses}D
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-5 flex flex-col justify-between gap-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
                K/D RATIO
              </span>
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "font-mono text-2xl sm:text-3xl font-black tabular-nums",
                    overview.kd >= 1.15 ? "text-status-good" : overview.kd < 0.95 ? "text-status-critical" : "text-foreground"
                  )}
                >
                  {overview.kd.toFixed(2)}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/60">
                  Relação K/D
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-5 flex flex-col justify-between gap-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
                TOTAL DE PARTIDAS
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl sm:text-3xl font-black text-foreground tabular-nums">
                  {overview.totalMatches}
                </span>
                <SampleIndicator count={overview.totalMatches} variant="subtle" />
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* ═══ 02. DESEMPENHO TÁTICO & MÉTRICAS PRINCIPAIS ═══ */}
      <SectionContainer
        index={1}
        tag="TELEMETRIA DE COMBATE"
        title="Desempenho Principal"
        subtitle="Métricas fundamentais de pontaria, dano e sobrevivência."
        delay={0.05}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 bg-surface-panel border border-border/60 rounded-xs flex flex-col justify-between gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
              ADR (DANO/ROUND)
            </span>
            <span className="font-mono text-2xl font-black text-foreground tabular-nums">
              {overview.adrAvg.toFixed(1)}
            </span>
            <span className="text-[10px] font-sans text-muted-foreground/60 leading-tight">
              {adrContext(overview.adrAvg)}
            </span>
          </div>

          <div className="p-4 bg-surface-panel border border-border/60 rounded-xs flex flex-col justify-between gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
              KAST% (REGULARIDADE)
            </span>
            <span className="font-mono text-2xl font-black text-foreground tabular-nums">
              {overview.kastAvg.toFixed(1)}%
            </span>
            <span className="text-[10px] font-sans text-muted-foreground/60 leading-tight">
              {kastContext(overview.kastAvg)}
            </span>
          </div>

          <div className="p-4 bg-surface-panel border border-border/60 rounded-xs flex flex-col justify-between gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
              HEADSHOT %
            </span>
            <span className="font-mono text-2xl font-black text-foreground tabular-nums">
              {overview.hsPercentage.toFixed(1)}%
            </span>
            <span className="text-[10px] font-sans text-muted-foreground/60 leading-tight">
              {hsContext(overview.hsPercentage)}
            </span>
          </div>

          <div className="p-4 bg-surface-panel border border-border/60 rounded-xs flex flex-col justify-between gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">
              IMPACTO
            </span>
            <span className="font-mono text-2xl font-black text-primary tabular-nums">
              {overview.impactAvg.toFixed(2)}
            </span>
            <span className="text-[10px] font-sans text-muted-foreground/60 leading-tight">
              Influência em rounds
            </span>
          </div>
        </div>
      </SectionContainer>

      {/* ═══ 03. IMPACTO & MULTIKILLS MATRIX ═══ */}
      <SectionContainer
        index={2}
        tag="IMPACTO & EXECUÇÃO"
        title="Duelos, Aberturas e Multikills"
        subtitle="Telemetria de eliminações decisivas, trades e clutches."
        delay={0.08}
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          
          {/* Métricas de Impacto (7 cols) */}
          <div className="md:col-span-7 p-4 bg-surface-panel border border-border/60 rounded-xs flex flex-col justify-between gap-4">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground">
              Aberturas e Assistências
            </span>

            <div className="grid grid-cols-3 gap-3 text-center border-y border-border/30 py-3">
              <div>
                <span className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider block">
                  ENTRY KILLS
                </span>
                <span className="font-mono text-lg font-black text-foreground tabular-nums block mt-0.5">
                  {overview.entryKills}
                </span>
                <span className="text-[9px] font-mono text-muted-foreground/50">Primeiros abates</span>
              </div>

              <div className="border-x border-border/30">
                <span className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider block">
                  TRADE KILLS
                </span>
                <span className="font-mono text-lg font-black text-foreground tabular-nums block mt-0.5">
                  {overview.tradeKills}
                </span>
                <span className="text-[9px] font-mono text-muted-foreground/50">Vinganças</span>
              </div>

              <div>
                <span className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider block">
                  FLASH ASSISTS
                </span>
                <span className="font-mono text-lg font-black text-foreground tabular-nums block mt-0.5">
                  {overview.flashAssists}
                </span>
                <span className="text-[9px] font-mono text-muted-foreground/50">Cegueiras</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground/60">
              <span>Clutches Vencidos: <strong className="text-gold font-bold">{overview.clutchesWon}</strong></span>
              <span>Dano Total: <strong className="text-foreground">{overview.totalDamage.toLocaleString()} HP</strong></span>
            </div>
          </div>

          {/* Multikills Matrix (5 cols) */}
          <div className="md:col-span-5 p-4 bg-surface-panel border border-border/60 rounded-xs flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground">
                Matriz de Multikills
              </span>
              <TacticalBadge label="MULTIKILLS" variant="neutral" size="xs" />
            </div>

            <div className="grid grid-cols-4 gap-2 text-center py-2">
              <div className="p-2 bg-surface-deck rounded-xs border border-border/40">
                <span className="font-mono text-base font-black text-foreground block tabular-nums">
                  {overview.doubleKills}
                </span>
                <span className="text-[8px] font-mono font-bold uppercase text-muted-foreground/60">2K</span>
              </div>
              <div className="p-2 bg-surface-deck rounded-xs border border-border/40">
                <span className="font-mono text-base font-black text-status-good block tabular-nums">
                  {overview.tripleKills}
                </span>
                <span className="text-[8px] font-mono font-bold uppercase text-status-good">3K</span>
              </div>
              <div className="p-2 bg-surface-deck rounded-xs border border-border/40">
                <span className="font-mono text-base font-black text-status-warning block tabular-nums">
                  {overview.quadKills}
                </span>
                <span className="text-[8px] font-mono font-bold uppercase text-status-warning">4K</span>
              </div>
              <div className="p-2 bg-surface-deck rounded-xs border border-gold/30">
                <span className="font-mono text-base font-black text-gold block tabular-nums">
                  {overview.aces}
                </span>
                <span className="text-[8px] font-mono font-bold uppercase text-gold">ACES</span>
              </div>
            </div>

            <span className="text-[10px] font-mono text-muted-foreground/50 text-center">
              Total de rounds com 2+ eliminações
            </span>
          </div>

        </div>
      </SectionContainer>

      {/* ═══ 04. ANÁLISE DO COACH IA ═══ */}
      <SectionContainer
        index={3}
        tag="DIAGNÓSTICO IA"
        title="Análise Técnica do Coach"
        subtitle="Avaliação algorítmica de pontos fortes e vulnerabilidades do jogador."
        delay={0.1}
      >
        <div className="flex flex-col gap-4">
          <CoachSummaryCard data={overview.summaryCoach} />
          <CoachReportCard apiUrl={`/api/coach/player/${player.id}?season=${currentSeason}`} />
        </div>
      </SectionContainer>

      {/* ═══ 05. GRÁFICOS DE EVOLUÇÃO TEMPORAL ═══ */}
      <SectionContainer
        index={4}
        tag="HISTÓRICO TEMPORAL"
        title="Evolução de ELO e Rating"
        subtitle="Trajetória de pontuação ao longo das partidas disputadas."
        delay={0.12}
      >
        <ProfileChartsSection
          eloTimeline={eloTimelinePoints}
          ratingTimeline={ratingTimelinePoints}
        />
      </SectionContainer>

      {/* ═══ 06. ANALYTICS AVANÇADO (PREMIUM) ═══ */}
      {(premiumEntry || premiumTrade || premiumClutch || premiumDistance || premiumCombat || premiumDamage) && (
        <SectionContainer
          index={5}
          tag="ANALYTICS AVANÇADO"
          title="Telemetria Profunda"
          subtitle="Taxa de sucesso em duelos 1v1, trades e distribuição de dano."
          delay={0.14}
        >
          <PremiumStatsPanel
            entry={premiumEntry}
            trade={premiumTrade}
            clutch={premiumClutch}
            distance={premiumDistance}
            combat={premiumCombat}
            damage={premiumDamage}
          />
        </SectionContainer>
      )}

      {/* ═══ 07. PERFORMANCE POR MAPA & CONQUISTAS ═══ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionContainer
          index={6}
          tag="MAPAS"
          title="Performance por Mapa"
          subtitle="Aproveitamento e frequência em cada cenário do pool."
          delay={0.16}
        >
          <div className="bg-surface-panel border border-border/60 rounded-sm p-4">
            {mapProgressItems.length === 0 ? (
              <EmptyState message="Sem estatísticas de mapa registradas para este jogador." />
            ) : (
              <ItemProgressList items={mapProgressItems} emptyMessage="Sem estatísticas de mapa ainda." />
            )}
          </div>
        </SectionContainer>

        <SectionContainer
          index={7}
          tag="FEITOS"
          title="Conquistas Recentes"
          subtitle="Medalhas e marcos alcançados pelo jogador."
          delay={0.18}
        >
          <div className="bg-surface-panel border border-border/60 rounded-sm overflow-hidden p-4">
            {achievements.length === 0 ? (
              <EmptyState message="Nenhuma conquista desbloqueada por enquanto." icon={Award} />
            ) : (
              <div className="flex flex-col divide-y divide-border/30">
                {achievements.slice(0, 5).map((entry) => (
                  <AchievementFeedItem key={entry.id} entry={{ ...entry, player }} />
                ))}
              </div>
            )}
          </div>
        </SectionContainer>
      </div>

      {/* ═══ 08. PARCEIROS FREQUENTES (SINERGIA) ═══ */}
      <SectionContainer
        index={8}
        tag="SINERGIA"
        title="Parceiros mais Frequentes"
        subtitle="Membros do grupo com quem o jogador mais divide o servidor."
        delay={0.2}
      >
        <div className="bg-surface-panel border border-border/60 rounded-sm p-4">
          {relationshipItems.length === 0 ? (
            <EmptyState message="Nenhuma parceria de equipe registrada ainda." />
          ) : (
            <RelationshipList
              items={relationshipItems}
              labelSuffix="partidas jogadas juntas"
              emptyMessage="Nenhuma partida com outros membros do grupo registrada ainda."
            />
          )}
        </div>
      </SectionContainer>

      {/* ═══ 09. ÚLTIMAS 10 PARTIDAS (MATCH FEED) ═══ */}
      <SectionContainer
        index={9}
        tag="HISTÓRICO RECENTE"
        title="Últimos Confrontos"
        subtitle="Resumo operacional das partidas mais recentes disputadas."
        delay={0.22}
      >
        <div className="bg-surface-panel border border-border/60 rounded-sm overflow-hidden flex flex-col">
          {recentMatches.length === 0 ? (
            <EmptyState message="Nenhuma partida disputada por este jogador ainda." />
          ) : (
            <div className="divide-y divide-border/30">
              {recentMatches.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-surface-elevated/30 transition-micro gap-3"
                >
                  <div className="min-w-0 flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs sm:text-sm font-bold text-foreground">
                        {match.mapName.replace(/^de_/i, "").toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground/60">
                        · {match.playedAt.toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground/75 truncate">
                      {match.kills}K / {match.deaths}D / {match.assists}A · {match.hsPercentage.toFixed(0)}% HS
                    </span>
                  </div>
                  
                  <div className="shrink-0 flex items-center gap-2">
                    <RatingBadge rating={match.rating} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionContainer>

    </div>
  );
}
