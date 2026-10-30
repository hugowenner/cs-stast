import Link from "next/link";
import {
  ArrowLeft,
  Database,
  Layers,
  Crosshair,
  Handshake,
  Bomb,
  Crown,
} from "lucide-react";
import { SeasonSelect } from "@/components/dashboard/season-select";
import { RaioXSection } from "@/components/dashboard/raio-x/raio-x-section";
import { getRaioXBundle } from "@/server/services/raio-x.service";
import type { RaioXBundle } from "@/lib/raio-x-types";
import { RAIO_X_CARDS_CATALOG } from "@/lib/raio-x-types";
import { safeQuery } from "@/server/safeQuery";
import * as competitiveService from "@/server/services/competitive.service";
import { listSeasons, resolveSeasonId } from "@/server/services/season.service";
import { prisma } from "@/server/db";
import { TacticalBadge } from "@/components/ui/tactical-badge";

export const dynamic = "force-dynamic";

const DEFAULT_RAIO_X_BUNDLE: RaioXBundle = {
  entregamos5v4: {
    totalEligibleRounds: 0,
    totalAdvantagesCreated: 0,
    roundsWonAfterFk: 0,
    roundsLostAfterFk: 0,
    conversionRate: null,
    surrenderRate: null,
    hasTelemetry: false,
    telemetryUnavailableReason: "Nenhum dado disponível para o período selecionado.",
  },
  terrorDosAmigos: {
    totalMatchesAnalyzed: 0,
    totalRoundsAnalyzed: 0,
    totalTeamDamage: 0,
    totalTeamKills: 0,
    totalTeamFlashes: 0,
    topTeamFlasher: null,
    topTeamDamager: null,
    rankings: [],
    hasTelemetry: false,
    telemetryUnavailableReason: "Telemetria de incidentes aliados em normalização.",
  },
  economiaDesastre: {
    totalRoundsAnalyzed: 0,
    forceBuyRounds: 0,
    forceBuyWins: 0,
    forceBuyWinrate: null,
    fullEcoRounds: 0,
    fullEcoWins: 0,
    fullEcoWinrate: null,
    fullBuyRounds: 0,
    fullBuyWins: 0,
    fullBuyWinrate: null,
    estimatedEquipmentLostValue: null,
    hasTelemetry: false,
    telemetryUnavailableReason: "Telemetria de economia em normalização.",
  },
  melhorDupla: {
    minTradesThreshold: 5,
    totalTrackedTrades: 0,
    mostSynergicDuo: null,
    fastestTradeDuo: null,
    allEligibleDuos: [],
    hasTelemetry: false,
    telemetryUnavailableReason: "Nenhuma troca rastreada.",
  },
  matadorEco: {
    totalAnalyzedKills: 0,
    totalEcoKills: 0,
    topEcoHunter: null,
    rankings: [],
    hasTelemetry: false,
    telemetryUnavailableReason: "Telemetria de rounds econômicos em normalização.",
  },
  plantouGanhou: {
    totalEligibleRounds: 0,
    totalPostPlants: 0,
    bombsExploded: 0,
    bombsDefused: 0,
    postPlantConversionRate: null,
    retakeSuccessRate: null,
    topDefusers: [],
    hasTelemetry: false,
    telemetryUnavailableReason: "Telemetria de C4 indisponível.",
  },
  especialistaArmas: {
    totalKillsAnalyzed: 0,
    topRifler: null,
    topSniper: null,
    topPistoleiro: null,
    topSmg: null,
    playerProfiles: [],
    hasTelemetry: false,
    telemetryUnavailableReason: "Telemetria de armas indisponível.",
  },
  reiRoundsDecisivos: {
    totalDecisiveRoundsAnalyzed: 0,
    topDecisivePlayer: null,
    topDecisiveMvp: null,
    topDecisiveFirstKiller: null,
    topDecisiveClutcher: null,
    rankings: [],
    hasTelemetry: false,
    telemetryUnavailableReason: "Nenhum round decisivo encontrado.",
  },
  parceiros: {
    minMatchesThreshold: 10,
    totalEligibleDuos: 0,
    mostWinsDuo: null,
    mostLossesDuo: null,
    bestWinrateDuo: null,
    worstWinrateDuo: null,
    allEligibleDuos: [],
    playersMap: {},
    monitoredPlayers: [],
  },
};

export default async function RaioXPage(props: {
  searchParams: Promise<{ season?: string }>;
}) {
  const searchParams = await props.searchParams;
  const seasonParam = searchParams.season;
  const targetSeason = seasonParam === "current" ? undefined : seasonParam;

  const resolvedSeasonId = (await resolveSeasonId(targetSeason)) || "";
  const allSeasons = await listSeasons();
  const selectedSeason = allSeasons.find((s) => s.id === resolvedSeasonId);

  const datasetPromise = competitiveService.loadCompetitiveDataset(resolvedSeasonId);

  const [raioX, totalMatchesWithDemos, totalCommunityMatches] = await Promise.all([
    safeQuery(
      async () => getRaioXBundle(resolvedSeasonId, await datasetPromise),
      DEFAULT_RAIO_X_BUNDLE,
    ),
    safeQuery(
      () =>
        prisma.match.count({
          where: {
            seasonId: resolvedSeasonId === "all" ? undefined : resolvedSeasonId,
            trackedPlayersCount: { gte: 2 },
            demoUrl: { not: null },
          },
        }),
      0,
    ),
    safeQuery(
      () =>
        prisma.match.count({
          where: {
            seasonId: resolvedSeasonId === "all" ? undefined : resolvedSeasonId,
            trackedPlayersCount: { gte: 2 },
          },
        }),
      0,
    ),
  ]);

  const activeCardsCount = RAIO_X_CARDS_CATALOG.filter((c) => c.status === "active").length;
  const totalCardsCount = RAIO_X_CARDS_CATALOG.length;

  return (
    <div className="flex flex-col gap-6 py-4 px-2 sm:px-4 max-w-7xl mx-auto w-full">
      {/* Barra de Navegação Superior / Breadcrumb */}
      {/* Barra de Retorno e Filtro de Temporada */}
      <div className="flex items-center justify-between gap-3 border-b border-border/30 pb-3">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-micro group"
        >
          <ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Voltar ao Hub Principal</span>
        </Link>

        <div className="flex items-center gap-2">
          <TacticalBadge label="INTELIGÊNCIA TÁTICA" variant="neutral" size="xs" />
          <SeasonSelect seasons={allSeasons} currentSeasonId={resolvedSeasonId} />
        </div>
      </div>

      {/* Cabeçalho da Página */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-primary/90 mb-1">
            <span className="font-mono text-muted-foreground/75 font-semibold">09</span>
            <span className="text-foreground/20">/</span>
            <span>TELEMETRIA AVANÇADA DE DEMOS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground uppercase tracking-tight">
            Raio-X das Partidas
          </h1>
          <p className="text-xs sm:text-sm font-mono text-muted-foreground/80 mt-1 max-w-2xl leading-relaxed">
            O que realmente acontece dentro dos nossos jogos: conversão de vantagens, sinergia de trocas, desfechos de C4 e impacto em rounds de alta pressão.
          </p>
        </div>

        {/* Status de Cobertura */}
        <div className="relative group flex items-center gap-3 bg-surface-panel border border-border/60 hover:border-border/90 p-2.5 sm:p-3 rounded-sm shadow-sm shrink-0 transition-micro overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-border/40 to-transparent group-hover:via-primary/50 transition-micro" />
          <div className="text-right">
            <span className="text-[10px] font-mono text-muted-foreground/70 uppercase tracking-wider block">
              Módulos no Ar
            </span>
            <span className="font-mono text-sm font-black text-foreground tabular-nums">
              {activeCardsCount} de {totalCardsCount} Operacionais
            </span>
          </div>
          <div className="h-8 w-px bg-border/40" />
          <div className="text-right">
            <span className="text-[10px] font-mono text-muted-foreground/70 uppercase tracking-wider block">
              Demos Processadas
            </span>
            <span className="font-mono text-sm font-black text-status-good tabular-nums">
              {totalMatchesWithDemos} / {totalCommunityMatches}
            </span>
          </div>
        </div>
      </div>

      {/* Faixa de KPIs de Cobertura e Integridade Padronizada */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: Módulos no Ar */}
        <div className="relative group bg-surface-panel rounded-sm border border-border/60 hover:border-border/90 shadow-sm p-3 sm:p-3.5 transition-micro overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-border/40 to-transparent group-hover:via-primary/50 transition-micro" />
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-muted-foreground/75 truncate">
              Módulos no Ar
            </span>
            <Layers className="size-3.5 text-primary/70 shrink-0" />
          </div>
          <span className="font-mono text-lg sm:text-xl font-bold tracking-tight text-foreground tabular-nums leading-none">
            {activeCardsCount} / {totalCardsCount}
          </span>
          <span className="text-[11px] font-mono text-status-good truncate mt-1">
            {activeCardsCount === totalCardsCount ? "9 operacionais (100%)" : `${activeCardsCount} operacionais • ${totalCardsCount - activeCardsCount} fila`}
          </span>
        </div>

        {/* KPI 2: Demos Processadas */}
        <div className="relative group bg-surface-panel rounded-sm border border-border/60 hover:border-border/90 shadow-sm p-3 sm:p-3.5 transition-micro overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-border/40 to-transparent group-hover:via-status-good/50 transition-micro" />
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-muted-foreground/75 truncate">
              Demos com Telemetria
            </span>
            <Database className="size-3.5 text-status-good/70 shrink-0" />
          </div>
          <span className="font-mono text-lg sm:text-xl font-bold tracking-tight text-status-good tabular-nums leading-none">
            {totalMatchesWithDemos}
          </span>
          <span className="text-[11px] font-mono text-muted-foreground/70 truncate mt-1">
            de {totalCommunityMatches} partidas
          </span>
        </div>

        {/* KPI 3: Rounds Elegíveis */}
        <div className="relative group bg-surface-panel rounded-sm border border-border/60 hover:border-border/90 shadow-sm p-3 sm:p-3.5 transition-micro overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-border/40 to-transparent group-hover:via-primary/50 transition-micro" />
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-muted-foreground/75 truncate">
              Rounds Elegíveis
            </span>
            <Crosshair className="size-3.5 text-primary/70 shrink-0" />
          </div>
          <span className="font-mono text-lg sm:text-xl font-bold tracking-tight text-foreground tabular-nums leading-none">
            {raioX.entregamos5v4.totalEligibleRounds}
          </span>
          <span className="text-[11px] font-mono text-muted-foreground/70 truncate mt-1">
            exclui warmup / knife
          </span>
        </div>

        {/* KPI 4: Re-frags Mútuos */}
        <div className="relative group bg-surface-panel rounded-sm border border-border/60 hover:border-border/90 shadow-sm p-3 sm:p-3.5 transition-micro overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-border/40 to-transparent group-hover:via-primary/50 transition-micro" />
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-muted-foreground/75 truncate">
              Re-frags Mútuos
            </span>
            <Handshake className="size-3.5 text-primary/70 shrink-0" />
          </div>
          <span className="font-mono text-lg sm:text-xl font-bold tracking-tight text-primary tabular-nums leading-none">
            {raioX.melhorDupla.totalTrackedTrades}
          </span>
          <span className="text-[11px] font-mono text-muted-foreground/70 truncate mt-1">
            trocas mútuas ≤ 5.0s
          </span>
        </div>

        {/* KPI 5: Plants de C4 */}
        <div className="relative group bg-surface-panel rounded-sm border border-border/60 hover:border-border/90 shadow-sm p-3 sm:p-3.5 transition-micro overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-border/40 to-transparent group-hover:via-status-warning/50 transition-micro" />
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-muted-foreground/75 truncate">
              Plants de C4
            </span>
            <Bomb className="size-3.5 text-status-warning/70 shrink-0" />
          </div>
          <span className="font-mono text-lg sm:text-xl font-bold tracking-tight text-status-warning tabular-nums leading-none">
            {raioX.plantouGanhou.totalPostPlants}
          </span>
          <span className="text-[11px] font-mono text-muted-foreground/70 truncate mt-1">
            {raioX.plantouGanhou.bombsExploded} expl. • {raioX.plantouGanhou.bombsDefused} def.
          </span>
        </div>

        {/* KPI 6: Rounds Decisivos */}
        <div className="relative group bg-surface-panel rounded-sm border border-border/60 hover:border-border/90 shadow-sm p-3 sm:p-3.5 transition-micro overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-border/40 to-transparent group-hover:via-gold/50 transition-micro" />
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-muted-foreground/75 truncate">
              Rounds Decisivos
            </span>
            <Crown className="size-3.5 text-gold/70 shrink-0" />
          </div>
          <span className="font-mono text-lg sm:text-xl font-bold tracking-tight text-foreground tabular-nums leading-none">
            {raioX.reiRoundsDecisivos.totalDecisiveRoundsAnalyzed}
          </span>
          <span className="text-[11px] font-mono text-muted-foreground/70 truncate mt-1">
            R12 (half) • R24 • OT 25+
          </span>
        </div>
      </div>

      {/* Seção Completa com os 9 Módulos do Raio-X */}
      <RaioXSection bundle={raioX} seasonName={selectedSeason?.name} />

      {/* Nota Metodológica de Rodapé */}
      <div className="relative group bg-surface-panel border border-border/60 hover:border-border/90 rounded-sm p-4 sm:p-5 shadow-sm transition-micro flex flex-col gap-2.5 text-xs font-mono text-muted-foreground/80 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-border/40 to-transparent group-hover:via-primary/50 transition-micro" />
        <div className="flex items-center gap-2 font-bold text-foreground text-xs uppercase tracking-wider">
          <div className="size-5 rounded-xs bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0">
            <Database className="size-3 text-primary" />
          </div>
          <span>Metodologia & Governança Estatística do Raio-X</span>
        </div>
        <p className="leading-relaxed">
          O Raio-X da Criticância utiliza telemetria avançada de demos sincronizadas com a Gamers Club. Apenas partidas com participação comunitária monitorada (&ge; 2 membros no mesmo servidor) são consideradas. Rounds de faca (warmup) e partidas solo são descartados para manter a integridade dos dados coletados.
        </p>
        <p className="text-[11px] text-muted-foreground/60 leading-relaxed border-t border-border/30 pt-2">
          Todos os 9 módulos táticos estão operacionais com dados reais calculados a partir dos eventos granulares das demos CS2, incluindo incidentes aliados, telemetria financeira e abates anti-eco.
        </p>
      </div>
    </div>
  );
}
